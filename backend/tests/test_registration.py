from datetime import date, datetime, time, timedelta
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi import Request
from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.database.session import SessionLocal
from app.main import app
from app.models.club import Club
from app.models.event import Event, EventStatus
from app.models.user import User, UserRole


client = TestClient(app)


@pytest.fixture(autouse=True)
def test_auth_context():
    tenant_id = f"registration-test-{uuid4()}"
    default_email = f"student-{uuid4().hex[:8]}@example.com"
    club_email = "club-registration@example.com"
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
    yield {"tenant_id": tenant_id, "default_email": default_email, "club_email": club_email}
    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous_overrides)
    db = SessionLocal()
    db.query(User).filter(User.entra_tenant_id == tenant_id).delete(synchronize_session=False)
    db.commit()
    db.close()


@pytest.fixture
def registration_event(test_auth_context):
    db = SessionLocal()
    club = Club(name="Registration Test Club", contact_email=test_auth_context["club_email"])
    db.add(club)
    club_user = User(
        entra_tenant_id=test_auth_context["tenant_id"],
        entra_object_id="club-account",
        email=test_auth_context["club_email"],
        full_name="Registration Test Club",
        role=UserRole.CLUB,
    )
    db.add(club_user)
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


def test_registration_uses_verified_student_identity_and_returns_one_time_credential(registration_event, test_auth_context):
    response = client.post(
        f"/api/events/{registration_event}/registrations",
        json={"attendee_name": "Someone Else", "attendee_email": "other@example.com"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["attendee_name"] == test_auth_context["default_email"].split("@", 1)[0]
    assert body["attendee_email"] == test_auth_context["default_email"]
    assert len(body["qr_credential"]) >= 32

    listing = client.get(
        f"/api/events/{registration_event}/registrations",
        headers={"x-test-email": test_auth_context["club_email"]},
    )
    assert listing.status_code == 200
    assert "qr_credential" not in listing.json()[0]
    assert "qr_credential_hash" not in listing.json()[0]


def test_duplicate_email_is_rejected_after_normalization(registration_event):
    path = f"/api/events/{registration_event}/registrations"
    assert client.post(path, json={"attendee_name": "Ada", "attendee_email": "ada@example.com"}).status_code == 201
    duplicate = client.post(path, json={"attendee_name": "Ada 2", "attendee_email": " ADA@EXAMPLE.COM "})

    assert duplicate.status_code == 409
    assert "already registered" in duplicate.json()["detail"]


def test_registration_rejects_missing_event():
    missing = client.post(
        "/api/events/00000000-0000-0000-0000-000000000001/registrations",
    )

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
        assert client.post(
            path,
            headers={"x-test-email": email},
        ).status_code == 201
    full = client.post(path, headers={"x-test-email": "three@example.com"})

    assert full.status_code == 409
    assert "capacity" in full.json()["detail"]


def test_concurrent_registrations_do_not_exceed_capacity(registration_event):
    db = SessionLocal()
    db.get(Event, registration_event).capacity = 1
    db.commit()
    db.close()
    path = f"/api/events/{registration_event}/registrations"

    def submit(email):
        return client.post(path, headers={"x-test-email": email}).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = list(executor.map(submit, ("one@example.com", "two@example.com")))

    assert sorted(statuses) == [201, 409]
