from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.services.user import get_or_create_user


def get_current_profile(
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    return get_or_create_user(db, claims)
