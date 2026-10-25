import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ClubCreate(BaseModel):
    name: str
    description: str | None = None
    contact_email: str | None = None
    advisor_name: str | None = None


class ClubUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    contact_email: str | None = None
    advisor_name: str | None = None


class ClubResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    contact_email: str | None
    advisor_name: str | None
    created_at: datetime
