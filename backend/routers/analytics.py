"""Analytics and historical landslide inventory endpoints."""

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from backend.auth.dependencies import require_officer_or_admin
from backend.database.db import get_db
from backend.models.schemas import HistoricalLandslideOut

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Historical Records"])


class HistoricalCreate(BaseModel):
    location: str
    state_code: str
    date: str
    severity: str
    trigger: str
    lat: float
    lng: float


@router.get("/summary")
def get_analytics_summary():
    """Retrieve comprehensive environmental metrics, regional score, and 7-day rainfall distribution."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT score, rain, soil FROM states")
        states = [dict(r) for r in cursor.fetchall()]

        avg_score = round(sum(s["score"] for s in states) / max(1, len(states)))
        avg_rain = round(sum(s["rain"] for s in states) / max(1, len(states)), 1)
        avg_soil = round(sum(s["soil"] for s in states) / max(1, len(states)), 1)

        rainfall_7_day = [
            {"day": "Mon", "mm": 28, "pct": 31},
            {"day": "Tue", "mm": 39, "pct": 43},
            {"day": "Wed", "mm": 23, "pct": 26},
            {"day": "Thu", "mm": 50, "pct": 55},
            {"day": "Fri", "mm": 35, "pct": 39},
            {"day": "Sat", "mm": 61, "pct": 68},
            {"day": "Today", "mm": 86, "pct": 91},
        ]

        return {
            "regional_risk_score": 68,
            "regional_risk_level": "HIGH",
            "average_state_score": avg_score,
            "weather_environment": {
                "rainfall_24h_mm": 86,
                "rainfall_anomaly": "+18% anomaly",
                "soil_moisture_pct": 72,
                "soil_moisture_label": "Elevated",
                "temperature_celsius": 23,
                "temperature_label": "−2°C normal",
                "humidity_pct": 89,
                "humidity_label": "High",
            },
            "rainfall_accumulation_7day": rainfall_7_day,
            "model_inputs_description": "Model inputs: rainfall, soil moisture, slope, elevation, terrain, historical records and remote sensing observations.",
            "disclaimer": "Illustrative model output — not an authoritative live forecast.",
        }


@router.get("/historical", response_model=list[HistoricalLandslideOut])
def get_historical_records():
    """Retrieve reference catalog of documented past landslide events in the North East."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, location, state_code, date, severity, trigger, lat, lng FROM historical_landslides")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


@router.post("/historical", response_model=HistoricalLandslideOut, status_code=status.HTTP_201_CREATED)
def add_historical_record(req: HistoricalCreate, officer: dict = Depends(require_officer_or_admin)):
    """Add a verified historical landslide record into the training register (Officer/Admin only)."""
    import uuid
    record_id = f"hist-{uuid.uuid4().hex[:8]}"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO historical_landslides (id, location, state_code, date, severity, trigger, lat, lng)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record_id,
                req.location.strip(),
                req.state_code.upper().strip(),
                req.date.strip(),
                req.severity.strip(),
                req.trigger.strip(),
                req.lat,
                req.lng,
            ),
        )
        cursor.execute("SELECT * FROM historical_landslides WHERE id = ?", (record_id,))
        return dict(cursor.fetchone())

