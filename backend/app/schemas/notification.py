
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.notification import NotificationType


class NotificationCreate(BaseModel):
    recipient_id: str = Field(min_length=1, max_length=255)
    title: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1)
    notification_type: NotificationType = NotificationType.GENERAL


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    recipient_id: str
    title: str
    message: str
    notification_type: NotificationType
    is_read: bool
    created_at: datetime


class NotificationReadUpdate(BaseModel):
    is_read: bool
