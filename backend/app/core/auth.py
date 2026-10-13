from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError

from app.core.config import settings


bearer_scheme = HTTPBearer(auto_error=False)

API_CLIENT_ID = settings.ENTRA_API_CLIENT_ID
METADATA_URL = settings.ENTRA_METADATA_URL
AUDIENCE = API_CLIENT_ID


@lru_cache(maxsize=1)
def get_openid_configuration() -> dict:
    import json
    from urllib.request import urlopen

    with urlopen(METADATA_URL, timeout=10) as response:
        return json.load(response)


@lru_cache(maxsize=1)
def get_jwks_client() -> PyJWKClient:
    configuration = get_openid_configuration()
    return PyJWKClient(configuration["jwks_uri"])


def validate_access_token(token: str) -> dict:
    try:
        signing_key = get_jwks_client().get_signing_key_from_jwt(token)

        # Verify signature, expiry and audience before trusting any claims.
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=AUDIENCE,
            options={
                "require": ["exp", "iss", "aud", "tid", "ver"],
                "verify_iss": False,
            },
        )

        tenant_id = claims.get("tid")
        token_version = claims.get("ver")

        if not isinstance(tenant_id, str) or not tenant_id:
            raise InvalidTokenError("Missing tenant ID")

        if token_version != "2.0":
            raise InvalidTokenError("Unsupported token version")

        # Derive the expected issuer only from the verified tenant claim.
        expected_issuer = (
            f"https://login.microsoftonline.com/{tenant_id}/v2.0"
        )
        if claims.get("iss") != expected_issuer:
            raise InvalidTokenError("Issuer does not match token tenant")

        scopes = claims.get("scp", "").split()
        if "access_as_user" not in scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Required API scope is missing",
            )

        return claims

    except HTTPException:
        raise
    except InvalidTokenError as exc:
        print(f"Microsoft token validation failed: {type(exc).__name__}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Microsoft access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except Exception as exc:
        print(f"Microsoft token verification error: {type(exc).__name__}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to verify Microsoft access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer access token required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return validate_access_token(credentials.credentials)
