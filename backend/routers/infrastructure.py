"""Infrastructure endpoints: vulnerable villages and highway corridors."""

from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from backend.auth.dependencies import require_officer_or_admin
from backend.database.db import get_db
from backend.models.schemas import RoadOut, VillageOut

router = APIRouter(prefix="/api", tags=["Infrastructure"])


class RoadStatusUpdate(BaseModel):
    status: Literal["OPEN", "RESTRICTED", "BLOCKED", "MONITORED"]


@router.get("/villages", response_model=list[VillageOut])
def get_villages(
    state_code: str | None = None,
    risk_level: str | None = None
):
    """Retrieve catalog of vulnerable hill villages across the 8 NER states."""
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT id, name, state_code, district, population, slope_deg, risk_score, risk_level, lat, lng FROM villages WHERE 1=1"
        params = []
        if state_code:
            query += " AND UPPER(state_code) = ?"
            params.append(state_code.upper().strip())
        if risk_level:
            query += " AND UPPER(risk_level) = ?"
            params.append(risk_level.upper().strip())
        query += " ORDER BY risk_score DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


@router.get("/roads", response_model=list[RoadOut])
def get_roads(
    state_code: str | None = None,
    status: str | None = None
):
    """Retrieve vulnerable road corridors, national highways, and blockage status."""
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT id, highway_code, name, state_code, vulnerable_stretch_km, status, elevation_m, lat, lng FROM roads WHERE 1=1"
        params = []
        if state_code:
            query += " AND UPPER(state_code) = ?"
            params.append(state_code.upper().strip())
        if status:
            query += " AND UPPER(status) = ?"
            params.append(status.upper().strip())
        query += " ORDER BY vulnerable_stretch_km DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


@router.patch("/roads/{road_id}/status", response_model=RoadOut)
def update_road_status(
    road_id: str,
    req: RoadStatusUpdate,
    officer: dict = Depends(require_officer_or_admin)
):
    """Update operational status of a highway corridor (Officer/Admin only)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM roads WHERE id = ?", (road_id,))
        road = cursor.fetchone()
        if not road:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Road corridor not found.")

        cursor.execute("UPDATE roads SET status = ? WHERE id = ?", (req.status, road_id))
        cursor.execute("SELECT * FROM roads WHERE id = ?", (road_id,))
        return dict(cursor.fetchone())
