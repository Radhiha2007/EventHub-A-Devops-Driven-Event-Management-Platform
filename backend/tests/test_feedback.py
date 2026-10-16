
from datetime import date, datetime, time

from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal
from app.models.club import Club
from app.models.event import Event, EventStatus
from app.models.feedback import Feedback


client = TestClient(app)


def create_test_event():
    db = SessionLocal()
    try:
        club = Club(name="Feedback Test Club")
        db.add(club)
        db.commit()
        db.refresh(club)

        event = Event(
            club_id=club.id,
            title="Feedback Test Event",
            category="Technical",
            venue="Test Hall",
            event_date=date(2026, 11, 10),
            start_time=time(10, 0),
            end_time=time(12, 0),
            capacity=50,
            registration_deadline=datetime(2026, 11, 9, 23, 59),
            status=EventStatus.UPCOMING,
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        return event.id
    finally:
        db.close()


def test_submit_feedback():
    event_id = create_test_event()

    response = client.post(
        "/api/feedback",
        json={
            "event_id": str(event_id),
            "rating": 5,
            "comments": "Great event!",
        },
    )

    assert response.status_code == 201
    assert response.json()["rating"] == 5
    assert response.json()["comments"] == "Great event!"
    assert response.json()["event_id"] == str(event_id)


def test_feedback_rejects_invalid_rating():
    event_id = create_test_event()

    response = client.post(
        "/api/feedback",
        json={
            "event_id": str(event_id),
            "rating": 6,
            "comments": "Invalid rating",
        },
    )

    assert response.status_code == 422


def test_feedback_rejects_nonexistent_event():
    import uuid

    response = client.post(
        "/api/feedback",
        json={
            "event_id": str(uuid.uuid4()),
            "rating": 4,
            "comments": "Event does not exist",
        },
    )

    assert response.status_code == 404


def test_list_event_feedback():
    event_id = create_test_event()

    submit_response = client.post(
        "/api/feedback",
        json={
            "event_id": str(event_id),
            "rating": 4,
            "comments": "Good event",
        },
    )
    assert submit_response.status_code == 201

    response = client.get(f"/api/feedback/event/{event_id}")

    assert response.status_code == 200
    assert len(response.json()) >= 1
    assert any(item["comments"] == "Good event" for item in response.json())
