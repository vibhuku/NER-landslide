"""Pydantic schemas for API request validation and response serialization."""

import re
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field, field_validator

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# --- User & Auth Schemas ---

class UserRegister(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    role: Literal["citizen", "officer", "admin"] = "citizen"
    badge_id: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not EMAIL_REGEX.match(v_clean):
            raise ValueError("Invalid email address format")
        return v_clean


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not EMAIL_REGEX.match(v_clean):
            raise ValueError("Invalid email address format")
        return v_clean


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


class GoogleAuthRequest(BaseModel):
    email: str
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    firebase_uid: Optional[str] = None
    uid: Optional[str] = None
    id_token: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if not EMAIL_REGEX.match(v_clean):
            raise ValueError("Invalid email address format")
        return v_clean


class ProfileUpdateRequest(BaseModel):
    full_name: str = Field(..., min_length=2)


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    badge_id: Optional[str] = None
    photo_url: Optional[str] = None
    firebase_uid: Optional[str] = None
    created_at: str


# --- Risk Data Schemas ---

class StateRiskData(BaseModel):
    name: str
    short: str
    score: int
    level: str
    rain: float
    alerts: int
    lat: float
    lng: float
    soil: float
    slope: str
    elevation: str
    updated: str
    event: str
    data_status: str = "AVAILABLE"


class RegionalStatus(BaseModel):
    regional_assessment: str
    districts_attention_count: int
    active_alerts_count: int
    high_risk_locations_count: int
    rainfall_status: str
    rainfall_anomaly_24h: str
    data_freshness_min: int
    data_mode: str
    updated_at: str


# --- Infrastructure Schemas ---

class VillageOut(BaseModel):
    id: str
    name: str
    state_code: str
    district: str
    population: int
    slope_deg: float
    risk_score: int
    risk_level: str
    lat: float
    lng: float


class RoadOut(BaseModel):
    id: str
    highway_code: str
    name: str
    state_code: str
    vulnerable_stretch_km: float
    status: Literal["OPEN", "RESTRICTED", "BLOCKED", "MONITORED"]
    elevation_m: float
    lat: float
    lng: float
    segment_km_start: Optional[float] = None
    segment_km_end: Optional[float] = None
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None


# --- Citizen Report Schemas ---

class MediaUploadRequest(BaseModel):
    filename: str = "incident.jpg"
    data_base64: str


class ReportCreate(BaseModel):
    citizen_name: str = Field(..., min_length=2)
    contact: Optional[str] = None
    incident_type: Literal[
        "Rockfall",
        "Mudslide",
        "Slope Cracking",
        "Debris Flow",
        "Road Blockage",
        "Soil Erosion",
        "Other"
    ]
    description: str = Field(..., min_length=5)
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    media_url: Optional[str] = None
    offline_client_id: Optional[str] = None


class ReportVerify(BaseModel):
    status: Literal["verified", "rejected"]
    officer_notes: Optional[str] = None


class ReportOut(BaseModel):
    id: str
    citizen_name: str
    contact: Optional[str] = None
    incident_type: str
    description: str
    lat: float
    lng: float
    media_url: Optional[str] = None
    status: Literal["pending", "verified", "rejected"]
    verified_by: Optional[str] = None
    officer_notes: Optional[str] = None
    offline_client_id: Optional[str] = None
    location: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None


# --- Alert Schemas ---

class AlertCreate(BaseModel):
    state: str
    location: str
    level: Literal["Watch", "Warning", "Critical"]
    reason: str
    action: str


class AlertUpdate(BaseModel):
    state: Optional[str] = None
    location: Optional[str] = None
    level: Optional[Literal["Watch", "Warning", "Critical"]] = None
    reason: Optional[str] = None
    action: Optional[str] = None
    status: Optional[Literal["ACTIVE", "RESOLVED"]] = None


class AlertOut(BaseModel):
    id: str
    state: str
    location: str
    level: str
    reason: str
    action: str
    time: str
    status: Literal["ACTIVE", "RESOLVED"]
    delivery_status: str
    created_at: str


class EmergencyTriggerRequest(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    location: Optional[str] = None
    state: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = "web_header_emergency_button"


class EmergencyTriggerResponse(BaseModel):
    success: bool
    alert_id: str
    message: str
    location: str
    state: str
    level: str
    delivery_status: str
    created_at: str


# --- AI/ML Prediction Schemas ---

class PredictionInput(BaseModel):
    state_code: Optional[str] = None
    rainfall_24h_mm: float = Field(..., ge=0, description="Rainfall accumulation in mm")
    soil_moisture_pct: float = Field(..., ge=0, le=100, description="Soil saturation percentage")
    slope_deg: float = Field(..., ge=0, le=90, description="Hillslope gradient in degrees")
    elevation_m: float = Field(..., ge=0, description="Altitude in meters")
    historical_events_count: int = Field(default=0, ge=0, description="Past landslide events recorded")
    satellite_insar_velocity_mm_yr: Optional[float] = Field(
        default=0.0, description="InSAR ground displacement velocity mm/year"
    )


class PredictionOutput(BaseModel):
    risk_score: int
    risk_level: Literal["Low", "Moderate", "High", "Critical"]
    confidence_pct: int
    reasons: list[str]
    inputs_evaluated: dict[str, Any]
    timestamp: str
    data_status: Literal["LIVE", "AVAILABLE", "PROCESSING", "DEMO"]


# --- Data Sources & Analytics Schemas ---

class DataSourceItem(BaseModel):
    key: str
    name: str
    category: str
    status: Literal["LIVE", "AVAILABLE", "PROCESSING", "DEMO"]
    status_label: str
    coverage: str
    description: str
    last_verified: str


class HistoricalLandslideOut(BaseModel):
    id: str
    location: str
    state_code: str
    date: str
    severity: str
    trigger: str
    lat: float
    lng: float


# --- Advanced SIH26001 Feature Schemas ---

class InfrastructurePointOut(BaseModel):
    id: str
    name: str
    category: str
    state_code: str
    lat: float
    lng: float
    capacity_beds: int = 0
    emergency_shelter: int = 0


class OfficerActionCreate(BaseModel):
    alert_id: Optional[str] = None
    officer_name: str
    action_type: str
    notes: Optional[str] = None
    response_time_minutes: int = 15


class OfficerActionOut(BaseModel):
    id: str
    alert_id: Optional[str] = None
    officer_id: str
    officer_name: str
    action_type: str
    notes: Optional[str] = None
    response_time_minutes: int
    timestamp: str


class VolunteerOut(BaseModel):
    id: str
    name: str
    state_code: str
    district: str
    role: str
    badge: str
    reports_verified: int
    status: str


class RainfallObservationCreate(BaseModel):
    reporter_name: str
    state_code: str
    district: Optional[str] = None
    lat: float = 25.5
    lng: float = 91.8
    observed_intensity: str = "HEAVY"
    measured_mm: Optional[float] = None


class RainfallObservationOut(BaseModel):
    id: str
    reporter_id: Optional[str] = None
    reporter_name: str
    state_code: str
    district: Optional[str] = None
    lat: float
    lng: float
    observed_intensity: str
    measured_mm: Optional[float] = None
    timestamp: str


class DamageAssessmentCreate(BaseModel):
    incident_id: Optional[str] = None
    officer_name: str = "Field Officer"
    state_code: str
    district: str
    infrastructure_impact: str
    casualties: int = 0
    displaced_persons: int = 0
    estimated_loss_lakhs: float = 0.0
    status: str = "SUBMITTED"


class DamageAssessmentOut(BaseModel):
    id: str
    incident_id: Optional[str] = None
    officer_id: str
    officer_name: str
    state_code: str
    district: str
    infrastructure_impact: str
    casualties: int
    displaced_persons: int
    estimated_loss_lakhs: float
    status: str
    timestamp: str



class FactorBreakdown(BaseModel):
    factor: str
    contribution_pct: float
    description: str


class WhatIfSimInput(BaseModel):
    rainfall_24h_mm: float = Field(..., ge=0, le=500)
    soil_moisture_pct: float = Field(..., ge=0, le=100)
    slope_deg: float = Field(..., ge=0, le=90)
    monsoon_mode: Literal["pre_monsoon", "monsoon", "post_monsoon"] = "monsoon"
    state_code: Optional[str] = "ML"


class WhatIfSimOutput(BaseModel):
    risk_score: int
    risk_level: Literal["Low", "Moderate", "High", "Critical"]
    delta_from_baseline: int
    primary_trigger: str
    factors: list[FactorBreakdown]
    cascade_probability_pct: int
    recommended_action: str
    data_status: str = "DEMO / SIMULATED"


class LatLng(BaseModel):
    lat: float
    lng: float


class SafestRouteRequest(BaseModel):
    origin: LatLng
    destination: LatLng
    avoid_blocked_roads: bool = True


class RouteSegment(BaseModel):
    segment_name: str
    status: str
    risk_score: int
    distance_km: float


class SafestRouteResponse(BaseModel):
    safe_path: list[list[float]]
    total_distance_km: float
    estimated_time_min: int
    safety_score: int
    risk_level: str
    blocked_roads_bypassed: int
    shelters_en_route: list[dict[str, Any]]
    segments: list[RouteSegment]
    data_status: str = "DEMO / SIMULATED"


class NotificationDispatchCreate(BaseModel):
    channels: list[Literal["sms", "whatsapp", "email", "webpush", "voice_ivr"]]
    recipients: list[str]
    message: str
    priority: Literal["normal", "urgent", "critical"] = "urgent"
    language: Literal["en", "hi", "as", "bn"] = "en"

