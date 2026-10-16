
import uuid
from datetime import date, datetime, time

import pytest
from fastapi import Request
from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.database.session import SessionLocal
from app.main import app
from app.models.certificate import Certificate
from app.models.club import Club
from app.models.event import Event, EventStatus
from app.models.registration import Registration
from app.models.user import User, UserRole


client = TestClient(app)


@pytest.fixture
def certificate_context():
    tenant_id = f"certificate-test-{uuid.uuid4()}"
    club_email = f"club-{uuid.uuid4().hex[:8]}@example.com"
    student_email = f"student-{uuid.uuid4().hex[:8]}@example.com"
    previous_overrides = app.dependency_overrides.copy()

    def current_user_claims(request: Request):
        email = request.headers.get("x-test-email", student_email).strip().lower()
        return {
            "tid": tenant_id,
            "oid": "club-account" if email == club_email else email,
            "preferred_username": email,
            "name": email.split("@", 1)[0],
        }

    app.dependency_overrides[get_current_user] = current_user_claims

    db = SessionLocal()
    club = None
    event = None
    student = None

    try:
        club = Club(
            name=f"Certificate Test Club {uuid.uuid4().hex[:8]}",
            contact_email=club_email,
        )
        db.add(club)
        db.flush()

        club_user = User(
            entra_tenant_id=tenant_id,
            entra_object_id="club-account",
            email=club_email,
            full_name="Test Club",
            role=UserRole.CLUB,
        )
        student = User(
            entra_tenant_id=tenant_id,
            entra_object_id=student_email,
            email=student_email,
            full_name="Test Student",
            role=UserRole.STUDENT,
        )
        db.add_all([club_user, student])
        db.flush()

        event = Event(
            club_id=club.id,
            title="Certificate Test Event",
            category="Technical",
            venue="Test Hall",
            event_date=date(2026, 11, 10),
            start_time=time(10, 0),
            end_time=time(12, 0),
            capacity=50,
            registration_deadline=datetime(2026, 11, 9, 23, 59),
            status=EventStatus.COMPLETED,
        )
        db.add(event)
        db.flush()

        registration = Registration(
            event_id=event.id,
            user_id=student.id,
            attendee_name="Test Student",
            attendee_email=student_email,
            qr_credential_hash=uuid.uuid4().hex + uuid.uuid4().hex,
            checked_in_at=datetime.now(),
        )
        db.add(registration)
        db.commit()

        yield {
            "event_id": event.id,
            "student_id": student.id,
            "student_email": student_email,
            "club_email": club_email,
            "tenant_id": tenant_id,
        }

    finally:
        if event is not None:
            db.query(Certificate).filter(
                Certificate.event_id == event.id
            ).delete(synchronize_session=False)
            db.query(Registration).filter(
                Registration.event_id == event.id
            ).delete(synchronize_session=False)
            db.query(Event).filter(Event.id == event.id).delete(
                synchronize_session=False
            )

        db.query(User).filter(
            User.entra_tenant_id == tenant_id
        ).delete(synchronize_session=False)

        if club is not None:
            db.query(Club).filter(Club.id == club.id).delete(
                synchronize_session=False
            )

        db.commit()
        db.close()

        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)


def test_issue_certificate(certificate_context):
    context = certificate_context

    response = client.post(
        "/api/certificates/issue",
        headers={"x-test-email": context["club_email"]},
        json={
            "event_id": str(context["event_id"]),
            "recipient_id": str(context["student_id"]),
            "recipient_name": "Test Student",
        },
    )

    assert response.status_code == 201, response.json()
    data = response.json()
    assert data["event_id"] == str(context["event_id"])
    assert data["recipient_name"] == "Test Student"
    assert data["certificate_code"].startswith("EVH-")


def test_issue_certificate_for_uncompleted_event(certificate_context):
    context = certificate_context

    db = SessionLocal()
    try:
        event = db.get(Event, context["event_id"])
        event.status = EventStatus.UPCOMING
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/certificates/issue",
        headers={"x-test-email": context["club_email"]},
        json={
            "event_id": str(context["event_id"]),
            "recipient_id": str(context["student_id"]),
            "recipient_name": "Test Student",
        },
    )

    assert response.status_code == 400, response.json()
    assert response.json()["detail"] == (
        "Certificates can only be issued for completed events"
    )


def test_issue_certificate_for_nonexistent_event(certificate_context):
    context = certificate_context

    response = client.post(
        "/api/certificates/issue",
        headers={"x-test-email": context["club_email"]},
        json={
            "event_id": str(uuid.uuid4()),
            "recipient_id": str(context["student_id"]),
            "recipient_name": "Test Student",
        },
    )

    assert response.status_code == 404, response.json()


def test_duplicate_certificate_is_rejected(certificate_context):
    context = certificate_context
    payload = {
        "event_id": str(context["event_id"]),
        "recipient_id": str(context["student_id"]),
        "recipient_name": "Test Student",
    }
    headers = {"x-test-email": context["club_email"]}

    first = client.post(
        "/api/certificates/issue", headers=headers, json=payload
    )
    second = client.post(
        "/api/certificates/issue", headers=headers, json=payload
    )

    assert first.status_code == 201, first.json()
    assert second.status_code == 409, second.json()


def test_list_recipient_certificates(certificate_context):
    context = certificate_context

    issue_response = client.post(
        "/api/certificates/issue",
        headers={"x-test-email": context["club_email"]},
        json={
            "event_id": str(context["event_id"]),
            "recipient_id": str(context["student_id"]),
            "recipient_name": "Test Student",
        },
    )
    assert issue_response.status_code == 201, issue_response.json()

    response = client.get(
        f"/api/certificates/recipient/{context['student_id']}",
        headers={"x-test-email": context["student_email"]},
    )

    assert response.status_code == 200, response.json()
    assert any(
        item["certificate_code"] == issue_response.json()["certificate_code"]
        for item in response.json()
    )


def test_verify_certificate(certificate_context):
    context = certificate_context

    issue_response = client.post(
        "/api/certificates/issue",
        headers={"x-test-email": context["club_email"]},
        json={
            "event_id": str(context["event_id"]),
            "recipient_id": str(context["student_id"]),
            "recipient_name": "Test Student",
        },
    )
    assert issue_response.status_code == 201, issue_response.json()

    code = issue_response.json()["certificate_code"]
    response = client.get(f"/api/certificates/verify/{code}")

    assert response.status_code == 200, response.json()
    assert response.json()["valid"] is True
    assert response.json()["certificate_code"] == code
