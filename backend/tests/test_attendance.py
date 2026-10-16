from datetime import date, datetime, time, timedelta
from uuid import uuid4

import pytest
from fastapi import Request
from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.database.session import SessionLocal
from app.main import app
from app.models.club import Club
from app.models.event import Event, EventStatus
from app.models.registration import Registration
from app.models.user import User, UserRole


client = TestClient(app)


@pytest.fixture(autouse=True)
def test_auth_context():
    tenant_id = f"attendance-test-{uuid4()}"
    default_email = f"student-{uuid4().hex[:8]}@example.com"
    default_name = default_email.split("@", 1)[0]
    club_email = f"club-attendance-{uuid4().hex[:8]}@example.com"
    previous_overrides = app.dependency_overrides.copy()

    def current_user_claims(request: Request):
        email = request.headers.get("x-test-email", default_email).strip().lower()
        return {
            "tid": tenant_id,
            "oid": "club-account" if email == club_email else email,
            "preferred_username": email,
            "name": email.split("@", 1)[0],
        }

    app.dependency_overrides[get_current_user] = current_user_claims
    yield {"tenant_id": tenant_id, "club_email": club_email, "default_name": default_name}
    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous_overrides)
    db = SessionLocal()
    db.query(User).filter(User.entra_tenant_id == tenant_id).delete(synchronize_session=False)
    db.commit()
    db.close()


@pytest.fixture
def registered_attendee(test_auth_context):
    db = SessionLocal()
    club = Club(name="Attendance Test Club", contact_email=test_auth_context["club_email"])
    db.add(club)
    club_user = User(
        entra_tenant_id=test_auth_context["tenant_id"],
        entra_object_id="club-account",
        email=test_auth_context["club_email"],
        full_name="Attendance Test Club",
        role=UserRole.CLUB,
    )
    db.add(club_user)
    db.flush()
    event = Event(
        club_id=club.id,
        title="Attendance Test Event",
        category="Technical",
        venue="Hall 2",
        event_date=date.today() + timedelta(days=2),
        start_time=time(10),
        end_time=time(12),
        capacity=2,
        registration_deadline=datetime.utcnow() + timedelta(days=1),
        status=EventStatus.APPROVED,
    )
    db.add(event)
    db.commit()
    event_id = event.id
    db.close()

    response = client.post(f"/api/events/{event_id}/registrations")
    assert response.status_code == 201
    try:
        yield event_id, response.json()["qr_credential"]
    finally:
        db = SessionLocal()
        db.query(Registration).filter(Registration.event_id == event_id).delete()
        event = db.get(Event, event_id)
        if event is not None:
            club_id = event.club_id
            db.delete(event)
            db.flush()
            db.delete(db.get(Club, club_id))
        db.commit()
        db.close()


def test_check_in_accepts_credential_once_and_rejects_replay(registered_attendee, test_auth_context):
    _, credential = registered_attendee
    club_email = test_auth_context["club_email"]
    first = client.post(
        "/api/attendance/check-in",
        json={"credential": credential},
        headers={"x-test-email": club_email},
    )
    replay = client.post(
        "/api/attendance/check-in",
        json={"credential": credential},
        headers={"x-test-email": club_email},
    )

    assert first.status_code == 200
    assert first.json()["attendee_name"] == test_auth_context["default_name"]
    assert first.json()["checked_in_at"]
    assert replay.status_code == 409
    assert "already been checked in" in replay.json()["detail"]


def test_check_in_rejects_invalid_credential(registered_attendee, test_auth_context):
    response = client.post(
        "/api/attendance/check-in",
        json={"credential": "x" * 32},
        headers={"x-test-email": test_auth_context["club_email"]},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Invalid QR credential"


def test_registration_persists_only_credential_hash(registered_attendee):
    event_id, credential = registered_attendee
    db = SessionLocal()
    registration = db.query(Registration).filter(Registration.event_id == event_id).one()
    assert registration.qr_credential_hash != credential
    assert len(registration.qr_credential_hash) == 64
    db.close()
