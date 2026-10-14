import uuid
from datetime import date, datetime, time

from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal
from app.models.club import Club
from app.models.event import Event, EventStatus


client = TestClient(app)


def create_test_event():
    db = SessionLocal()
    try:
        club = Club(name=f"Certificate Test Club {uuid.uuid4().hex[:8]}")
        db.add(club)
        db.commit()
        db.refresh(club)

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
            status=EventStatus.APPROVED,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event.id
    finally:
        db.close()


def test_issue_certificate():
    event_id = create_test_event()

    response = client.post(
        "/api/certificates/issue",
        json={
            "event_id": str(event_id),
            "recipient_id": f"student-{uuid.uuid4().hex}",
            "recipient_name": "Test Student",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["event_id"] == str(event_id)
    assert data["recipient_name"] == "Test Student"
    assert data["certificate_code"].startswith("EVH-")


def test_issue_certificate_for_nonexistent_event():
    response = client.post(
        "/api/certificates/issue",
        json={
            "event_id": str(uuid.uuid4()),
            "recipient_id": f"student-{uuid.uuid4().hex}",
            "recipient_name": "Test Student",
        },
    )

    assert response.status_code == 404


def test_duplicate_certificate_is_rejected():
    event_id = create_test_event()
    recipient_id = f"student-{uuid.uuid4().hex}"
    payload = {
        "event_id": str(event_id),
        "recipient_id": recipient_id,
        "recipient_name": "Test Student",
    }

    first = client.post("/api/certificates/issue", json=payload)
    second = client.post("/api/certificates/issue", json=payload)

    assert first.status_code == 201
    assert second.status_code == 409


def test_list_recipient_certificates():
    event_id = create_test_event()
    recipient_id = f"student-{uuid.uuid4().hex}"

    issue_response = client.post(
        "/api/certificates/issue",
        json={
            "event_id": str(event_id),
            "recipient_id": recipient_id,
            "recipient_name": "Test Student",
        },
    )
    assert issue_response.status_code == 201

    response = client.get(f"/api/certificates/recipient/{recipient_id}")

    assert response.status_code == 200
    assert any(
        item["certificate_code"] == issue_response.json()["certificate_code"]
        for item in response.json()
    )


def test_verify_certificate():
    event_id = create_test_event()
