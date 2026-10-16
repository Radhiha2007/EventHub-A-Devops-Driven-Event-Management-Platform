from sqlalchemy import text

from app.database.session import engine


def migrate():
    if engine.dialect.name != "postgresql":
        return

    # PostgreSQL enum changes and data conversion must be done in
    # a controlled transaction. Map old values before replacing the type.
    with engine.begin() as connection:
        enum_exists = connection.execute(
            text("""
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_type
                    WHERE typname = 'eventstatus'
                )
            """)
        ).scalar()

        if not enum_exists:
            # On a fresh database, SQLAlchemy creates the enum from
            # the current EventStatus model.
            return

        labels = connection.execute(
            text("""
                SELECT e.enumlabel
                FROM pg_type t
                JOIN pg_enum e ON e.enumtypid = t.oid
                WHERE t.typname = 'eventstatus'
                ORDER BY e.enumsortorder
            """)
        ).scalars().all()

        required = {"UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"}

        if set(labels) == required:
            return

        # This migration assumes the legacy enum contains only the
        # known old values plus COMPLETED/CANCELLED.
        allowed_legacy = {
            "PENDING", "APPROVED", "REJECTED",
            "COMPLETED", "CANCELLED",
        }
        unexpected = set(labels) - allowed_legacy
        if unexpected:
            raise RuntimeError(
                f"Unexpected eventstatus values: {sorted(unexpected)}"
            )

        # Rename the old type so the replacement can use its original name.
        connection.execute(
            text("ALTER TYPE eventstatus RENAME TO eventstatus_legacy")
        )

        connection.execute(
            text("""
                CREATE TYPE eventstatus AS ENUM (
                    'UPCOMING',
                    'ONGOING',
                    'COMPLETED',
                    'CANCELLED'
                )
            """)
        )

        connection.execute(
            text("""
                ALTER TABLE events
                ALTER COLUMN status DROP DEFAULT
            """)
        )

        connection.execute(
            text("""
                ALTER TABLE events
                ALTER COLUMN status TYPE eventstatus
                USING (
                    CASE status::text
                        WHEN 'PENDING' THEN 'UPCOMING'
                        WHEN 'APPROVED' THEN 'UPCOMING'
                        WHEN 'REJECTED' THEN 'CANCELLED'
                        ELSE status::text
                    END
                )::eventstatus
            """)
        )

        connection.execute(
            text("""
                ALTER TABLE events
                ALTER COLUMN status SET DEFAULT 'UPCOMING'::eventstatus
            """)
        )

        connection.execute(text("DROP TYPE eventstatus_legacy"))


if __name__ == "__main__":
    migrate()
    print("Event status enum migration completed.")
