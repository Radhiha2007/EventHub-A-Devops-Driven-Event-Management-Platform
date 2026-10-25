
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from typing import Annotated


class FeedbackCreate(BaseModel):
    event_id: uuid.UUID
    rating: int = Field(ge=1, le=5)
    comments: Annotated[str, StringConstraints(max_length=2000)] | None = None


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_id: uuid.UUID
    rating: int
    comments: str | None
    created_at: datetime
