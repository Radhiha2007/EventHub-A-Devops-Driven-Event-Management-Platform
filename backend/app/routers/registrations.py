from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.registration import (
    CheckInRequest,
    CheckInResponse,
    RegistrationCreate,
    RegistrationCreatedResponse,
    RegistrationResponse,
)
from app.services.registration import RegistrationError, check_in, create_registration


router = APIRouter(prefix="/api", tags=["Registrations and attendance"])


@router.post(
    "/events/{event_id}/registrations",
    response_model=RegistrationCreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_for_event(event_id: UUID, data: RegistrationCreate, db: Session = Depends(get_db)):
    try:
        registration, credential = create_registration(db, event_id, data)
    except RegistrationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    response = RegistrationResponse.model_validate(registration).model_dump()
    response["qr_credential"] = credential
    return response


@router.get(
    "/events/{event_id}/registrations",
    response_model=list[RegistrationResponse],
)
def list_event_registrations(event_id: UUID, db: Session = Depends(get_db)):
    # No authentication system exists yet. This listing is intentionally not
    # suitable for public deployment; integrate event-staff authorization here.
    from app.models.event import Event
    from app.models.registration import Registration

    if db.query(Event.id).filter(Event.id == event_id).first() is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return (
        db.query(Registration)
        .filter(Registration.event_id == event_id)
        .order_by(Registration.registered_at)
        .all()
    )


@router.post("/attendance/check-in", response_model=CheckInResponse)
def check_in_attendee(data: CheckInRequest, db: Session = Depends(get_db)):
    # SECURITY LIMITATION: intentionally no staff authentication is available
    # in this project. Do not expose this endpoint publicly until event-staff
    # authorization is added and enforced here (including event scoping).
    try:
        registration, _ = check_in(db, data.credential)
    except RegistrationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return {
        "registration_id": registration.id,
        "event_id": registration.event_id,
        "attendee_name": registration.attendee_name,
        "checked_in_at": registration.checked_in_at,
    }
