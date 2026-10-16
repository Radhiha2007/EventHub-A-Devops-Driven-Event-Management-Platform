from fastapi import HTTPException, status

from app.models.user import User


def require_club_email_access(user: User, club_contact_email: str | None) -> None:
    """Require the verified Club account email to match the club profile email."""
    account_email = (user.email or "").strip().casefold()
    club_email = (club_contact_email or "").strip().casefold()
    if not account_email or not club_email or account_email != club_email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This Club account is not authorized to manage this club",
        )
