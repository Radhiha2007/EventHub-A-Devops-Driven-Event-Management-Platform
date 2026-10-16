
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.notification import (
    NotificationCreate,
    NotificationReadUpdate,
    NotificationResponse,
)
from app.services.notification import (
    create_notification,
    get_recipient_notifications,
    update_notification_read_status,
)

router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"],
)


@router.post(
    "",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_notification_endpoint(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
):
    return create_notification(db, notification_data)


@router.get(
    "/recipient/{recipient_id}",
    response_model=list[NotificationResponse],
)
def list_notifications_endpoint(
    recipient_id: str,
    unread_only: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    return get_recipient_notifications(db, recipient_id, unread_only)


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
)
def update_notification_read_endpoint(
    notification_id: UUID,
    read_update: NotificationReadUpdate,
    db: Session = Depends(get_db),
):
    return update_notification_read_status(
        db,
        notification_id,
        read_update.is_read,
    )
