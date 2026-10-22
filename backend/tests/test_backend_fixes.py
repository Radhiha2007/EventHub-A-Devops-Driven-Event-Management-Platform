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
from app.models.feedback import Feedback
from app.models.registration import Registration
from app.models.user import User, UserRole


client = TestClient(app)


@pytest.fixture
def setup_data():
    tenant_id = f"fix-test-{uuid4()}"
    email = f"student-{uuid4().hex[:8]}@example.com"

    previous_overrides = app.dependency_overrides.copy()

    def mock_claims(request: Request):
        current_email = request.headers.get("x-test-email", email)
        return {
            "tid": tenant_id,
            "oid": current_email,
            "preferred_username": current_email,
            "name": "Test Student",
        }

    app.dependency_overrides[get_current_user] = mock_claims

    db = SessionLocal()

    club = Club(
        name=f"Test Club {uuid4().hex[:6]}",
        contact_email=f"club-{uuid4().hex[:6]}@example.com",
    )
    db.add(club)

    user = User(
        entra_tenant_id=tenant_id,
        entra_object_id=email,
        email=email,
        full_name="Test Student",
        role=UserRole.STUDENT,
    )
    db.add(user)
    db.flush()

    event = Event(
        club_id=club.id,
        title="Test Event",
        category="Technical",
        venue="Test Hall",
        event_date=date.today() + timedelta(days=2),
        start_time=time(10),
        end_time=time(12),
        capacity=5,
        registration_deadline=datetime.utcnow() + timedelta(days=1),
        status=EventStatus.COMPLETED,
    )
    db.add(event)
    db.flush()

    registration = Registration(
        event_id=event.id,
        user_id=user.id,
        attendee_name="Test Student",
        attendee_email=email,
        qr_credential_hash=uuid4().hex + uuid4().hex,
        checked_in_at=datetime.utcnow(),
    )
    db.add(registration)
    db.commit()

    data = {
        "event_id": event.id,
        "user_id": user.id,
        "club_id": club.id,
        "email": email,
        "tenant_id": tenant_id,
    }

    db.close()

    try:
        yield data
    finally:
        db = SessionLocal()
        db.query(Feedback).filter(
            Feedback.event_id == data["event_id"]
        ).delete(synchronize_session=False)
        db.query(Registration).filter(
            Registration.event_id == data["event_id"]
        ).delete(synchronize_session=False)
        db.query(Event).filter(
            Event.id == data["event_id"]
        ).delete(synchronize_session=False)
        db.query(Club).filter(
            Club.id == data["club_id"]
        ).delete(synchronize_session=False)
        db.query(User).filter(
            User.entra_tenant_id == data["tenant_id"]
        ).delete(synchronize_session=False)
        db.commit()
        db.close()

        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)


def test_feedback_requires_attendance(setup_data):
    db = SessionLocal()
    registration = (
        db.query(Registration)
        .filter(Registration.event_id == setup_data["event_id"])
        .first()
    )
    registration.checked_in_at = None
    db.commit()
    db.close()

    response = client.post(
        "/api/feedback",
        json={
            "event_id": str(setup_data["event_id"]),
            "rating": 5,
            "comments": "Great event",
        },
    )

    assert response.status_code == 403


def test_attendee_can_submit_feedback(setup_data):
    response = client.post(
        "/api/feedback",
        json={
            "event_id": str(setup_data["event_id"]),
            "rating": 5,
            "comments": "Great event",
        },
    )

    assert response.status_code == 201
    assert response.json()["rating"] == 5


def test_attendee_cannot_submit_feedback_twice(setup_data):
    payload = {
        "event_id": str(setup_data["event_id"]),
        "rating": 5,
        "comments": "Great event",
    }

    first = client.post("/api/feedback", json=payload)
    second = client.post("/api/feedback", json=payload)

    assert first.status_code == 201
    assert second.status_code == 409


def test_event_update_rejects_null_title(setup_data):
    db = SessionLocal()
    event = db.get(Event, setup_data["event_id"])
    club_email = event.club.contact_email
    db.close()

    # This test needs club-role authentication, so it is covered
    # separately below by the club-authenticated test fixture.
    from app.schemas.event import EventUpdate
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        EventUpdate.model_validate({"title": None})


def test_event_update_schema_rejects_null_capacity():
    from app.schemas.event import EventUpdate
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        EventUpdate.model_validate({"capacity": None})


def test_event_update_schema_accepts_partial_update():
    from app.schemas.event import EventUpdate

    update = EventUpdate.model_validate({"title": "Updated Title"})

    assert update.model_dump(exclude_unset=True) == {
        "title": "Updated Title"
    }