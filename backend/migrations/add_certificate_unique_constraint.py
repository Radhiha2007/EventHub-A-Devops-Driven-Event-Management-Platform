from sqlalchemy import inspect, text

from app.database.session import engine


def migrate():
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    if "certificates" not in tables:
        raise RuntimeError(
            "The certificates table does not exist. Initialize the database first."
        )

    inspector = inspect(engine)
    indexes = {
        index["name"]
        for index in inspector.get_indexes("certificates")
    }
    constraints = {
        constraint["name"]
        for constraint in inspector.get_unique_constraints("certificates")
    }

    index_name = "uq_certificate_event_recipient"

    if index_name in indexes or index_name in constraints:
        print("Certificate event-recipient uniqueness already exists.")
        return

    with engine.begin() as connection:
        duplicates = connection.execute(
            text("""
                SELECT event_id, recipient_id, COUNT(*) AS total
                FROM certificates
                GROUP BY event_id, recipient_id
                HAVING COUNT(*) > 1
                LIMIT 10
            """)
        ).fetchall()

        if duplicates:
            raise RuntimeError(
                "Duplicate certificates already exist for the same event "
                "and recipient. Resolve them before applying the unique index. "
                f"Examples: {duplicates}"
            )

        connection.execute(
            text("""
                CREATE UNIQUE INDEX uq_certificate_event_recipient
                ON certificates (event_id, recipient_id)
            """)
        )

    print("Certificate event-recipient uniqueness is ready.")


if __name__ == "__main__":
    migrate()
