from datetime import date, datetime, time, timedelta

import pytest
from fastapi.testclient import TestClient

from app.database.session import SessionLocal
from app.main import app
from app.models.club import Club
from app.models.event import Event, EventStatus
from app.models.registration import Registration


client = TestClient(app)


@pytest.fixture
def registered_attendee():
    db = SessionLocal()
    club = Club(name="Attendance Test Club")
    db.add(club)
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

    response = client.post(
        f"/api/events/{event_id}/registrations",
        json={"attendee_name": "Katherine Johnson", "attendee_email": "kj@example.com"},
    )
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


def test_check_in_accepts_credential_once_and_rejects_replay(registered_attendee):
    _, credential = registered_attendee
    first = client.post("/api/attendance/check-in", json={"credential": credential})
    replay = client.post("/api/attendance/check-in", json={"credential": credential})

    assert first.status_code == 200
    assert first.json()["attendee_name"] == "Katherine Johnson"
    assert first.json()["checked_in_at"]
    assert replay.status_code == 409
    assert "already been checked in" in replay.json()["detail"]


def test_check_in_rejects_invalid_credential():
    response = client.post("/api/attendance/check-in", json={"credential": "x" * 32})

    assert response.status_code == 404
    assert response.json()["detail"] == "Invalid QR credential"


def test_registration_persists_only_credential_hash(registered_attendee):
    event_id, credential = registered_attendee
    db = SessionLocal()
    registration = db.query(Registration).filter(Registration.event_id == event_id).one()
    assert registration.qr_credential_hash != credential
    assert len(registration.qr_credential_hash) == 64
    db.close()
