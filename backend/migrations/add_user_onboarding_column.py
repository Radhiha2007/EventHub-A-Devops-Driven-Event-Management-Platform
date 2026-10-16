from sqlalchemy import inspect, text

from app.database.session import engine


def migrate():
    inspector = inspect(engine)

    if "users" not in inspector.get_table_names():
        raise RuntimeError(
            "The users table does not exist. Initialize the database first."
        )

    columns = {
        column["name"]
        for column in inspector.get_columns("users")
    }

    if "onboarding_completed" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN onboarding_completed BOOLEAN "
                    "NOT NULL DEFAULT FALSE"
                )
            )
        print("Added users.onboarding_completed.")
    else:
        print("users.onboarding_completed already exists; no change needed.")


if __name__ == "__main__":
    migrate()
