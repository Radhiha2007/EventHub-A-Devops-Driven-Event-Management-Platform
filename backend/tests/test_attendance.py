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
        status=EventStatus.UPCOMING,
    )
    db.add(event)
    db.commit()
    event_id = event.id
    club_id = club.id
    db.close()

    response = client.post(f"/api/events/{event_id}/registrations")
    assert response.status_code == 201
    try:
        yield event_id, response.json()["qr_credential"]
    finally:
        db = SessionLocal()
        db.query(Registration).filter(
            Registration.event_id == event_id
        ).delete(synchronize_session=False)

        event = db.get(Event, event_id)
        if event is not None:
            db.delete(event)
            db.flush()

        club = db.get(Club, club_id)
        if club is not None:
            db.delete(club)

        db.commit()
        db.close()


def test_check_in_accepts_credential_once_and_rejects_replay(registered_attendee, test_auth_context):
    event_id, credential = registered_attendee

    db = SessionLocal()
    event = db.get(Event, event_id)
    event.status = EventStatus.ONGOING
    db.commit()
    db.close()
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
    print("REPLAY CHECK-IN:", replay.status_code, replay.text)
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


def test_other_club_cannot_check_in_attendee(
    registered_attendee, test_auth_context
):
    event_id, credential = registered_attendee
    db = SessionLocal()

    try:
        other_email = f"other-club-{uuid4().hex[:8]}@example.com"
        other_club = Club(
            name="Other Attendance Test Club",
            contact_email=other_email,
        )
        db.add(other_club)

        other_club_user = User(
            entra_tenant_id=test_auth_context["tenant_id"],
            entra_object_id=other_email,
            email=other_email,
            full_name="Other Attendance Test Club",
            role=UserRole.CLUB,
        )
        db.add(other_club_user)
        db.commit()

        response = client.post(
            "/api/attendance/check-in",
            json={"credential": credential},
            headers={"x-test-email": other_email},
        )

        assert response.status_code in (403, 404)

        # The failed attempt must not record attendance.
        registration = (
            db.query(Registration)
            .filter(Registration.event_id == event_id)
            .one()
        )
        db.refresh(registration)
        assert registration.checked_in_at is None
    finally:
        db.rollback()
        db.close()


def test_student_history_shows_attendance_after_check_in(
    registered_attendee, test_auth_context
):
    event_id, credential = registered_attendee

    db = SessionLocal()
    event = db.get(Event, event_id)
    event.status = EventStatus.ONGOING
    db.commit()
    db.close()
    check_in = client.post(
        "/api/attendance/check-in",
        json={"credential": credential},
        headers={"x-test-email": test_auth_context["club_email"]},
    )
    print("STUDENT HISTORY CHECK-IN:", check_in.status_code, check_in.text)

    assert check_in.status_code == 200

    history = client.get("/api/registrations/me")

    assert history.status_code == 200
    registrations = history.json()
    assert len(registrations) == 1
    assert registrations[0]["checked_in_at"] is not None

@pytest.mark.parametrize(
    "event_status",
    [
        EventStatus.UPCOMING,
        EventStatus.COMPLETED,
        EventStatus.CANCELLED,
    ],
)
def test_check_in_rejected_when_event_not_ongoing(
    registered_attendee,
    test_auth_context,
    event_status,
):
    event_id, credential = registered_attendee

    db = SessionLocal()
    event = db.get(Event, event_id)
    event.status = event_status
    db.commit()
    db.close()

    response = client.post(
        "/api/attendance/check-in",
        json={"credential": credential},
        headers={"x-test-email": test_auth_context["club_email"]},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "Attendance can be recorded only while the event is ongoing"
    )

    db = SessionLocal()
    registration = (
        db.query(Registration)
        .filter(Registration.event_id == event_id)
        .one()
    )
    assert registration.checked_in_at is None
    db.close()

def test_club_can_delete_its_event(
    registered_attendee,
    test_auth_context,
):
    event_id, _ = registered_attendee

    response = client.delete(
        f"/api/events/{event_id}",
        headers={"x-test-email": test_auth_context["club_email"]},
    )

    assert response.status_code == 204

    db = SessionLocal()
    assert db.get(Event, event_id) is None
    db.close()
