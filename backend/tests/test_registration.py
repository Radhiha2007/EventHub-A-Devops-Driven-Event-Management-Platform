from datetime import date, datetime, time, timedelta
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from app.database.session import SessionLocal
from app.main import app
from app.models.club import Club
from app.models.event import Event, EventStatus


client = TestClient(app)


@pytest.fixture
def registration_event():
    db = SessionLocal()
    club = Club(name="Registration Test Club")
    db.add(club)
    db.flush()
    event = Event(
        club_id=club.id,
        title="Registration Test Event",
        category="Technical",
        venue="Hall 1",
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
    try:
        yield event_id
    finally:
        db.delete(event)
        db.delete(club)
        db.commit()
        db.close()


def test_registration_normalizes_email_and_returns_one_time_credential(registration_event):
    response = client.post(
        f"/api/events/{registration_event}/registrations",
        json={"attendee_name": "  Ada Lovelace ", "attendee_email": " ADA@EXAMPLE.COM "},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["attendee_name"] == "Ada Lovelace"
    assert body["attendee_email"] == "ada@example.com"
    assert len(body["qr_credential"]) >= 32

    listing = client.get(f"/api/events/{registration_event}/registrations")
    assert listing.status_code == 200
    assert "qr_credential" not in listing.json()[0]
    assert "qr_credential_hash" not in listing.json()[0]


def test_duplicate_email_is_rejected_after_normalization(registration_event):
    path = f"/api/events/{registration_event}/registrations"
    assert client.post(path, json={"attendee_name": "Ada", "attendee_email": "ada@example.com"}).status_code == 201
    duplicate = client.post(path, json={"attendee_name": "Ada 2", "attendee_email": " ADA@EXAMPLE.COM "})

    assert duplicate.status_code == 409
    assert "already registered" in duplicate.json()["detail"]


def test_registration_rejects_invalid_email_and_missing_event():
    invalid = client.post(
        "/api/events/00000000-0000-0000-0000-000000000001/registrations",
        json={"attendee_name": "Ada", "attendee_email": "not-an-email"},
    )
    missing = client.post(
        "/api/events/00000000-0000-0000-0000-000000000001/registrations",
        json={"attendee_name": "Ada", "attendee_email": "ada@example.com"},
    )

    assert invalid.status_code == 422
    assert missing.status_code == 404


def test_registration_rejects_pending_event_and_closed_deadline(registration_event):
    db = SessionLocal()
    event = db.get(Event, registration_event)
    event.status = EventStatus.PENDING
    db.commit()
    pending = client.post(
        f"/api/events/{registration_event}/registrations",
        json={"attendee_name": "Ada", "attendee_email": "ada@example.com"},
    )
    event.status = EventStatus.APPROVED
    event.registration_deadline = datetime.utcnow() - timedelta(seconds=1)
    db.commit()
    closed = client.post(
        f"/api/events/{registration_event}/registrations",
        json={"attendee_name": "Grace", "attendee_email": "grace@example.com"},
    )
    db.close()

    assert pending.status_code == 409
    assert closed.status_code == 409


def test_capacity_rejects_additional_registration(registration_event):
    path = f"/api/events/{registration_event}/registrations"
    for email in ("one@example.com", "two@example.com"):
        assert client.post(path, json={"attendee_name": "Attendee", "attendee_email": email}).status_code == 201
    full = client.post(path, json={"attendee_name": "Three", "attendee_email": "three@example.com"})

    assert full.status_code == 409
    assert "capacity" in full.json()["detail"]


def test_concurrent_registrations_do_not_exceed_capacity(registration_event):
    db = SessionLocal()
    db.get(Event, registration_event).capacity = 1
    db.commit()
    db.close()
    path = f"/api/events/{registration_event}/registrations"

    def submit(email):
        return client.post(path, json={"attendee_name": "Attendee", "attendee_email": email}).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = list(executor.map(submit, ("one@example.com", "two@example.com")))

    assert sorted(statuses) == [201, 409]
