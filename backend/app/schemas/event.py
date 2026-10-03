import uuid
from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field

from app.models.event import EventStatus


class EventCreate(BaseModel):
    club_id: uuid.UUID
    title: str
    description: str | None = None
    category: str
    venue: str
    poster_url: str | None = None
    event_date: date
    start_time: time
    end_time: time
    capacity: int = Field(gt=0)
    registration_deadline: datetime


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    venue: str | None = None
    poster_url: str | None = None
    event_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    capacity: int | None = Field(default=None, gt=0)
    registration_deadline: datetime | None = None


class EventStatusUpdate(BaseModel):
    status: EventStatus


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    club_id: uuid.UUID
    title: str
    description: str | None
    category: str
    venue: str
    poster_url: str | None
    event_date: date
    start_time: time
    end_time: time
    capacity: int
    registration_deadline: datetime
    status: EventStatus
    created_at: datetime
