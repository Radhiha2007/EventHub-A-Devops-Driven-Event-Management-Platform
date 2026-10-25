from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.core.current_user import get_current_profile
from app.database.session import get_db
from app.main import app
from app.models.user import User, UserRole


@pytest.fixture
def client():
    app.dependency_overrides[get_current_user] = lambda: {
        "tid": "test-tenant",
        "oid": str(uuid4()),
        "preferred_username": "student@example.com",
        "name": "Test Student",
    }

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_users_me_requires_authentication():
    previous_overrides = app.dependency_overrides.copy()
    app.dependency_overrides.clear()

    try:
        response = TestClient(app).get("/users/me")
        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)


def test_onboarding_rejects_invalid_role(client):
    response = client.post(
        "/users/me/onboarding",
        json={"role": "ADMIN"},
    )

    assert response.status_code == 422


def test_student_is_rejected_by_club_role_check():
    from fastapi import HTTPException
    from types import SimpleNamespace
    from app.core.permissions import require_roles

    student = SimpleNamespace(role=UserRole.STUDENT)
    checker = require_roles(UserRole.CLUB)

    with pytest.raises(HTTPException) as exc_info:
        checker(user=student)

    assert exc_info.value.status_code == 403


def test_club_role_check_allows_club_user():
    from types import SimpleNamespace
    from app.core.permissions import require_roles

    club_user = SimpleNamespace(role=UserRole.CLUB)
    checker = require_roles(UserRole.CLUB)

    assert checker(user=club_user) is club_user
