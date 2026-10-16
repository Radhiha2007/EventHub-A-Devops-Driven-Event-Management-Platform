from sqlalchemy import inspect, text

from app.database.session import engine


def migrate():
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "registrations" not in tables or "users" not in tables:
        raise RuntimeError(
            "Initialize the database tables before linking registrations to users."
        )

    columns = {column["name"] for column in inspector.get_columns("registrations")}
    if "user_id" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE registrations "
                    "ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL"
                )
            )

    current_inspector = inspect(engine)
    indexes = {index["name"] for index in current_inspector.get_indexes("registrations")}
    constraints = {
        constraint["name"]
        for constraint in current_inspector.get_unique_constraints("registrations")
    }
    if "uq_registration_event_user" not in indexes and "uq_registration_event_user" not in constraints:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "CREATE UNIQUE INDEX uq_registration_event_user "
                    "ON registrations(event_id, user_id)"
                )
            )

    print("Registration user identity link is ready.")


if __name__ == "__main__":
    migrate()
