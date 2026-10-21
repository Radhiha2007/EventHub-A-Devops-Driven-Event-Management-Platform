import uuid
from datetime import datetime
import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.event import EventResponse


class RegistrationCreate(BaseModel):
    attendee_name: str = Field(min_length=1, max_length=255)
    attendee_email: str = Field(min_length=3, max_length=320)

    @field_validator("attendee_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Attendee name cannot be blank")
        return value

    @field_validator("attendee_email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("A valid email address is required")
        return value


class RegistrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_id: uuid.UUID
    attendee_name: str
    attendee_email: str
    registered_at: datetime
    checked_in_at: datetime | None


class RegistrationCreatedResponse(RegistrationResponse):
    # This credential is returned only once, at creation, for QR generation.
    qr_credential: str


class StudentRegistrationResponse(RegistrationResponse):
    event: EventResponse


class RegistrationCredentialResponse(BaseModel):
    # Reissuing a credential invalidates the previous QR code for this registration.
    qr_credential: str


class CheckInRequest(BaseModel):
    credential: str = Field(min_length=32, max_length=128)


class CheckInResponse(BaseModel):
    registration_id: uuid.UUID
    event_id: uuid.UUID
    attendee_name: str
    checked_in_at: datetime
