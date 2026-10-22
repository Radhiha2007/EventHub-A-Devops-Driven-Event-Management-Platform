
import uuid

import pytest
from fastapi import Request
from fastapi.testclient import TestClient
from app.celery_app import celery_app
from app.core.auth import get_current_user
from app.database.session import SessionLocal
from app.main import app
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.services.notification import create_notifications


client = TestClient(app)


@pytest.fixture(autouse=True)
def test_auth_context():
    tenant_id = f"notification-test-{uuid.uuid4()}"
    default_email = f"student-{uuid.uuid4().hex[:8]}@example.com"
    previous_overrides = app.dependency_overrides.copy()

    def current_user_claims(request: Request):
        email = request.headers.get(
            "x-test-email", default_email
        ).strip().lower()

        return {
            "tid": tenant_id,
            "oid": email,
            "preferred_username": email,
            "name": email.split("@", 1)[0],
        }

    app.dependency_overrides[get_current_user] = current_user_claims
    previous_eager_mode = celery_app.conf.task_always_eager
    celery_app.conf.task_always_eager = True
    yield {
        "tenant_id": tenant_id,
        "email": default_email,
    }
    celery_app.conf.task_always_eager = previous_eager_mode

    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous_overrides)

    db = SessionLocal()
    try:
        user_ids = [
            str(user_id)
            for (user_id,) in db.query(User.id).filter(
                User.entra_tenant_id == tenant_id
            ).all()
        ]

        if user_ids:
            db.query(Notification).filter(
                Notification.recipient_id.in_(user_ids)
            ).delete(synchronize_session=False)

        db.query(User).filter(
            User.entra_tenant_id == tenant_id
        ).delete(synchronize_session=False)

        db.commit()
    finally:
        db.close()


@pytest.fixture
def current_student(test_auth_context):
    from app.services.user import get_or_create_user

    db = SessionLocal()
    try:
        user = get_or_create_user(
            db,
            {
                "tid": test_auth_context["tenant_id"],
                "oid": test_auth_context["email"],
                "preferred_username": test_auth_context["email"],
                "name": "Test Student",
            },
        )
        return str(user.id)
    finally:
        db.close()


def add_notification(recipient_id, title="Test notice"):
    """Create a notification through the internal service."""
    db = SessionLocal()
    try:
        count = create_notifications(
            db=db,
            recipient_ids=[recipient_id],
            title=title,
            message="Test notification message.",
            notification_type=NotificationType.GENERAL,
        )
        assert count == 1

        return db.query(Notification).filter(
            Notification.recipient_id == recipient_id,
            Notification.title == title,
        ).order_by(Notification.created_at.desc()).first().id
    finally:
        db.close()


def test_create_notification_internally(current_student):
    notification_id = add_notification(current_student)

    db = SessionLocal()
    try:
        notification = db.get(Notification, notification_id)

        assert notification is not None
        assert notification.recipient_id == current_student
        assert notification.title == "Test notice"
        assert notification.is_read is False
    finally:
        db.close()


def test_public_notification_creation_endpoint_is_removed():
    response = client.post(
        "/api/notifications",
        json={
            "recipient_id": "someone-else",
            "title": "Unauthorized notice",
            "message": "This should not be accepted.",
            "notification_type": "GENERAL",
        },
    )

    assert response.status_code == 404


def test_list_recipient_notifications(current_student):
    add_notification(current_student, "Unread notice")

    response = client.get(
        f"/api/notifications/recipient/{current_student}"
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["recipient_id"] == current_student
    assert data[0]["title"] == "Unread notice"


def test_user_cannot_list_another_recipients_notifications(current_student):
    another_recipient = str(uuid.uuid4())

    response = client.get(
        f"/api/notifications/recipient/{another_recipient}"
    )

    assert response.status_code == 403


def test_mark_notification_as_read(current_student):
    notification_id = add_notification(current_student, "Registration")

    response = client.patch(
        f"/api/notifications/{notification_id}/read",
        json={"is_read": True},
    )

    assert response.status_code == 200
    assert response.json()["is_read"] is True


def test_user_cannot_mark_another_recipients_notification_as_read(
    current_student,
):
    another_recipient = str(uuid.uuid4())
    notification_id = add_notification(another_recipient)

    response = client.patch(
        f"/api/notifications/{notification_id}/read",
        json={"is_read": True},
    )

    assert response.status_code == 404


def test_list_unread_notifications_only(current_student):
    read_id = add_notification(current_student, "Read notice")

    updated = client.patch(
        f"/api/notifications/{read_id}/read",
        json={"is_read": True},
    )
    assert updated.status_code == 200

    add_notification(current_student, "Unread notice")

    response = client.get(
        f"/api/notifications/recipient/{current_student}"
        "?unread_only=true"
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Unread notice"


def test_mark_missing_notification_returns_404(current_student):
    missing_id = uuid.uuid4()

    response = client.patch(
        f"/api/notifications/{missing_id}/read",
        json={"is_read": True},
    )

    assert response.status_code == 404


def test_notification_listing_requires_authentication(current_student):
    previous_overrides = app.dependency_overrides.copy()
    app.dependency_overrides.clear()

    try:
        unauthenticated_client = TestClient(app)
        response = unauthenticated_client.get(
            f"/api/notifications/recipient/{current_student}"
        )
        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)
