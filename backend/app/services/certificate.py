
import secrets
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.club_access import require_club_email_access
from app.models.certificate import Certificate
from app.models.event import Event, EventStatus
from app.models.registration import Registration
from app.models.user import User, UserRole
from app.schemas.certificate import CertificateCreate


def issue_certificate(
    db: Session,
    data: CertificateCreate,
    issuer: User,
) -> Certificate:
    if issuer.role != UserRole.CLUB:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the authorized Club account can issue certificates",
        )

    event = db.get(Event, data.event_id)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    require_club_email_access(issuer, event.club.contact_email)

    if event.status != EventStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificates can only be issued for completed events",
        )
    try:
        recipient_uuid = UUID(data.recipient_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Recipient ID must be a valid UUID",
        )

    registration = (
        db.query(Registration)
        .filter(
            Registration.event_id == data.event_id,
            Registration.user_id == recipient_uuid,
        )
        .first()
    )

    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient is not registered for this event",
        )

    if registration.checked_in_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificates can only be issued to attendees with verified attendance",
        )

    existing = (
        db.query(Certificate)
        .filter(
            Certificate.event_id == data.event_id,
            Certificate.recipient_id == data.recipient_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Certificate already issued to this recipient for this event",
        )

    certificate = Certificate(
        event_id=data.event_id,
        recipient_id=data.recipient_id,
        recipient_name=registration.attendee_name,
        certificate_code=f"EVH-{secrets.token_hex(16).upper()}",
    )

    db.add(certificate)
    db.commit()
    db.refresh(certificate)
    return certificate


def get_certificate_by_code(db: Session, certificate_code: str) -> Certificate:
    certificate = (
        db.query(Certificate)
        .filter(Certificate.certificate_code == certificate_code)
        .first()
    )
    if certificate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found",
        )
    return certificate


def list_recipient_certificates(
    db: Session,
    recipient_id: str,
) -> list[Certificate]:
    return (
        db.query(Certificate)
        .filter(Certificate.recipient_id == recipient_id)
        .order_by(Certificate.issued_at.desc())
        .all()
    )
