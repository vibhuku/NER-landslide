"""AI/ML Landslide Prediction endpoints."""

from fastapi import APIRouter, HTTPException, status
from backend.database.db import get_db
from backend.models.schemas import PredictionInput, PredictionOutput
from backend.services.prediction_engine import LandslidePredictionEngine

router = APIRouter(prefix="/api/predictions", tags=["AI/ML Predictions"])


@router.post("/evaluate", response_model=PredictionOutput)
def evaluate_risk(req: PredictionInput):
    """Evaluate multi-factor geotechnical and hydro-meteorological inputs using the AI prediction engine."""
    result = LandslidePredictionEngine.evaluate(
        rainfall_24h_mm=req.rainfall_24h_mm,
        soil_moisture_pct=req.soil_moisture_pct,
        slope_deg=req.slope_deg,
        elevation_m=req.elevation_m,
        historical_events_count=req.historical_events_count,
        satellite_insar_velocity_mm_yr=req.satellite_insar_velocity_mm_yr or 0.0,
    )
    return result


@router.get("/state/{state_code}", response_model=PredictionOutput)
def get_state_prediction(state_code: str):
    """Run model prediction using latest monitored parameters for a specified NER state."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM states WHERE UPPER(short) = ?", (state_code.upper().strip(),))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"State '{state_code}' not found.")

        state = dict(row)
        # Parse slope degree string e.g. "31°" -> 31.0
        try:
            slope_num = float(state["slope"].replace("°", "").strip())
        except ValueError:
            slope_num = 25.0

        # Parse elevation string e.g. "1,720 m" -> 1720.0
        try:
            elev_clean = state["elevation"].replace("m", "").replace(",", "").strip()
            elev_num = float(elev_clean)
        except ValueError:
            elev_num = 1200.0

        # Check historical count in this state
        cursor.execute("SELECT count(*) as cnt FROM historical_landslides WHERE UPPER(state_code) = ?", (state_code.upper().strip(),))
        hist_cnt = cursor.fetchone()["cnt"]

        result = LandslidePredictionEngine.evaluate(
            rainfall_24h_mm=float(state["rain"]),
            soil_moisture_pct=float(state["soil"]),
            slope_deg=slope_num,
            elevation_m=elev_num,
            historical_events_count=hist_cnt,
            satellite_insar_velocity_mm_yr=2.4 if state["level"] in ("High", "Critical") else 0.5,
        )
        return result

