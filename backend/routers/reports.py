"""Citizen Incident Reporting endpoints with GPS, media upload, and officer verification."""

import base64
from datetime import datetime, timezone
from pathlib import Path
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from backend.auth.dependencies import require_officer_or_admin
from backend.config import settings
from backend.database.db import get_db
from backend.models.schemas import MediaUploadRequest, ReportCreate, ReportOut, ReportVerify

router = APIRouter(prefix="/api/reports", tags=["Citizen Reporting"])


def _enrich_report_geo(report_dict: dict, conn) -> dict:
    """Enrich a report with nearest location, state, and district from database seeds."""
    lat = report_dict.get("lat")
    lng = report_dict.get("lng")
    if lat is None or lng is None:
        return report_dict

    cursor = conn.cursor()
    # Find nearest state
    cursor.execute(
        "SELECT name, short FROM states ORDER BY ((lat - ?)*(lat - ?) + (lng - ?)*(lng - ?)) ASC LIMIT 1",
        (lat, lat, lng, lng),
    )
    s_row = cursor.fetchone()
    state_name = s_row["name"] if s_row else "North Eastern Region"

    # Find nearest village / district
    cursor.execute(
        "SELECT name, district FROM villages ORDER BY ((lat - ?)*(lat - ?) + (lng - ?)*(lng - ?)) ASC LIMIT 1",
        (lat, lat, lng, lng),
    )
    v_row = cursor.fetchone()
    if v_row:
        district = v_row["district"]
        location = f"{v_row['name']}, {district}"
    else:
        district = "District Sector"
        location = f"{state_name} Hills"

    report_dict["location"] = location
    report_dict["district"] = district
    report_dict["state"] = state_name
    return report_dict


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def submit_report(req: ReportCreate):
    """Submit a ground landslide incident report with GPS coordinates and optional media."""
    now_iso = datetime.now(timezone.utc).isoformat()
    report_id = f"rep-{uuid.uuid4().hex[:12]}"

    with get_db() as conn:
        cursor = conn.cursor()
        # If offline_client_id provided, avoid duplicate insertions
        if req.offline_client_id:
            cursor.execute("SELECT id FROM reports WHERE offline_client_id = ?", (req.offline_client_id,))
            existing = cursor.fetchone()
            if existing:
                cursor.execute("SELECT * FROM reports WHERE id = ?", (existing["id"],))
                return _enrich_report_geo(dict(cursor.fetchone()), conn)

        cursor.execute(
            """
            INSERT INTO reports (
                id, citizen_name, contact, incident_type, description,
                lat, lng, media_url, status, offline_client_id, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
            """,
            (
                report_id,
                req.citizen_name.strip(),
                req.contact.strip() if req.contact else None,
                req.incident_type,
                req.description.strip(),
                req.lat,
                req.lng,
                req.media_url,
                req.offline_client_id,
                now_iso,
            ),
        )

        cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
        return _enrich_report_geo(dict(cursor.fetchone()), conn)


class BatchReportsRequest(BaseModel):
    reports: list[ReportCreate]


@router.post("/batch-sync", response_model=list[ReportOut])
def batch_sync_reports(req: BatchReportsRequest):
    """Sync multiple reports queued in the frontend offline IndexedDB."""
    synced: list[dict] = []
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        for item in req.reports:
            # Check duplicate by offline_client_id
            if item.offline_client_id:
                cursor.execute("SELECT * FROM reports WHERE offline_client_id = ?", (item.offline_client_id,))
                existing = cursor.fetchone()
                if existing:
                    synced.append(_enrich_report_geo(dict(existing), conn))
                    continue

            report_id = f"rep-{uuid.uuid4().hex[:12]}"
            cursor.execute(
                """
                INSERT INTO reports (
                    id, citizen_name, contact, incident_type, description,
                    lat, lng, media_url, status, offline_client_id, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
                """,
                (
                    report_id,
                    item.citizen_name.strip(),
                    item.contact.strip() if item.contact else None,
                    item.incident_type,
                    item.description.strip(),
                    item.lat,
                    item.lng,
                    item.media_url,
                    item.offline_client_id,
                    now_iso,
                ),
            )
            cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
            synced.append(_enrich_report_geo(dict(cursor.fetchone()), conn))

    return synced


@router.post("/upload")
def upload_media(req: MediaUploadRequest):
    """Upload photo or video documentation of a landslide incident (Base64 encoded)."""
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov"}
    suffix = Path(req.filename or "incident.jpg").suffix.lower()

    if not suffix or suffix not in allowed_extensions:
        suffix = ".jpg"

    file_id = f"{uuid.uuid4().hex[:16]}{suffix}"
    dest_path = settings.UPLOAD_DIR / file_id

    try:
        # Strip data URL header if present (e.g. "data:image/jpeg;base64,...")
        raw_b64 = req.data_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]

        file_bytes = base64.b64decode(raw_b64)
        with open(dest_path, "wb") as buffer:
            buffer.write(file_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to decode and save media file: {str(e)}",
        )

    media_url = f"/uploads/{file_id}"
    return {"media_url": media_url, "filename": file_id}


@router.get("", response_model=list[ReportOut])
def list_reports(
    status: str | None = None,
    limit: int = 50
):
    """List ground landslide reports submitted by citizens and field staff."""
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM reports WHERE 1=1"
        params = []
        if status:
            query += " AND status = ?"
            params.append(status.lower().strip())
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [_enrich_report_geo(dict(r), conn) for r in rows]


