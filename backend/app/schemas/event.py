
import uuid
from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.event import EventStatus


def validate_schedule(
    event_date: date | None,
    start_time: time | None,
    end_time: time | None,
    registration_deadline: datetime | None,
) -> None:
    if start_time is not None and end_time is not None:
        if end_time <= start_time:
            raise ValueError(
                "Event end time must be later than start time"
            )

    if registration_deadline is not None:
        if (
            registration_deadline.tzinfo is not None
            and registration_deadline.utcoffset() is not None
        ):
            raise ValueError(
                "Registration deadline must use a timezone-naive datetime"
            )

    if (
        event_date is not None
        and start_time is not None
        and registration_deadline is not None
    ):
        event_start = datetime.combine(event_date, start_time)

        if registration_deadline >= event_start:
            raise ValueError(
                "Registration deadline must be before the event starts"
            )

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

    @model_validator(mode="after")
    def check_schedule(self):
        validate_schedule(
            self.event_date,
            self.start_time,
            self.end_time,
            self.registration_deadline,
        )
        return self


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
