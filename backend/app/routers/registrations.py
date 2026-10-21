from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.club_access import require_club_email_access
from app.core.permissions import require_roles
from app.database.session import get_db
from app.models.event import Event
from app.models.registration import Registration
from app.models.user import User, UserRole
from app.schemas.registration import (
    CheckInRequest,
    CheckInResponse,
    RegistrationCreate,
    RegistrationCreatedResponse,
    RegistrationCredentialResponse,
    RegistrationResponse,
    StudentRegistrationResponse,
)
from app.services.registration import (
    RegistrationError,
    check_in,
    create_registration,
    get_registration_by_credential,
    list_user_registrations,
    reissue_registration_qr_credential,
)


router = APIRouter(prefix="/api", tags=["Registrations and attendance"])


@router.post(
    "/events/{event_id}/registrations",
    response_model=RegistrationCreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_for_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.STUDENT)),
):
    # The verified profile is the source of identity. Ignore client-supplied
    # identity values so a Student cannot register someone else by editing JSON.
    if not user.email or not user.full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete your profile with a name and email before registering",
        )
    verified_data = RegistrationCreate(
        attendee_name=user.full_name,
        attendee_email=user.email,
    )
    try:
        registration, credential = create_registration(db, event_id, verified_data, user)
    except RegistrationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    response = RegistrationResponse.model_validate(registration).model_dump()
    response["qr_credential"] = credential
    return response


@router.get(
    "/registrations/me",
    response_model=list[StudentRegistrationResponse],
)
def list_my_registrations(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.STUDENT)),
):
    return list_user_registrations(db, user.id)


@router.post(
    "/registrations/{registration_id}/qr-credential",
    response_model=RegistrationCredentialResponse,
)
def reissue_my_registration_qr(
    registration_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.STUDENT)),
):
    try:
        credential = reissue_registration_qr_credential(
            db,
            registration_id,
            user.id,
        )
    except RegistrationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return {"qr_credential": credential}


@router.get(
    "/events/{event_id}/registrations",
    response_model=list[RegistrationResponse],
)
def list_event_registrations(
    event_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.CLUB)),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    require_club_email_access(user, event.club.contact_email)
    return (
        db.query(Registration)
        .filter(Registration.event_id == event_id)
        .order_by(Registration.registered_at)
        .all()
    )


@router.post("/attendance/check-in", response_model=CheckInResponse)
def check_in_attendee(
    data: CheckInRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.CLUB)),
):
    # Resolve the event from the QR credential and authorize its Club before
    # check_in writes anything. The request cannot choose a different event.
    registration = get_registration_by_credential(db, data.credential)
    if registration is None:
        raise HTTPException(status_code=404, detail="Invalid QR credential")
    event = db.query(Event).filter(Event.id == registration.event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    require_club_email_access(user, event.club.contact_email)

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
