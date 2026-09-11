"""NERA 2.0 - FastAPI Application Entrypoint.

AI-Based Landslide Early Warning & Risk Monitoring System for North East India.
"""

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.database.init_db import init_database
from backend.routers import (
    advanced,
    alerts,
    analytics,
    auth,
    data_sources,
    geo,
    infrastructure,
    predictions,
    reports,
    risk_data,
    users,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ensure database tables and baseline seeds are initialized on startup."""
    init_database()
    yield


app = FastAPI(
    title="NERA 2.0 API",
    description="Operational Landslide Early Warning and Risk Monitoring Platform for the 8 North Eastern Region States.",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS if settings.ALLOWED_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(risk_data.router)
app.include_router(infrastructure.router)
app.include_router(reports.router)
app.include_router(alerts.router)
app.include_router(predictions.router)
app.include_router(analytics.router)
app.include_router(data_sources.router)
app.include_router(advanced.router)
app.include_router(geo.router)


@app.get("/api/health", tags=["Health"])
def health_check():
    """System health check and operational status."""
    return {
        "status": "HEALTHY",
        "service": "NERA 2.0 Backend",
        "version": "2.0.0",
        "region": "North Eastern Region (8 States)",
        "database": "CONNECTED",
        "weather_provider_connected": settings.is_weather_configured(),
        "nisar_provider_connected": settings.is_nisar_configured(),
        "fcm_provider_connected": settings.is_fcm_configured(),
        "sms_provider_connected": settings.is_sms_configured(),
    }


# Static mounts: uploads directory for citizen attachments
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")

# Mount frontend files at root (index.html, styles.css, app.js, data.js, services.js, offline-store.js)
static_root = Path(__file__).resolve().parent.parent
app.mount("/", StaticFiles(directory=str(static_root), html=True), name="frontend")

