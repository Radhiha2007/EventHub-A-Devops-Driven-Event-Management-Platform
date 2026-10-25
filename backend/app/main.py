
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import settings
from app.core.auth import get_current_user
from app.database.session import engine
from app.database.init_db import init_db
from app.routers.clubs import router as clubs_router
from app.routers.events import router as events_router
from app.routers.registrations import router as registrations_router
from app.routers.feedback import router as feedback_router
from app.routers.notifications import router as notifications_router
from app.routers.certificates import router as certificates_router
from app.routers.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="EventHub API",
    description="Backend API for the EventHub campus event management platform",
    version="0.1.0",
    lifespan=lifespan,
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clubs_router)
app.include_router(events_router)
app.include_router(registrations_router)
app.include_router(feedback_router)
app.include_router(notifications_router)
app.include_router(certificates_router)
app.include_router(users_router)


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
