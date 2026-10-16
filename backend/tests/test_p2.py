from datetime import date, datetime, time

from fastapi.testclient import TestClient
from types import SimpleNamespace
import pytest

from app.core.auth import get_current_user
from app.core.current_user import get_current_profile
from app.models.user import UserRole
from app.main import app
from app.models.club import Club
from app.models.event import Event, EventStatus
from app.database.session import SessionLocal


@pytest.fixture(autouse=True)
def club_auth_overrides():
    previous_overrides = app.dependency_overrides.copy()
    app.dependency_overrides[get_current_user] = lambda: {
        "tid": "test-tenant",
        "oid": "p2-test-user",
        "preferred_username": "club@example.com",
        "name": "Test Club User",
    }
    app.dependency_overrides[get_current_profile] = (
        lambda: SimpleNamespace(role=UserRole.CLUB, email="club@example.com")
    )
    yield
    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous_overrides)


client = TestClient(app)


def test_create_club():
    response = client.post(
        "/api/clubs",
        json={
            "name": "Pytest Club",
            "description": "Test club",
            "contact_email": "club@example.com",
            "advisor_name": "Test Advisor",
        },
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Pytest Club"


def test_list_clubs():
    response = client.get("/api/clubs")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_event():
    db = SessionLocal()

    try:
        club = Club(name="Pytest Event Club", contact_email="club@example.com")
        db.add(club)
        db.commit()
        db.refresh(club)

        response = client.post(
            "/api/events",
            json={
                "club_id": str(club.id),
                "title": "Pytest Event",
                "description": "Test event",
                "category": "Technical",
                "venue": "Seminar Hall",
                "event_date": "2026-10-20",
                "start_time": "10:00:00",
                "end_time": "12:00:00",
                "capacity": 50,
                "registration_deadline": "2026-10-19T23:59:00",
            },
        )

        assert response.status_code == 201
        assert response.json()["title"] == "Pytest Event"
        assert response.json()["status"] == "APPROVED"

    finally:
        db.close()


def test_event_search():
    db = SessionLocal()

    try:
        club = Club(name="Search Test Club", contact_email="club@example.com")
        db.add(club)
        db.commit()
        db.refresh(club)

        event = Event(
            club_id=club.id,
            title="Python Security Workshop",
            description="Cybersecurity testing",
            category="Technical",
            venue="Lab 1",
            event_date=date(2026, 11, 1),
            start_time=time(10, 0),
            end_time=time(12, 0),
            capacity=100,
            registration_deadline=datetime(2026, 10, 31, 23, 59),
            status=EventStatus.PENDING,
        )

        db.add(event)
        db.commit()

        response = client.get(
            "/api/events",
            params={"search": "Python Security"},
        )

        assert response.status_code == 200
        assert len(response.json()) >= 1

    finally:
        db.close()


def test_event_approval():
    db = SessionLocal()

    try:
        club = Club(name="Approval Test Club", contact_email="club@example.com")
        db.add(club)
        db.commit()
        db.refresh(club)

        event = Event(
            club_id=club.id,
            title="Approval Test Event",
            category="Technical",
            venue="Hall 1",
            event_date=date(2026, 11, 5),
            start_time=time(10, 0),
            end_time=time(12, 0),
            capacity=50,
            registration_deadline=datetime(2026, 11, 4, 23, 59),
            status=EventStatus.PENDING,
        )

        db.add(event)
        db.commit()
        db.refresh(event)

        response = client.patch(
            f"/api/events/{event.id}/status",
            json={"status": "APPROVED"},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "APPROVED"
    finally:
        db.close()

def test_event_can_be_completed():
    db = SessionLocal()

    try:
        club = Club(name="Completion Test Club", contact_email="club@example.com")
        db.add(club)
        db.commit()
        db.refresh(club)

        event = Event(
            club_id=club.id,
            title="Completion Test Event",
            category="Technical",
            venue="Hall 2",
            event_date=date(2026, 11, 10),
            start_time=time(10, 0),
            end_time=time(12, 0),
            capacity=50,
            registration_deadline=datetime(2026, 11, 9, 23, 59),
            status=EventStatus.PENDING,
        )

        db.add(event)
        db.commit()
        db.refresh(event)

        response = client.patch(
            f"/api/events/{event.id}/status",
            json={"status": "COMPLETED"},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "COMPLETED"

    finally:
        db.close()
