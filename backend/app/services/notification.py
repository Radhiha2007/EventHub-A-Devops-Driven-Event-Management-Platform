
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.schemas.notification import NotificationCreate
import logging

from sqlalchemy.exc import SQLAlchemyError

from app.models.user import User, UserRole
from app.models.registration import Registration
from app.models.event import Event
from app.models.notification import Notification, NotificationType

def create_notification(db: Session, notification_data: NotificationCreate):
    notification = Notification(**notification_data.model_dump())

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification


def get_recipient_notifications(
    db: Session,
    recipient_id: str,
    unread_only: bool = False,
):
    query = db.query(Notification).filter(
        Notification.recipient_id == recipient_id
    )

    if unread_only:
        query = query.filter(Notification.is_read.is_(False))

    return query.order_by(Notification.created_at.desc()).all()


def update_notification_read_status(
    db: Session,
    notification_id: UUID,
    is_read: bool,
):
    notification = db.get(Notification, notification_id)

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    notification.is_read = is_read
    db.commit()
    db.refresh(notification)

    return notification
logger = logging.getLogger(__name__)


def create_notifications(
    db: Session,
    recipient_ids: list[str],
    title: str,
    message: str,
    notification_type: NotificationType = NotificationType.GENERAL,
) -> int:
    """Persist notifications for multiple recipients in one batch."""
    unique_ids = set(recipient_ids)
    if not unique_ids:
        return 0

    try:
        db.add_all([
            Notification(
                recipient_id=recipient_id,
                title=title,
                message=message,
                notification_type=notification_type,
            )
            for recipient_id in unique_ids
        ])
        db.commit()
        return len(unique_ids)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to persist EventHub notifications")
        return 0


def get_active_student_ids(db: Session) -> list[str]:
    """Return IDs for active student accounts."""
    return [
        str(user_id)
        for (user_id,) in db.query(User.id).filter(
            User.role == UserRole.STUDENT,
            User.is_active.is_(True),
        ).all()
    ]


def get_event_student_ids(db: Session, event_id: UUID) -> list[str]:
    """Return active student IDs linked to registrations for an event."""
    rows = (
        db.query(User.id)
        .join(Registration, Registration.user_id == User.id)
        .filter(
            Registration.event_id == event_id,
            User.role == UserRole.STUDENT,
            User.is_active.is_(True),
        )
        .distinct()
        .all()
    )
    return [str(user_id) for (user_id,) in rows]
