from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.event import Event, EventStatus
from app.models.feedback import Feedback
from app.models.registration import Registration
from app.models.user import User
from app.schemas.feedback import FeedbackCreate


def create_feedback(
    db: Session,
    feedback_data: FeedbackCreate,
    user: User,
) -> Feedback:
    event = db.get(Event, feedback_data.event_id)

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    if event.status != EventStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback is only allowed for completed events",
        )

    registration = (
        db.query(Registration)
        .filter(
            Registration.event_id == event.id,
            Registration.user_id == user.id,
            Registration.checked_in_at.isnot(None),
        )
        .first()
    )

    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must attend the event to submit feedback",
        )

    feedback = Feedback(
        event_id=event.id,
        user_id=user.id,
        rating=feedback_data.rating,
        comments=feedback_data.comments,
    )

    db.add(feedback)

    try:
        db.commit()
        db.refresh(feedback)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted feedback for this event",
        ) from exc

    return feedback


def get_event_feedback(db: Session, event_id: UUID):
    event = db.get(Event, event_id)

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    return (
        db.query(Feedback)
        .filter(Feedback.event_id == event_id)
        .order_by(Feedback.created_at.desc())
        .all()
    )