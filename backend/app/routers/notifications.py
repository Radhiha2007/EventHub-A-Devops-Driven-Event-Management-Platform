
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.current_user import get_current_profile
from app.database.session import get_db
from app.models.user import User
from app.schemas.notification import (
    NotificationReadUpdate,
    NotificationResponse,
)
from app.services.notification import (
    get_recipient_notifications,
    update_notification_read_status,
)

router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"],
)


@router.get(
    "/recipient/{recipient_id}",
    response_model=list[NotificationResponse],
)
def list_notifications_endpoint(
    recipient_id: str,
    unread_only: bool = Query(default=False),
    current_user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    if recipient_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own notifications",
        )

    return get_recipient_notifications(
        db,
        str(current_user.id),
        unread_only,
    )


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
)
def update_notification_read_endpoint(
    notification_id: UUID,
    read_update: NotificationReadUpdate,
    current_user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    return update_notification_read_status(
        db,
        notification_id,
        read_update.is_read,
        str(current_user.id),
    )
