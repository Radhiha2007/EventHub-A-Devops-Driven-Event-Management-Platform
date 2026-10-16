from app.database.base import Base
from app.database.session import engine
from app.models import (
    Certificate,
    Club,
    Event,
    Feedback,
    Notification,
    User,
)


def init_db():
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print("EventHub database tables created successfully")
