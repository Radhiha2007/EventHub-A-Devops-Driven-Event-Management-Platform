import hashlib
import secrets
from datetime import datetime
from uuid import UUID

from sqlalchemy import func, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.event import Event, EventStatus
from app.models.registration import Registration
from app.models.user import User
from app.schemas.registration import RegistrationCreate
from app.models.notification import NotificationType
from app.services.notification import create_notifications

class RegistrationError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def create_registration(
    db: Session, event_id: UUID, data: RegistrationCreate, user: User
) -> tuple[Registration, str]:
    # Lock the event row so concurrent registrations for this event serialize
    # before the capacity check. PostgreSQL holds this lock until transaction end.
    event = db.query(Event).filter(Event.id == event_id).with_for_update().first()
    if event is None:
        raise RegistrationError(404, "Event not found")
    if event.status != EventStatus.UPCOMING:
        raise RegistrationError(
            409,
            "Registrations are available only for upcoming events"
    )
    if event.registration_deadline <= datetime.utcnow():
        raise RegistrationError(409, "Registration deadline has passed")

    count = db.query(func.count(Registration.id)).filter(Registration.event_id == event_id).scalar()
    existing_user_registration = (
        db.query(Registration.id)
        .filter(Registration.event_id == event_id, Registration.user_id == user.id)
        .first()
    )
    if existing_user_registration is not None:
        raise RegistrationError(409, "This user is already registered for the event")
    if count >= event.capacity:
        raise RegistrationError(409, "Event capacity has been reached")

    credential = secrets.token_urlsafe(32)
    registration = Registration(
        event_id=event_id,
        user_id=user.id,
        attendee_name=data.attendee_name,
        attendee_email=data.attendee_email,
        qr_credential_hash=hashlib.sha256(credential.encode("utf-8")).hexdigest(),
    )
    db.add(registration)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        # Covers concurrent duplicate submissions, enforced by the DB constraint.
        raise RegistrationError(409, "This account is already registered for the event") from exc
    db.refresh(registration)
    return registration, credential


def get_registration_by_credential(db: Session, credential: str) -> Registration | None:
    credential_hash = hashlib.sha256(credential.encode("utf-8")).hexdigest()
    return (
        db.query(Registration)
        .filter(Registration.qr_credential_hash == credential_hash)
        .first()
    )


def list_user_registrations(db: Session, user_id: UUID) -> list[Registration]:
    return (
        db.query(Registration)
        .options(joinedload(Registration.event))
        .filter(Registration.user_id == user_id)
        .order_by(Registration.registered_at.desc())
        .all()
    )


def reissue_registration_qr_credential(
    db: Session,
    registration_id: UUID,
    user_id: UUID,
) -> str:
    registration = (
        db.query(Registration)
        .filter(
            Registration.id == registration_id,
            Registration.user_id == user_id,
        )
        .with_for_update()
        .first()
    )
    if registration is None:
        raise RegistrationError(404, "Registration not found")
    if registration.checked_in_at is not None:
        raise RegistrationError(409, "This registration has already been checked in")

    credential = secrets.token_urlsafe(32)
    registration.qr_credential_hash = hashlib.sha256(
        credential.encode("utf-8")
    ).hexdigest()
    db.commit()
    db.refresh(registration)
    return credential



def check_in(db: Session, credential: str) -> tuple[Registration, bool]:
    credential_hash = hashlib.sha256(credential.encode("utf-8")).hexdigest()

    # Find the registration before attempting to record attendance.
    registration = (
        db.query(Registration)
        .filter(Registration.qr_credential_hash == credential_hash)
        .first()
    )

    if registration is None:
        raise RegistrationError(404, "Invalid QR credential")

    # Lock the event while checking its status and recording attendance.
    event = (
        db.query(Event)
        .filter(Event.id == registration.event_id)
        .with_for_update()
        .first()
    )

    if event is None:
        raise RegistrationError(404, "Event not found")

    if event.status != EventStatus.ONGOING:
        raise RegistrationError(
            409,
            "Attendance can be recorded only while the event is ongoing",
        )

    # Record attendance only if it has not already been recorded.
    checked_in_at = datetime.utcnow()

    result = db.execute(
        update(Registration)
        .where(
            Registration.id == registration.id,
            Registration.checked_in_at.is_(None),
        )
        .values(checked_in_at=checked_in_at)
        .returning(
            Registration.id,
            Registration.event_id,
            Registration.attendee_name,
            Registration.checked_in_at,
        )
    )

    row = result.one_or_none()

    if row is None:
        db.rollback()
        raise RegistrationError(409, "Registration has already been checked in")

    db.commit()

    registration = db.get(Registration, row.id)

    # Notify the student only after attendance has been recorded.
    if registration is not None and registration.user_id is not None:
        create_notifications(
            db=db,
            recipient_ids=[str(registration.user_id)],
            title="Attendance recorded",
            message=f"Your attendance for '{event.title}' has been recorded.",
            notification_type=NotificationType.GENERAL,
        )

    return registration, True