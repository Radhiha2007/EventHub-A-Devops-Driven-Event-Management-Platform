from sqlalchemy import inspect, text

from app.database.session import engine


def migrate():
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    if "feedback" not in tables or "users" not in tables:
        raise RuntimeError(
            "Initialize the database tables before migrating feedback."
        )

    columns = {
        column["name"]
        for column in inspector.get_columns("feedback")
    }

    with engine.begin() as connection:
        if "user_id" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE feedback "
                    "ADD COLUMN user_id UUID "
                    "REFERENCES users(id) ON DELETE SET NULL"
                )
            )

    inspector = inspect(engine)
    constraints = {
        item["name"]
        for item in inspector.get_unique_constraints("feedback")
    }
    indexes = {
        item["name"]
        for item in inspector.get_indexes("feedback")
    }

    if (
        "uq_feedback_event_user" not in constraints
        and "uq_feedback_event_user" not in indexes
    ):
        with engine.begin() as connection:
            connection.execute(
                text(
                    "CREATE UNIQUE INDEX uq_feedback_event_user "
                    "ON feedback(event_id, user_id)"
                )
            )

    print("Feedback user identity migration completed.")


if __name__ == "__main__":
    migrate()