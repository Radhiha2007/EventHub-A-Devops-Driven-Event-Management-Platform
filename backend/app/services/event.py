from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.event import Event, EventStatus
from app.schemas.event import EventCreate, EventStatusUpdate, EventUpdate


def create_event(db: Session, event_data: EventCreate) -> Event:
    event = Event(**event_data.model_dump())

    db.add(event)
    db.commit()
    db.refresh(event)

    return event


def get_events(
    db: Session,
    search: str | None = None,
    category: str | None = None,
    event_date: date | None = None,
    club_id: UUID | None = None,
    status: EventStatus | None = None,
) -> list[Event]:
    query = db.query(Event)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            Event.title.ilike(search_pattern)
            | Event.description.ilike(search_pattern)
            | Event.venue.ilike(search_pattern)
        )

    if category:
        query = query.filter(Event.category == category)

    if event_date:
        query = query.filter(Event.event_date == event_date)

    if club_id:
        query = query.filter(Event.club_id == club_id)

    if status:
        query = query.filter(Event.status == status)

    return query.order_by(Event.event_date, Event.start_time).all()


def get_event(db: Session, event_id: UUID) -> Event | None:
    return db.query(Event).filter(Event.id == event_id).first()


def update_event(
    db: Session,
    event: Event,
    event_data: EventUpdate,
) -> Event:
    update_data = event_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)

    return event



def update_event_status(
    db: Session,
    event: Event,
    status_data: EventStatusUpdate,
) -> Event:
    allowed_transitions = {
        EventStatus.UPCOMING: {
            EventStatus.ONGOING,
            EventStatus.COMPLETED,
            EventStatus.CANCELLED,
        },
        EventStatus.ONGOING: {
            EventStatus.COMPLETED,
            EventStatus.CANCELLED,
        },
        EventStatus.COMPLETED: set(),
        EventStatus.CANCELLED: set(),
    }

    if status_data.status == event.status:
        return event

    if status_data.status not in allowed_transitions[event.status]:
        raise ValueError(
            f"Cannot change event status from "
            f"{event.status.value} to {status_data.status.value}"
        )

    event.status = status_data.status
    db.commit()
    db.refresh(event)

    return event

def delete_event(db: Session, event: Event) -> None:
    db.delete(event)
    db.commit()
