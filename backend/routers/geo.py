"""Geospatial Intelligence and Precision GIS router for NERA 2.0.

Provides:
- Reverse geocoding grounded in verified NER regional catalog
- Precision coordinate resolution
- Road segment risk boundaries
"""

import math
from typing import Any, Optional
from fastapi import APIRouter, Query
from backend.database.db import get_db

router = APIRouter(prefix="/api/geo", tags=["Geospatial Intelligence"])


@router.get("/reverse-geocode")
def reverse_geocode(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude"),
) -> dict[str, Any]:
    """Resolve geographic coordinates to nearest NER settlement, road corridor, or landmark.
    
    Data Transparency:
    - Never fabricates addresses.
    - Resolves from verified 8 NER states database records.
    - If coordinate falls outside verified catalog, returns 'Address unavailable — coordinates available'.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Check nearest village
        cursor.execute("SELECT id, name, district, state_code, lat, lng FROM villages")
        villages = [dict(r) for r in cursor.fetchall()]

        best_village: Optional[dict[str, Any]] = None
        min_v_dist = float("inf")
        for v in villages:
            d = math.hypot((v["lat"] - lat), (v["lng"] - lng)) * 111.0
            if d < min_v_dist:
                min_v_dist = d
                best_village = v

        # 2. Check nearest landmark / critical infrastructure shelter
        cursor.execute("SELECT id, name, category, state_code, lat, lng FROM infrastructure_points")
        infra_pts = [dict(r) for r in cursor.fetchall()]

        best_infra: Optional[dict[str, Any]] = None
        min_i_dist = float("inf")
        for ip in infra_pts:
            d = math.hypot((ip["lat"] - lat), (ip["lng"] - lng)) * 111.0
            if d < min_i_dist:
                min_i_dist = d
                best_infra = ip

        # 3. Check nearest arterial highway
        cursor.execute("SELECT id, highway_code, name, state_code, lat, lng FROM roads")
        roads = [dict(r) for r in cursor.fetchall()]

        best_road: Optional[dict[str, Any]] = None
        min_r_dist = float("inf")
        for r in roads:
            d = math.hypot((r["lat"] - lat), (r["lng"] - lng)) * 111.0
            if d < min_r_dist:
                min_r_dist = d
                best_road = r

        # Regional threshold: 35 km covers mountain valley catchments in NER
        if best_village and min_v_dist <= 35.0:
            landmark = best_infra["name"] if (best_infra and min_i_dist <= 12.0) else None
            road_name = f"{best_road['highway_code']} ({best_road['name']})" if (best_road and min_r_dist <= 15.0) else None

            parts = [best_village["name"], best_village["district"], best_village["state_code"]]
            if landmark:
                parts.insert(0, f"Near {landmark}")

            return {
                "status": "AVAILABLE",
                "village": best_village["name"],
                "district": best_village["district"],
                "state": best_village["state_code"],
                "road": road_name,
                "nearby_landmark": landmark,
                "distance_km": round(min_v_dist, 2),
                "formatted_address": ", ".join(parts),
                "data_status": "AVAILABLE",
            }

        return {
            "status": "UNAVAILABLE",
            "message": "Address unavailable — coordinates available",
            "data_status": "DATA NOT AVAILABLE",
        }


@router.get("/roads-segments")
def get_road_segments() -> list[dict[str, Any]]:
    """Return verified road segments with exact start/end coordinates, 12 risk attributes, and blockage confirmation."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, highway_code, name, state_code, district, vulnerable_stretch_km, status,
                   elevation_m, lat, lng,
                   segment_km_start, segment_km_end, start_lat, start_lng, end_lat, end_lng,
                   risk_score, risk_level, rain_24h, soil_moisture, slope,
                   landslide_status, road_status, last_updated, data_status
            FROM roads
            """
        )
        roads = [dict(r) for r in cursor.fetchall()]

        # Query confirmed verified incident reports to check for real ground blockage
        cursor.execute("SELECT * FROM reports WHERE status = 'verified'")
        verified_reports = [dict(r) for r in cursor.fetchall()]

        results = []
        for r in roads:
            # Check if road status is explicitly BLOCKED or any verified report confirms road blockage
            has_verified_blockage = (r.get("status") == "BLOCKED" or r.get("road_status") == "BLOCKED")
            if not has_verified_blockage:
                for vr in verified_reports:
                    v_lat, v_lng = vr.get("lat"), vr.get("lng")
                    if v_lat is not None and v_lng is not None:
                        dist_km = math.hypot((v_lat - r["lat"]), (v_lng - r["lng"])) * 111.0
                        itype = (vr.get("incident_type") or "").lower()
                        desc = (vr.get("description") or "").lower()
                        if dist_km <= 25.0 and ("block" in itype or "block" in desc or "impassable" in desc):
                            has_verified_blockage = True
                            r["landslide_status"] = f"Confirmed Blockage ({vr.get('incident_type')})"
                            break

            r["is_blocked"] = has_verified_blockage
            if has_verified_blockage:
                r["road_status"] = "BLOCKED"
                r["risk_level"] = "Critical"
                if (r.get("risk_score") or 0) < 80:
                    r["risk_score"] = 85

            results.append(r)

        return results


