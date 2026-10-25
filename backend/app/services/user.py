from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User


def get_or_create_user(db: Session, claims: dict) -> User:
    tenant_id = claims.get("tid")
    object_id = claims.get("oid")

    if (
        not isinstance(tenant_id, str)
        or not tenant_id
        or not isinstance(object_id, str)
        or not object_id
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Microsoft identity claims are missing",
        )

    user = (
        db.query(User)
        .filter(
            User.entra_tenant_id == tenant_id,
            User.entra_object_id == object_id,
        )
        .one_or_none()
    )

    email = claims.get("preferred_username") or claims.get("email")
    full_name = claims.get("name")

    if user is None:
        user = User(
            entra_tenant_id=tenant_id,
            entra_object_id=object_id,
            email=email,
            full_name=full_name,
        )
        db.add(user)

        try:
            db.commit()
            db.refresh(user)
        except IntegrityError:
            db.rollback()
            user = (
                db.query(User)
                .filter(
                    User.entra_tenant_id == tenant_id,
                    User.entra_object_id == object_id,
                )
                .one_or_none()
            )
            if user is None:
                raise
        except Exception:
            db.rollback()
            raise
    else:
        changed = False

        if email and user.email != email:
            user.email = email
            changed = True

        if full_name and user.full_name != full_name:
            user.full_name = full_name
            changed = True

        if changed:
            try:
                db.commit()
                db.refresh(user)
            except Exception:
                db.rollback()
                raise

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This user account is inactive",
        )

    return user
