from app.database.base import Base
from app.database.session import engine
from app.models import Club, Event


def init_db():
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print("P2 database tables created successfully")
