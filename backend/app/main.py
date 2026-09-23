from fastapi import FastAPI
from sqlalchemy import text

from app.database.session import engine


app = FastAPI(
    title="EventHub API",
    description="Backend API for the EventHub campus event management platform",
    version="0.1.0",
)


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
