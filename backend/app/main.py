from fastapi import Depends, FastAPI
from app.core.auth import get_current_user
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database.session import engine
from app.routers.clubs import router as clubs_router
from app.routers.events import router as events_router

app = FastAPI(
    title="EventHub API",
    description="Backend API for the EventHub campus event management platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clubs_router)
app.include_router(events_router)
@app.get("/auth/me")
def read_current_user(
    claims: dict = Depends(get_current_user),
):
    return {
        "authenticated": True,
        "user_id": claims.get("oid"),
        "tenant_id": claims.get("tid"),
        "name": claims.get("name"),
        "username": claims.get("preferred_username"),
        "scopes": claims.get("scp", "").split(),
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "eventhub-backend",
    }


@app.get("/health/db")
def database_health_check():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {
        "status": "healthy",
        "database": "connected",
    }
