from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.current_user import get_current_profile
from app.database.session import get_db
from app.models.user import User
from app.schemas.user import UserOnboardingRequest, UserProfileResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfileResponse)
def read_my_profile(user: User = Depends(get_current_profile)):
    return user


@router.post("/me/onboarding", response_model=UserProfileResponse)
def complete_onboarding(
    payload: UserOnboardingRequest,
    user: User = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    try:
        result = db.execute(
            update(User)
            .where(
                User.id == user.id,
                User.onboarding_completed.is_(False),
            )
            .values(
                role=payload.role,
                onboarding_completed=True,
            )
        )

        if result.rowcount != 1:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Onboarding is already complete",
            )

        db.commit()
        db.refresh(user)
        return user
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise
