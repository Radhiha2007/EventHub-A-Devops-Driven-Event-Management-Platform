
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.certificate import (
    CertificateCreate,
    CertificateResponse,
    CertificateVerification,
)
from app.services.certificate import (
    get_certificate_by_code,
    issue_certificate,
    list_recipient_certificates,
)

router = APIRouter(
    prefix="/api/certificates",
    tags=["Certificates"],
)


@router.post(
    "/issue",
    response_model=CertificateResponse,
    status_code=status.HTTP_201_CREATED,
)
def issue_certificate_endpoint(
    certificate_data: CertificateCreate,
    db: Session = Depends(get_db),
):
    return issue_certificate(db, certificate_data)


@router.get(
    "/recipient/{recipient_id}",
    response_model=list[CertificateResponse],
)
def list_certificates_endpoint(
    recipient_id: str,
    db: Session = Depends(get_db),
):
    return list_recipient_certificates(db, recipient_id)


@router.get(
    "/verify/{certificate_code}",
    response_model=CertificateVerification,
)
def verify_certificate_endpoint(
    certificate_code: str,
    db: Session = Depends(get_db),
):
    certificate = get_certificate_by_code(db, certificate_code)

    return CertificateVerification(
        valid=True,
        certificate_code=certificate.certificate_code,
        event_id=certificate.event_id,
        recipient_name=certificate.recipient_name,
        issued_at=certificate.issued_at,
    )
