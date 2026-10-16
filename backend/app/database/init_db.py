
from sqlalchemy import text

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

    # Add COMPLETED to an existing PostgreSQL enum if it is missing.
    # Run separately with AUTOCOMMIT so this also works on PostgreSQL.
    if engine.dialect.name == "postgresql":
        with engine.connect().execution_options(
            isolation_level="AUTOCOMMIT"
        ) as connection:
            connection.execute(
                text(
                    "ALTER TYPE eventstatus "
                    "ADD VALUE IF NOT EXISTS 'COMPLETED'"
                )
            )

    # Add the verified-user registration link to existing databases too.
    from migrations.add_registration_user_id import migrate as migrate_registration_user_id

    migrate_registration_user_id()


if __name__ == "__main__":
    init_db()
    print("EventHub database tables created successfully")
