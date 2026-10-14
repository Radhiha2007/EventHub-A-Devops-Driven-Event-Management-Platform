
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.schemas.notification import NotificationCreate


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
