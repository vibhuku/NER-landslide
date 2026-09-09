"""Risk data endpoints for the 8 North Eastern Region (NER) states."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from backend.auth.dependencies import require_officer_or_admin
from backend.database.db import get_db
from backend.models.schemas import RegionalStatus, StateRiskData

router = APIRouter(prefix="/api/risk-data", tags=["Risk Data"])


class StateRiskUpdate(BaseModel):
    score: int | None = None
    level: str | None = None
    rain: float | None = None
    soil: float | None = None
    event: str | None = None


@router.get("/states", response_model=list[StateRiskData])
def get_all_states():
    """Retrieve current landslide risk metrics for all 8 NER states."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT short, name, score, level, rain, alerts, lat, lng, soil, slope, elevation, updated, event, data_status
            FROM states
            ORDER BY score DESC
            """
        )
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


@router.get("/states/{state_code}", response_model=StateRiskData)
def get_state(state_code: str):
    """Retrieve risk assessment for a specific NER state."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT short, name, score, level, rain, alerts, lat, lng, soil, slope, elevation, updated, event, data_status
            FROM states
            WHERE UPPER(short) = ? OR UPPER(name) = ?
            """,
            (state_code.upper().strip(), state_code.upper().strip()),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"State '{state_code}' not found in NER catalog.")
        return dict(row)


@router.patch("/states/{state_code}", response_model=StateRiskData)
def update_state_risk(state_code: str, req: StateRiskUpdate, officer: dict = Depends(require_officer_or_admin)):
    """Update risk variables for a state (Officer/Admin only)."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM states WHERE UPPER(short) = ?", (state_code.upper().strip(),))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="State not found.")

        current = dict(existing)
        new_score = req.score if req.score is not None else current["score"]
        new_level = req.level if req.level is not None else current["level"]
        new_rain = req.rain if req.rain is not None else current["rain"]
        new_soil = req.soil if req.soil is not None else current["soil"]
        new_event = req.event if req.event is not None else current["event"]

        cursor.execute(
            """
            UPDATE states
            SET score = ?, level = ?, rain = ?, soil = ?, event = ?, updated = 'Just now', updated_at = ?
            WHERE UPPER(short) = ?
            """,
            (new_score, new_level, new_rain, new_soil, new_event, now_iso, state_code.upper().strip()),
        )

        cursor.execute("SELECT * FROM states WHERE UPPER(short) = ?", (state_code.upper().strip(),))
        return dict(cursor.fetchone())


@router.get("/regional-status", response_model=RegionalStatus)
def get_regional_status():
    """Aggregate real-time metrics for top dashboard status strip."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT score, level, alerts FROM states")
        states = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT count(*) as total_alerts FROM alerts WHERE status = 'ACTIVE'")
        alert_row = cursor.fetchone()
        active_alerts = alert_row["total_alerts"] if alert_row else 0

        high_risk_count = sum(1 for s in states if s["level"] in ("High", "Critical"))
        critical_count = sum(1 for s in states if s["level"] == "Critical")

        regional_assessment = "Elevated risk" if critical_count > 0 or high_risk_count >= 2 else "Normal seasonal risk"

        return {
            "regional_assessment": regional_assessment,
            "districts_attention_count": high_risk_count,
            "active_alerts_count": active_alerts,
            "high_risk_locations_count": high_risk_count,
            "rainfall_status": "Above normal",
            "rainfall_anomaly_24h": "+18% 24h regional anomaly",
            "data_freshness_min": 12,
            "data_mode": "Demo / Simulated baseline",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

