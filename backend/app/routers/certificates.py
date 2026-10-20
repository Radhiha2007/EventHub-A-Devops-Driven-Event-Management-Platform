import uuid
from io import BytesIO
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from app.models.certificate import Certificate
from app.models.event import Event
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.current_user import get_current_profile
from app.database.session import get_db
from app.models.user import User, UserRole
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
@router.get("/{certificate_id}/download")
def download_certificate(
    certificate_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_profile),
):
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Students only")

    certificate = db.get(Certificate, certificate_id)

    if certificate is None:
        raise HTTPException(status_code=404, detail="Certificate not found")

    if certificate.recipient_id != str(user.id):
        raise HTTPException(
            status_code=403,
            detail="You can only download your own certificates",
        )

    event = db.get(Event, certificate.event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4)

    pdf.setTitle(f"Certificate - {certificate.certificate_code}")
    pdf.setFont("Helvetica-Bold", 28)
    pdf.drawCentredString(width / 2, height - 100, "CERTIFICATE OF PARTICIPATION")

    pdf.setFont("Helvetica", 16)
    pdf.drawCentredString(width / 2, height - 160, "This certificate is presented to")

    pdf.setFont("Helvetica-Bold", 24)
    pdf.drawCentredString(width / 2, height - 210, certificate.recipient_name)

    pdf.setFont("Helvetica", 16)
    pdf.drawCentredString(width / 2, height - 260, "for participating in")

    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawCentredString(width / 2, height - 300, event.title[:80])

    pdf.setFont("Helvetica", 11)
    pdf.drawCentredString(
        width / 2,
        90,
        f"Certificate Code: {certificate.certificate_code}",
    )
    pdf.drawCentredString(
        width / 2,
        70,
        f"Issued on: {certificate.issued_at:%d %B %Y}",
    )

    pdf.save()
    buffer.seek(0)

    filename = f"certificate-{certificate.certificate_code}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.post(
    "/issue",
    response_model=CertificateResponse,
    status_code=status.HTTP_201_CREATED,
)
def issue_certificate_endpoint(
    certificate_data: CertificateCreate,
    db: Session = Depends(get_db),
    issuer: User = Depends(get_current_profile),
):
    return issue_certificate(db, certificate_data, issuer)


@router.get(
    "/recipient/{recipient_id}",
    response_model=list[CertificateResponse],
)
def list_certificates_endpoint(
    recipient_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_profile),
):
    if user.role != UserRole.STUDENT or str(user.id) != recipient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own certificates",
        )

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
