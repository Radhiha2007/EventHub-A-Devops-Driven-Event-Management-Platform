from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.database.session import get_db
from app.models.user import User, UserRole
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.services.feedback import create_feedback, get_event_feedback


router = APIRouter(
    prefix="/api/feedback",
    tags=["Feedback"],
)


@router.post(
    "",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_feedback(
    feedback_data: FeedbackCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.STUDENT)),
):
    return create_feedback(db, feedback_data, user)


@router.get(
    "/event/{event_id}",
    response_model=list[FeedbackResponse],
)
def list_event_feedback(
    event_id: UUID,
    db: Session = Depends(get_db),
):
    return get_event_feedback(db, event_id)