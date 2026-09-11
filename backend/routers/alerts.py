"""Alerts management endpoints for creation, listing, updating, and resolving advisories."""

from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from backend.auth.dependencies import require_admin, require_officer_or_admin
from backend.database.db import get_db
from backend.models.schemas import (
    AlertCreate,
    AlertOut,
    AlertUpdate,
    EmergencyTriggerRequest,
    EmergencyTriggerResponse,
)
from backend.services.providers import ProviderService

router = APIRouter(prefix="/api/alerts", tags=["Alerts & Early Warning"])


@router.get("", response_model=list[AlertOut])
def list_alerts(
    status: str | None = "ACTIVE",
    state: str | None = None
):
    """Retrieve operational early warning advisories and watches."""
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT id, state, location, level, reason, action, time, status, delivery_status, created_at FROM alerts WHERE 1=1"
        params = []
        if status and status.lower() != "all":
            query += " AND UPPER(status) = ?"
            params.append(status.upper().strip())
        if state:
            query += " AND UPPER(state) LIKE ?"
            params.append(f"%{state.upper().strip()}%")
        query += " ORDER BY created_at DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


@router.post("", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
def create_alert(
    req: AlertCreate,
    officer: dict = Depends(require_officer_or_admin)
):
    """Issue a new landslide alert / advisory (Officer or Admin only)."""
    now_iso = datetime.now(timezone.utc).isoformat()
    alert_id = f"alert-{uuid.uuid4().hex[:8]}"

    # Check external delivery channels safely
    dispatch = ProviderService.dispatch_alert_notifications(
        alert_id=alert_id,
        state=req.state,
        location=req.location,
        level=req.level,
        reason=req.reason
    )

    if dispatch["fcm_delivered"] or dispatch["sms_delivered"]:
        delivery_status = "DISPATCHED_LIVE"
    else:
        delivery_status = "SIMULATED_DEMO"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO alerts (id, state, location, level, reason, action, time, status, delivery_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'Just now', 'ACTIVE', ?, ?)
            """,
            (
                alert_id,
                req.state.strip(),
                req.location.strip(),
                req.level,
                req.reason.strip(),
                req.action.strip(),
                delivery_status,
                now_iso,
            ),
        )
        cursor.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,))
        return dict(cursor.fetchone())


@router.patch("/{alert_id}", response_model=AlertOut)
def update_alert(
    alert_id: str,
    req: AlertUpdate,
    officer: dict = Depends(require_officer_or_admin)
):
    """Update an existing alert advisory (Officer or Admin only)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")

        current = dict(row)
        new_state = req.state if req.state is not None else current["state"]
        new_loc = req.location if req.location is not None else current["location"]
        new_level = req.level if req.level is not None else current["level"]
        new_reason = req.reason if req.reason is not None else current["reason"]
        new_action = req.action if req.action is not None else current["action"]
        new_status = req.status if req.status is not None else current["status"]

        cursor.execute(
            """
            UPDATE alerts
            SET state = ?, location = ?, level = ?, reason = ?, action = ?, status = ?
            WHERE id = ?
            """,
            (new_state, new_loc, new_level, new_reason, new_action, new_status, alert_id),
        )
        cursor.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,))
        return dict(cursor.fetchone())


@router.patch("/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(
    alert_id: str,
    officer: dict = Depends(require_officer_or_admin)
):
    """Mark an active alert as resolved once field situation clears (Officer or Admin only)."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")

        cursor.execute(
            """
            UPDATE alerts
            SET status = 'RESOLVED', resolved_at = ?
            WHERE id = ?
            """,
            (now_iso, alert_id),
        )
        cursor.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,))
        return dict(cursor.fetchone())


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    alert_id: str,
    admin: dict = Depends(require_admin)
):
    """Permanently remove an alert record (Admin only)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM alerts WHERE id = ?", (alert_id,))


@router.post("/emergency", response_model=EmergencyTriggerResponse, status_code=status.HTTP_201_CREATED)
def trigger_emergency_alert(req: EmergencyTriggerRequest):
    """Trigger an immediate Emergency SOS advisory (Public / Citizen access)."""
    now_iso = datetime.now(timezone.utc).isoformat()
    alert_id = f"alert-sos-{uuid.uuid4().hex[:8]}"

    # Resolve location and state
    state = req.state.strip() if req.state and req.state.strip() else "North Eastern Region"
    if req.location and req.location.strip():
        location = req.location.strip()
    elif req.lat is not None and req.lng is not None:
        location = f"GPS: {req.lat:.4f}° N, {req.lng:.4f}° E"
    else:
        location = "North Eastern Region (GPS Unavailable)"

    reason = f"EMERGENCY SOS: Citizen triggered emergency alert. {req.notes or ''}".strip()
    action = "Immediate SDRF/NDRF search and rescue dispatch and field verification required."

    # Dispatch notifications safely (simulated or live)
    dispatch = ProviderService.dispatch_alert_notifications(
        alert_id=alert_id,
        state=state,
        location=location,
        level="Critical",
        reason=reason
    )
    delivery_status = "DISPATCHED_LIVE" if (dispatch["fcm_delivered"] or dispatch["sms_delivered"]) else "SIMULATED_DEMO"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO alerts (id, state, location, level, reason, action, time, status, delivery_status, created_at)
            VALUES (?, ?, ?, 'Critical', ?, ?, 'Just now', 'ACTIVE', ?, ?)
            """,
            (
                alert_id,
                state,
                location,
                reason,
                action,
                delivery_status,
                now_iso,
            ),
        )
        return {
            "success": True,
            "alert_id": alert_id,
            "message": "Emergency alert sent successfully.",
            "location": location,
            "state": state,
            "level": "Critical",
            "delivery_status": delivery_status,
            "created_at": now_iso
        }