@router.get("/daily-summary")
def get_daily_risk_summary():
    """Generate daily regional landslide risk summary report."""
    now_iso = datetime.now(timezone.utc).isoformat()
    now_formatted = datetime.now(timezone.utc).strftime("%d %B %Y")
    data_mode = "Live / Real Data" if settings.is_weather_configured() else "Demo / Data source not connected"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name, short, score, level, rain, alerts, soil, slope, elevation FROM states ORDER BY score DESC")
        states = [dict(s) for s in cursor.fetchall()]

        cursor.execute("SELECT id, state, location, level, reason, action, time FROM alerts WHERE status = 'ACTIVE' LIMIT 10")
        active_alerts = [dict(a) for a in cursor.fetchall()]

        cursor.execute("SELECT count(*) as count FROM reports WHERE status = 'verified'")
        verified_count = cursor.fetchone()["count"]

        high_critical = [s for s in states if s["level"] in ("High", "Critical")]
        avg_score = round(sum(s["score"] for s in states) / max(1, len(states)))
        avg_rain = round(sum(s["rain"] for s in states) / max(1, len(states)), 1)
        avg_soil = round(sum(s["soil"] for s in states) / max(1, len(states)), 1)

        return {
            "report_type": "Daily Regional Landslide Risk Assessment",
            "date": now_formatted,
            "generated_at": now_iso,
            "data_status": data_mode,
            "regional_score": avg_score,
            "regional_level": "Critical" if avg_score >= 80 else ("High" if avg_score >= 60 else "Moderate"),
            "states_at_risk_count": len(high_critical),
            "total_states_monitored": len(states),
            "active_alerts_count": len(active_alerts),
            "verified_reports_count": verified_count,
            "regional_averages": {
                "rainfall_24h_mm": avg_rain,
                "soil_moisture_pct": avg_soil,
                "risk_score": avg_score,
            },
            "priority_zones": [
                {
                    "state": s["name"],
                    "short": s["short"],
                    "score": s["score"],
                    "level": s["level"],
                    "rain": s["rain"],
                    "soil": s["soil"],
                }
                for s in high_critical
            ],
            "active_advisories": active_alerts,
            "directive": "District disaster management authorities in Sikkim and Arunachal Pradesh to maintain emergency response clearance teams and monitor national highway arterial routes.",
        }


@router.get("/weekly-summary")
def get_weekly_risk_summary():
    """Generate 7-day cumulative risk trend and advisory review report."""
    now_iso = datetime.now(timezone.utc).isoformat()
    now_formatted = datetime.now(timezone.utc).strftime("%d %B %Y")
    data_mode = "Live / Real Data" if settings.is_weather_configured() else "Demo / Data source not connected"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT highway_code, name, state_code, vulnerable_stretch_km, status FROM roads ORDER BY vulnerable_stretch_km DESC")
        roads = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT location, state_code, date, severity, trigger FROM historical_landslides LIMIT 5")
        historical = [dict(h) for h in cursor.fetchall()]

        seven_day_trend = [
            {"day": "Mon", "mm": 28, "risk": "Moderate", "pct": 31},
            {"day": "Tue", "mm": 39, "risk": "Moderate", "pct": 43},
            {"day": "Wed", "mm": 23, "risk": "Low", "pct": 26},
            {"day": "Thu", "mm": 50, "risk": "High", "pct": 55},
            {"day": "Fri", "mm": 35, "risk": "Moderate", "pct": 39},
            {"day": "Sat", "mm": 61, "risk": "High", "pct": 68},
            {"day": "Today", "mm": 86, "risk": "High", "pct": 91},
        ]
        cumulative_rain = sum(d["mm"] for d in seven_day_trend)

        return {
            "report_type": "Weekly Landslide Risk & Trend Summary",
            "date": now_formatted,
            "generated_at": now_iso,
            "data_status": data_mode,
            "period": "Past 7 Days (Rolling Window)",
            "seven_day_trend": seven_day_trend,
            "cumulative_rainfall_mm": cumulative_rain,
            "arterial_corridors_monitored": roads,
            "recent_reference_events": historical,
            "advisory_outlook": "Sub-Himalayan monsoon trough continues to saturate cut-slopes along NH-10 and NH-13. Weekly slope deformation rate shows heightened activity in North Sikkim and Upper Subansiri.",
        }


@router.get("/state-wise")
def get_state_wise_risk_summary():
    """Generate official situation register for all 8 NER states."""
    now_iso = datetime.now(timezone.utc).isoformat()
    now_formatted = datetime.now(timezone.utc).strftime("%d %B %Y")
    data_mode = "Live / Real Data" if settings.is_weather_configured() else "Demo / Data source not connected"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT name, short, score, level, rain, soil, slope, elevation, alerts, updated, event
            FROM states
            ORDER BY score DESC
            """
        )
        states = [dict(s) for s in cursor.fetchall()]

        return {
            "report_type": "8-State Comprehensive Situation Register",
            "date": now_formatted,
            "generated_at": now_iso,
            "data_status": data_mode,
            "total_states": len(states),
            "states": states,
        }


@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: str):
    """Retrieve details for a specific report."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
        return _enrich_report_geo(dict(row), conn)


@router.patch("/{report_id}/verify", response_model=ReportOut)
def verify_report(
    report_id: str,
    req: ReportVerify,
    officer: dict = Depends(require_officer_or_admin)
):
    """Verify or reject a citizen incident report (Field/District Officer or Admin only)."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

        cursor.execute(
            """
            UPDATE reports
            SET status = ?, verified_by = ?, officer_notes = ?, updated_at = ?
            WHERE id = ?
            """,
            (req.status, officer["id"], req.officer_notes, now_iso, report_id),
        )

        cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
        return _enrich_report_geo(dict(cursor.fetchone()), conn)
