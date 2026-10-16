
from sqlalchemy import text

from app.database.base import Base
from app.database.session import engine
from app.models import Club, Event


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


if __name__ == "__main__":
    init_db()
    print("P2 database tables created successfully")
