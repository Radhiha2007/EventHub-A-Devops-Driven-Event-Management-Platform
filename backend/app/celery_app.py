
import os

from celery import Celery

celery_app = Celery(
    "eventhub",
    broker=os.getenv("REDIS_URL", "redis://redis:6379/0"),
    include=["app.tasks.notifications"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    task_always_eager=(
        os.getenv("CELERY_TASK_ALWAYS_EAGER", "false").lower() == "true"
    ),
)
