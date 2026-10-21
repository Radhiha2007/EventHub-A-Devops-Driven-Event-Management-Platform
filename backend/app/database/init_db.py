
from app.database.base import Base
from app.database.session import engine
from app.models import (
    Certificate,
    Club,
    Event,
    Feedback,
    Notification,
    Registration,
    User,
)


def init_db():
    # Create tables and enum types for a fresh database.
    Base.metadata.create_all(bind=engine)

    # Migrate legacy event statuses to the new lifecycle.
    from migrations.update_event_status_enum import (
        migrate as migrate_event_status_enum,
    )
    migrate_event_status_enum()

    # Add the verified-user registration link to existing databases.
    from migrations.add_registration_user_id import (
        migrate as migrate_registration_user_id,
    )
    migrate_registration_user_id()

    # Prevent duplicate certificates for the same event and recipient.
    from migrations.add_certificate_unique_constraint import (
        migrate as migrate_certificate_unique_constraint,
    )
    migrate_certificate_unique_constraint()

if __name__ == "__main__":
    init_db()
    print("EventHub database tables created successfully")
