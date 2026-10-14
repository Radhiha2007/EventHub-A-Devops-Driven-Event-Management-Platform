
import secrets
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.certificate import Certificate
from app.models.event import Event
from app.schemas.certificate import CertificateCreate


def issue_certificate(db: Session, data: CertificateCreate):
    event = db.get(Event, data.event_id)

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
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
        recipient_name=data.recipient_name,
        certificate_code=f"EVH-{secrets.token_hex(16).upper()}",
    )

    db.add(certificate)
    db.commit()
    db.refresh(certificate)

    return certificate


def get_certificate_by_code(db: Session, certificate_code: str):
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


def list_recipient_certificates(db: Session, recipient_id: str):
    return (
        db.query(Certificate)
        .filter(Certificate.recipient_id == recipient_id)
        .order_by(Certificate.issued_at.desc())
        .all()
    )
