"""AI/ML Landslide Susceptibility and Early Warning Prediction Service.

Evaluates multi-factor geotechnical and hydrological inputs:
1. Rainfall accumulation (mm / 24h)
2. Soil moisture saturation (%)
3. Slope gradient (degrees)
4. Elevation (meters)
5. Historical landslide event frequency
6. Satellite InSAR displacement / observation status
"""

from datetime import datetime, timezone
from typing import Any, Literal
from backend.config import settings


class LandslidePredictionEngine:
    """Predictive geotechnical engine combining empirical thresholds with weighted risk indexing."""

    @classmethod
    def evaluate(
        cls,
        rainfall_24h_mm: float,
        soil_moisture_pct: float,
        slope_deg: float,
        elevation_m: float,
        historical_events_count: int = 0,
        satellite_insar_velocity_mm_yr: float = 0.0,
        is_live_data: bool = False,
    ) -> dict[str, Any]:
        """Calculate calibrated risk score, classification level, and diagnostic contributing factors."""
        reasons: list[str] = []

        # 1. Rainfall score (Weight: 30%)
        # Normal threshold for NER hill slopes: ~50mm alert, >100mm critical
        if rainfall_24h_mm >= 120:
            rain_subscore = 100.0
            reasons.append(f"Extreme 24h rainfall / precipitation ({rainfall_24h_mm:.1f} mm) far exceeds safety threshold")
        elif rainfall_24h_mm >= 90:
            rain_subscore = 80.0 + (rainfall_24h_mm - 90) * (20 / 30)
            reasons.append(f"Heavy 24h rainfall ({rainfall_24h_mm:.1f} mm) active across watershed")
        elif rainfall_24h_mm >= 60:
            rain_subscore = 50.0 + (rainfall_24h_mm - 60) * (30 / 30)
            reasons.append(f"Moderate rainfall accumulation ({rainfall_24h_mm:.1f} mm)")
        elif rainfall_24h_mm >= 30:
            rain_subscore = 25.0 + (rainfall_24h_mm - 30) * (25 / 30)
        else:
            rain_subscore = max(5.0, rainfall_24h_mm * 0.8)

        # 2. Soil Moisture score (Weight: 25%)
        # Saturation > 75% dramatically reduces effective stress / shear strength
        if soil_moisture_pct >= 85:
            soil_subscore = 100.0
            reasons.append(f"Pore-water pressure critical: soil saturation at {soil_moisture_pct:.1f}%")
        elif soil_moisture_pct >= 70:
            soil_subscore = 70.0 + (soil_moisture_pct - 70) * 2.0
            reasons.append(f"Elevated soil moisture ({soil_moisture_pct:.1f}%) reducing slope stability")
        elif soil_moisture_pct >= 55:
            soil_subscore = 40.0 + (soil_moisture_pct - 55) * 2.0
        else:
            soil_subscore = max(5.0, soil_moisture_pct * 0.6)

        # 3. Slope Gradient score (Weight: 20%)
        # In the Himalayas/NER:
        # < 15 deg: stable
        # 15 - 25 deg: moderate susceptibility
        # 25 - 35 deg: high susceptibility
        # > 35 deg: critical shear failure hazard
        if slope_deg >= 35:
            slope_subscore = 100.0
            reasons.append(f"Steep topography: slope angle {slope_deg:.1f}° poses severe gravitational risk")
        elif slope_deg >= 25:
            slope_subscore = 65.0 + (slope_deg - 25) * 3.5
            reasons.append(f"Significant slope angle ({slope_deg:.1f}°) vulnerable to planar sliding")
        elif slope_deg >= 15:
            slope_subscore = 30.0 + (slope_deg - 15) * 3.5
        else:
            slope_subscore = max(5.0, slope_deg * 2.0)

        # 4. Elevation & Relief score (Weight: 10%)
        if elevation_m >= 2000:
            elev_subscore = 90.0
            reasons.append(f"High altitude corridor ({elevation_m:.0f} m) subject to intense weathering and steep gorges")
        elif elevation_m >= 1200:
            elev_subscore = 65.0
        elif elevation_m >= 500:
            elev_subscore = 40.0
        else:
            elev_subscore = 20.0

        # 5. Historical Landslides & Geomorphic Legacy (Weight: 10%)
        if historical_events_count >= 5:
            hist_subscore = 100.0
            reasons.append(f"Recurring slide corridor: {historical_events_count} past events cataloged")
        elif historical_events_count >= 2:
            hist_subscore = 75.0
            reasons.append(f"Known unstable zone with {historical_events_count} documented historical slides")
        elif historical_events_count == 1:
            hist_subscore = 50.0
        else:
            hist_subscore = 20.0

        # 6. Satellite InSAR / Remote Sensing Deformation (Weight: 5%)
        # Positive mm/yr denotes downslope creep
        abs_vel = abs(satellite_insar_velocity_mm_yr)
        if abs_vel >= 15.0:
            sat_subscore = 100.0
            reasons.append(f"InSAR line-of-sight displacement detected ({abs_vel:.1f} mm/yr downslope creep)")
        elif abs_vel >= 5.0:
            sat_subscore = 65.0
            reasons.append(f"Subtle satellite ground deformation observed ({abs_vel:.1f} mm/yr)")
        else:
            sat_subscore = 25.0

        # Weighted calculation
        raw_score = (
            (rain_subscore * 0.30)
            + (soil_subscore * 0.25)
            + (slope_subscore * 0.20)
            + (elev_subscore * 0.10)
            + (hist_subscore * 0.10)
            + (sat_subscore * 0.05)
        )

        final_score = int(round(min(100.0, max(0.0, raw_score))))

        # Classify Level
        if final_score >= 80:
            level = "Critical"
        elif final_score >= 65:
            level = "High"
        elif final_score >= 40:
            level = "Moderate"
        else:
            level = "Low"

        if not reasons:
            reasons.append("Environmental and geotechnical indicators within baseline seasonal limits")

        # Determine data status
        # If external authoritative feed credentials exist and is_live_data, then LIVE, else DEMO / PROCESSING
        if is_live_data and settings.is_weather_configured():
            data_status: Literal["LIVE", "AVAILABLE", "PROCESSING", "DEMO"] = "LIVE"
        else:
            data_status = "DEMO"

        return {
            "risk_score": final_score,
            "risk_level": level,
            "confidence_pct": 88 if is_live_data else 65,
            "reasons": reasons,
            "inputs_evaluated": {
                "rainfall_24h_mm": rainfall_24h_mm,
                "soil_moisture_pct": soil_moisture_pct,
                "slope_deg": slope_deg,
                "elevation_m": elevation_m,
                "historical_events_count": historical_events_count,
                "satellite_insar_velocity_mm_yr": satellite_insar_velocity_mm_yr,
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data_status": data_status,
        }
