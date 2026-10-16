
import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.database.session import get_db, SessionLocal
from app.models.notification import Notification


client = TestClient(app)


def test_create_notification():
    recipient = f"test-{uuid.uuid4()}"

    response = client.post(
        "/api/notifications",
        json={
            "recipient_id": recipient,
            "title": "Event Reminder",
            "message": "Your event starts tomorrow.",
            "notification_type": "EVENT_REMINDER",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["recipient_id"] == recipient
    assert data["title"] == "Event Reminder"
    assert data["is_read"] is False


def test_list_recipient_notifications():
    recipient = f"test-{uuid.uuid4()}"

    response = client.post(
        "/api/notifications",
        json={
            "recipient_id": recipient,
            "title": "Unread notice",
            "message": "Please review this notice.",
            "notification_type": "GENERAL",
        },
    )
    assert response.status_code == 201

    response = client.get(
        f"/api/notifications/recipient/{recipient}"
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["recipient_id"] == recipient


def test_mark_notification_as_read():
    recipient = f"test-{uuid.uuid4()}"

    response = client.post(
        "/api/notifications",
        json={
            "recipient_id": recipient,
            "title": "Registration",
            "message": "Your registration is confirmed.",
            "notification_type": "REGISTRATION",
        },
    )
    assert response.status_code == 201
    notification_id = response.json()["id"]

    response = client.patch(
        f"/api/notifications/{notification_id}/read",
        json={"is_read": True},
    )

    assert response.status_code == 200
    assert response.json()["is_read"] is True


def test_list_unread_notifications_only():
    recipient = f"test-{uuid.uuid4()}"

    created = client.post(
        "/api/notifications",
        json={
            "recipient_id": recipient,
            "title": "Read notice",
            "message": "This notice has been read.",
            "notification_type": "GENERAL",
        },
    )
    assert created.status_code == 201

    notification_id = created.json()["id"]
    updated = client.patch(
        f"/api/notifications/{notification_id}/read",
        json={"is_read": True},
    )
    assert updated.status_code == 200

    client.post(
        "/api/notifications",
        json={
            "recipient_id": recipient,
            "title": "Unread notice",
            "message": "This notice is still unread.",
            "notification_type": "EVENT_UPDATE",
        },
    )

    response = client.get(
        f"/api/notifications/recipient/{recipient}?unread_only=true"
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["title"] == "Unread notice"


def test_mark_missing_notification_returns_404():
    missing_id = uuid.uuid4()

    response = client.patch(
        f"/api/notifications/{missing_id}/read",
        json={"is_read": True},
    )

    assert response.status_code == 404
