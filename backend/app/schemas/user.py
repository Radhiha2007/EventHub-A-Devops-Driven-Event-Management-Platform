from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.user import UserRole


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str | None
    full_name: str | None
    role: UserRole
    onboarding_completed: bool
    is_active: bool


class UserOnboardingRequest(BaseModel):
    role: UserRole
