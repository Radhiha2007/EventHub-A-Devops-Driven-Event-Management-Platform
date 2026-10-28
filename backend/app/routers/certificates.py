import uuid
from io import BytesIO
from pathlib import Path
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter
from app.models.certificate import Certificate
from app.models.event import Event
from app.models.club import Club
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

from app.schemas.certificate import (
    CertificateCreate,
    CertificateResponse,
    CertificateVerification,
    CertificateBulkResponse,
)

from app.services.certificate import (
    get_certificate_by_code,
    issue_certificate,
    issue_certificates_for_event,
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

    club = db.get(Club, event.club_id)
    page_size = landscape(A4)
    width, height = page_size

    # Create the transparent text layer.
    text_buffer = BytesIO()
    pdf = canvas.Canvas(text_buffer, pagesize=page_size)

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
    if club is not None:
        pdf.setFont("Helvetica", 15)
        pdf.drawCentredString(
            width / 2,
            height - 330,
            f"from {club.name}",
        )
    pdf.setFont("Helvetica", 11)
    pdf.drawCentredString(
        width / 2, 90,
        f"Certificate Code: {certificate.certificate_code}",
    )
    pdf.drawCentredString(
        width / 2, 70,
        f"Issued on: {certificate.issued_at:%d %B %Y}",
    )

    pdf.save()
    text_buffer.seek(0)

    # Load the designed background and merge the text on top.
    background_path = (
        Path(__file__).resolve().parents[1]
        / "assets"
        / "certificate_background.pdf"
    )

    if not background_path.is_file():
        raise HTTPException(
            status_code=500,
            detail="Certificate background PDF is missing",
        )

    background_reader = PdfReader(str(background_path))
    text_reader = PdfReader(text_buffer)

    if not background_reader.pages:
        raise HTTPException(
            status_code=500,
            detail="Certificate background PDF has no pages",
        )

    background_page = background_reader.pages[0]
    text_page = text_reader.pages[0]

    # Scale the text layer if the background page has different dimensions.
    background_width = float(background_page.mediabox.width)
    background_height = float(background_page.mediabox.height)
    text_width = float(text_page.mediabox.width)
    text_height = float(text_page.mediabox.height)

    if (
        abs(background_width - text_width) > 1
        or abs(background_height - text_height) > 1
    ):
        from pypdf import Transformation

        text_page.add_transformation(
            Transformation().scale(
                sx=background_width / text_width,
                sy=background_height / text_height,
            )
        )

    background_page.merge_page(text_page)

    output_buffer = BytesIO()
    writer = PdfWriter()
    writer.add_page(background_page)
    writer.add_metadata({
        "/Title": f"Certificate - {certificate.certificate_code}"
    })
    writer.write(output_buffer)
    output_buffer.seek(0)

    filename = f"certificate-{certificate.certificate_code}.pdf"

    return StreamingResponse(
        output_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
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

@router.post(
    "/bulk/{event_id}",
    response_model=CertificateBulkResponse,
)
def issue_bulk_certificates_endpoint(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    issuer: User = Depends(get_current_profile),
):
    return issue_certificates_for_event(db, event_id, issuer)

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
