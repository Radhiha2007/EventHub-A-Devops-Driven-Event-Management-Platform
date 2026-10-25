
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.main import app
from app.database.session import SessionLocal
from app.models.event import Event
from app.models.feedback import Feedback
from app.models.registration import Registration
from app.models.user import User, UserRole


client = TestClient(app)


def test_submit_feedback_requires_authentication():
    previous_overrides = app.dependency_overrides.copy()
    app.dependency_overrides.pop(get_current_user, None)

    try:
        response = client.post(
            "/api/feedback",
            json={
                "event_id": str(uuid4()),
                "rating": 5,
                "comments": "Great event!",
            },
        )
        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)


def test_feedback_rejects_invalid_rating():
    import pytest
    from pydantic import ValidationError

    from app.schemas.feedback import FeedbackCreate

    with pytest.raises(ValidationError):
        FeedbackCreate(
            event_id=uuid4(),
            rating=6,
            comments="Invalid rating",
        )


def test_feedback_rejects_nonexistent_event():
    tenant_id = f"feedback-test-{uuid4()}"
    email = f"feedback-{uuid4().hex[:8]}@example.com"
    previous_overrides = app.dependency_overrides.copy()

    def mock_claims():
        return {
            "tid": tenant_id,
            "oid": email,
            "preferred_username": email,
            "name": "Feedback Test Student",
        }

    app.dependency_overrides[get_current_user] = mock_claims
    db = SessionLocal()

    try:
        user = User(
            entra_tenant_id=tenant_id,
            entra_object_id=email,
            email=email,
            full_name="Feedback Test Student",
            role=UserRole.STUDENT,
        )
        db.add(user)
        db.commit()

        response = client.post(
            "/api/feedback",
            json={
                "event_id": str(uuid4()),
                "rating": 4,
                "comments": "Event does not exist",
            },
        )

        assert response.status_code == 404
    finally:
        db.query(User).filter(
            User.entra_tenant_id == tenant_id
        ).delete(synchronize_session=False)
        db.commit()
        db.close()
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)


def test_list_event_feedback_returns_empty_list():
    previous_overrides = app.dependency_overrides.copy()
    app.dependency_overrides.pop(get_current_user, None)
    db = SessionLocal()
    event = None

    try:
        from datetime import date, datetime, time, timedelta

        from app.models.club import Club
        from app.models.event import EventStatus

        club = Club(
            name=f"Feedback Test Club {uuid4().hex[:8]}",
            contact_email=f"club-{uuid4().hex[:8]}@example.com",
        )
        db.add(club)
        db.flush()

        event = Event(
            club_id=club.id,
            title="Feedback Test Event",
            category="Technical",
            venue="Test Hall",
            event_date=date.today() + timedelta(days=2),
            start_time=time(10),
            end_time=time(12),
            capacity=50,
            registration_deadline=datetime.utcnow() + timedelta(days=1),
            status=EventStatus.UPCOMING,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        event_id = event.id

        response = client.get(f"/api/feedback/event/{event_id}")

        assert response.status_code == 200
        assert response.json() == []
    finally:
        if event is not None:
            db.query(Feedback).filter(
                Feedback.event_id == event.id
            ).delete(synchronize_session=False)
            db.delete(event)
            db.commit()

            club = db.get(
                __import__("app.models.club", fromlist=["Club"]).Club,
                event.club_id,
            )
            if club is not None:
                db.delete(club)
                db.commit()

        db.close()
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)
