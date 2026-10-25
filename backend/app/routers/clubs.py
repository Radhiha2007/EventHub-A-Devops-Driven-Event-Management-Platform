from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.club_access import require_club_email_access
from app.core.permissions import require_roles
from app.models.user import User, UserRole
from app.database.session import get_db
from app.schemas.club import ClubCreate, ClubResponse, ClubUpdate
from app.services.club import create_club, get_club, get_clubs, update_club


router = APIRouter(
    prefix="/api/clubs",
    tags=["Clubs"],
)


@router.post(
    "",
    response_model=ClubResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_club_endpoint(
    club_data: ClubCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.CLUB)),
):
    require_club_email_access(user, club_data.contact_email)
    return create_club(db, club_data)


@router.get(
    "",
    response_model=list[ClubResponse],
)
def list_clubs(
    db: Session = Depends(get_db),
):
    return get_clubs(db)


@router.get(
    "/{club_id}",
    response_model=ClubResponse,
)
def get_club_endpoint(
    club_id: UUID,
    db: Session = Depends(get_db),
):
    club = get_club(db, club_id)

    if club is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found",
        )

    return club


@router.put(
    "/{club_id}",
    response_model=ClubResponse,
)
def update_club_endpoint(
    club_id: UUID,
    club_data: ClubUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.CLUB)),
):
    club = get_club(db, club_id)

    if club is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found",
        )

    require_club_email_access(user, club.contact_email)
    requested_contact_email = club_data.contact_email
    if requested_contact_email is not None and requested_contact_email.strip().casefold() != (user.email or "").strip().casefold():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The Club contact email must match the signed-in Club account",
        )
    return update_club(db, club, club_data)
