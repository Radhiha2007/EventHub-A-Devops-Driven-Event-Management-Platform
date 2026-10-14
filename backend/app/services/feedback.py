
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate


def create_feedback(db: Session, feedback_data: FeedbackCreate):
    event = db.get(Event, feedback_data.event_id)

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    feedback = Feedback(**feedback_data.model_dump())

    db.add(feedback)
    db.commit()
    db.refresh(feedback)

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
