from uuid import UUID

from sqlalchemy.orm import Session

from app.models.club import Club
from app.schemas.club import ClubCreate, ClubUpdate


def create_club(db: Session, club_data: ClubCreate) -> Club:
    club = Club(**club_data.model_dump())

    db.add(club)
    db.commit()
    db.refresh(club)

    return club


def get_clubs(db: Session) -> list[Club]:
    return db.query(Club).order_by(Club.name).all()


def get_club(db: Session, club_id: UUID) -> Club | None:
    return db.query(Club).filter(Club.id == club_id).first()


def update_club(
    db: Session,
    club: Club,
    club_data: ClubUpdate,
) -> Club:
    update_data = club_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(club, field, value)

    db.commit()
    db.refresh(club)

    return club
