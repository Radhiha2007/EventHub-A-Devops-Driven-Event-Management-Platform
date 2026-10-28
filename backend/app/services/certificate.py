
import secrets
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.club_access import require_club_email_access
from app.models.certificate import Certificate
from app.models.event import Event, EventStatus
from app.models.registration import Registration
from app.models.user import User, UserRole
from app.schemas.certificate import CertificateCreate
from app.models.notification import NotificationType
from app.services.notification import create_notifications
from app.schemas.certificate import CertificateCreate, CertificateBulkResponse

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

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()

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
            ) from exc

        raise

    db.refresh(certificate)

    create_notifications(
        db=db,
        recipient_ids=[str(recipient_uuid)],
        title="Certificate issued",
        message=(
            f"Your certificate for '{event.title}' has been issued "
            "and is ready to view."
        ),
        notification_type=NotificationType.GENERAL,
    )

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

def issue_certificates_for_event(
    db: Session,
    event_id: UUID,
    issuer: User,
) -> CertificateBulkResponse:
    if issuer.role != UserRole.CLUB:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the authorized Club account can issue certificates",
        )

    event = db.get(Event, event_id)
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

    # Only checked-in registrations linked to student accounts are eligible.
    registrations = (
        db.query(Registration)
        .join(User, Registration.user_id == User.id)
        .filter(
            Registration.event_id == event_id,
            Registration.checked_in_at.isnot(None),
            User.role == UserRole.STUDENT,
            User.is_active.is_(True),
        )
        .order_by(Registration.registered_at.asc())
        .all()
    )

    # Count checked-in registrations that cannot be linked to an active
    # student account, so they can be reported to the club.
    checked_in_registrations = (
        db.query(Registration)
        .filter(
            Registration.event_id == event_id,
            Registration.checked_in_at.isnot(None),
        )
        .all()
    )

    eligible_ids = {r.id for r in registrations}
    skipped_unlinked = sum(
        1 for r in checked_in_registrations if r.id not in eligible_ids
    )

    already_issued = 0
    issued = 0
    failed = 0

    for registration in registrations:
        existing = (
            db.query(Certificate)
            .filter(
                Certificate.event_id == event_id,
                Certificate.recipient_id == str(registration.user_id),
            )
            .first()
        )

        if existing:
            already_issued += 1
            continue

        try:
            issue_certificate(
                db,
                CertificateCreate(
                    event_id=event_id,
                    recipient_id=str(registration.user_id),
                    recipient_name=registration.attendee_name,
                ),
                issuer,
            )
            issued += 1
        except HTTPException as exc:
            if exc.status_code == status.HTTP_409_CONFLICT:
                already_issued += 1
            else:
                db.rollback()
                failed += 1
        except Exception:
            db.rollback()
            failed += 1

    return CertificateBulkResponse(
        event_id=event_id,
        eligible=len(registrations),
        issued=issued,
        already_issued=already_issued,
        failed=failed,
        skipped_unlinked=skipped_unlinked,
    )