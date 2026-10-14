
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CertificateCreate(BaseModel):
    event_id: uuid.UUID
    recipient_id: str = Field(min_length=1, max_length=255)
    recipient_name: str = Field(min_length=1, max_length=255)


class CertificateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_id: uuid.UUID
    recipient_id: str
    recipient_name: str
    certificate_code: str
    issued_at: datetime


class CertificateVerification(BaseModel):
    valid: bool
    certificate_code: str
    event_id: uuid.UUID
    recipient_name: str
    issued_at: datetime
