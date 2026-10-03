from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.event import EventStatus
from app.schemas.event import (
    EventCreate,
    EventResponse,
    EventStatusUpdate,
    EventUpdate,
)
from app.services.event import (
    create_event,
    delete_event,
    get_event,
    get_events,
    update_event,
    update_event_status,
)


router = APIRouter(
    prefix="/api/events",
    tags=["Events"],
)


@router.post(
    "",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_event_endpoint(
    event_data: EventCreate,
    db: Session = Depends(get_db),
):
    return create_event(db, event_data)


@router.get(
    "",
    response_model=list[EventResponse],
)
def list_events(
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    event_date: date | None = Query(default=None),
    club_id: UUID | None = Query(default=None),
    event_status: EventStatus | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_events(
        db=db,
        search=search,
        category=category,
        event_date=event_date,
        club_id=club_id,
        status=event_status,
    )


@router.get(
    "/{event_id}",
    response_model=EventResponse,
)
def get_event_endpoint(
    event_id: UUID,
    db: Session = Depends(get_db),
):
    event = get_event(db, event_id)

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    return event


@router.put(
    "/{event_id}",
    response_model=EventResponse,
)
def update_event_endpoint(
    event_id: UUID,
    event_data: EventUpdate,
    db: Session = Depends(get_db),
):
    event = get_event(db, event_id)

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    return update_event(db, event, event_data)


@router.patch(
    "/{event_id}/status",
    response_model=EventResponse,
)
def update_event_status_endpoint(
    event_id: UUID,
    status_data: EventStatusUpdate,
    db: Session = Depends(get_db),
):
    event = get_event(db, event_id)

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    return update_event_status(db, event, status_data)


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_event_endpoint(
    event_id: UUID,
    db: Session = Depends(get_db),
):
    event = get_event(db, event_id)

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    delete_event(db, event)
