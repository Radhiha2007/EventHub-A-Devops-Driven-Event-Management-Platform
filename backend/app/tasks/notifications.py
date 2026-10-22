
import logging

from sqlalchemy.exc import SQLAlchemyError

from app.celery_app import celery_app
from app.database.session import SessionLocal
from app.models.notification import Notification, NotificationType

logger = logging.getLogger(__name__)


@celery_app.task(
    name="notifications.create_batch",
    autoretry_for=(SQLAlchemyError,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def create_notification_batch(
    recipient_ids: list[str],
    title: str,
    message: str,
    notification_type: str = "GENERAL",
) -> int:
    db = SessionLocal()

    try:
        notification_kind = NotificationType(notification_type)

        unique_ids = set(recipient_ids)
        if not unique_ids:
            return 0

        notifications = [
            Notification(
                recipient_id=recipient_id,
                title=title,
                message=message,
                notification_type=notification_kind,
            )
            for recipient_id in unique_ids
        ]

        db.add_all(notifications)
        db.commit()

        logger.info(
            "Created %s notifications for batch: %s",
            len(notifications),
            title,
        )
        return len(notifications)

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Database error while creating notifications")
        raise

    finally:
        db.close()
