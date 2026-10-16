from fastapi import Depends, HTTPException, status

from app.core.current_user import get_current_profile
from app.models.user import User, UserRole


def require_roles(*allowed_roles: UserRole):
    def role_checker(user: User = Depends(get_current_profile)) -> User:
        if user.role not in allowed_roles:
            allowed = ", ".join(role.value for role in allowed_roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {allowed}",
            )
        return user

    return role_checker
