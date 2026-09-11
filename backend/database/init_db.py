"""Database initializer and migration runner for NERA 2.0.

Initializes schemas, indexes, and seeds baseline data for the 8 NER states.
Can be executed as a standalone CLI command or called during application startup.
"""

from datetime import datetime, timezone
from backend.auth.security import hash_password
from backend.config import settings
from backend.database.db import get_db
from backend.database.seed_data import (
    HISTORICAL_LANDSLIDES_SEED,
    INFRASTRUCTURE_POINTS_SEED,
    INITIAL_ALERTS_SEED,
    INITIAL_REPORTS_SEED,
    NER_STATES_SEED,
    ROADS_SEED,
    VILLAGES_SEED,
    VOLUNTEERS_SEED,
)

SCHEMA_SQLITE = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'citizen',
    badge_id TEXT,
    phone TEXT,
    photo_url TEXT,
    firebase_uid TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS states (
    short TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    level TEXT NOT NULL,
    rain REAL NOT NULL,
    alerts INTEGER NOT NULL DEFAULT 0,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    soil REAL NOT NULL,
    slope TEXT NOT NULL,
    elevation TEXT NOT NULL,
    updated TEXT NOT NULL,
    event TEXT NOT NULL,
    data_status TEXT DEFAULT 'AVAILABLE',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS villages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    state_code TEXT NOT NULL REFERENCES states(short) ON DELETE CASCADE,
    district TEXT NOT NULL,
    population INTEGER NOT NULL DEFAULT 0,
    slope_deg REAL NOT NULL,
    risk_score INTEGER NOT NULL,
    risk_level TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS roads (
    id TEXT PRIMARY KEY,
    highway_code TEXT NOT NULL,
    name TEXT NOT NULL,
    state_code TEXT NOT NULL REFERENCES states(short) ON DELETE CASCADE,
    district TEXT,
    vulnerable_stretch_km REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'MONITORED',
    elevation_m REAL NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    segment_km_start REAL,
    segment_km_end REAL,
    start_lat REAL,
    start_lng REAL,
    end_lat REAL,
    end_lng REAL,
    risk_score INTEGER DEFAULT 50,
    risk_level TEXT DEFAULT 'Medium',
    rain_24h REAL DEFAULT 50.0,
    soil_moisture REAL DEFAULT 50.0,
    slope TEXT DEFAULT '20°',
    landslide_status TEXT DEFAULT 'Monitored',
    road_status TEXT DEFAULT 'MONITORED',
    last_updated TEXT DEFAULT '10 min ago',
    data_status TEXT DEFAULT 'AVAILABLE'
);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    citizen_name TEXT NOT NULL,
    contact TEXT,
    incident_type TEXT NOT NULL,
    description TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    media_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    officer_notes TEXT,
    offline_client_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    location TEXT NOT NULL,
    level TEXT NOT NULL,
    reason TEXT NOT NULL,
    action TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    delivery_status TEXT NOT NULL DEFAULT 'SIMULATED_DEMO',
    created_at TEXT NOT NULL,
    resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS historical_landslides (
    id TEXT PRIMARY KEY,
    location TEXT NOT NULL,
    state_code TEXT NOT NULL,
    date TEXT NOT NULL,
    severity TEXT NOT NULL,
    trigger TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS infrastructure_points (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    state_code TEXT NOT NULL REFERENCES states(short) ON DELETE CASCADE,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    capacity_beds INTEGER NOT NULL DEFAULT 0,
    emergency_shelter INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS officer_actions (
    id TEXT PRIMARY KEY,
    alert_id TEXT,
    officer_id TEXT NOT NULL,
    officer_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    notes TEXT,
    response_time_minutes INTEGER NOT NULL DEFAULT 15,
    timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS volunteers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    state_code TEXT NOT NULL REFERENCES states(short) ON DELETE CASCADE,
    district TEXT NOT NULL,
    role TEXT NOT NULL,
    badge TEXT NOT NULL DEFAULT 'Verified Reporter',
    reports_verified INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE_STANDBY'
);

CREATE TABLE IF NOT EXISTS rainfall_observations (
    id TEXT PRIMARY KEY,
    reporter_id TEXT,
    reporter_name TEXT NOT NULL,
    state_code TEXT NOT NULL,
    district TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    observed_intensity TEXT NOT NULL,
    measured_mm REAL,
    timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS damage_assessments (
    id TEXT PRIMARY KEY,
    incident_id TEXT,
    officer_id TEXT NOT NULL,
    officer_name TEXT NOT NULL,
    state_code TEXT NOT NULL,
    district TEXT NOT NULL,
    infrastructure_impact TEXT NOT NULL,
    casualties INTEGER DEFAULT 0,
    displaced_persons INTEGER DEFAULT 0,
    estimated_loss_lakhs REAL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_infra_state ON infrastructure_points(state_code);
CREATE INDEX IF NOT EXISTS idx_volunteers_state ON volunteers(state_code);
"""


def init_database() -> None:
    """Run migrations and seed baseline records."""
    now_iso = datetime.now(timezone.utc).isoformat()
    is_postgres = settings.DATABASE_URL.startswith("postgresql://") or settings.DATABASE_URL.startswith("postgres://")

    with get_db() as conn:
        cursor = conn.cursor()

        # Execute table creation depending on dialect
        if is_postgres:
            schema_file = settings.BASE_DIR / "backend" / "database" / "schema_postgis.sql"
            if schema_file.exists():
                with open(schema_file, "r", encoding="utf-8") as f:
                    cursor.execute(f.read())
        else:
            raw_target = getattr(conn, "_conn", conn)
            if hasattr(raw_target, "executescript"):
                raw_target.executescript(SCHEMA_SQLITE)
            else:
                cursor.executescript(SCHEMA_SQLITE)

        # Ensure schema migrations for Google/Firebase authentication fields
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN photo_url TEXT")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN firebase_uid TEXT")
        except Exception:
            pass

        # Ensure schema migrations for road segment precision coordinates and risk attributes
        for col, col_type in [
            ("segment_km_start", "REAL"),
            ("segment_km_end", "REAL"),
            ("start_lat", "REAL"),
            ("start_lng", "REAL"),
            ("end_lat", "REAL"),
            ("end_lng", "REAL"),
            ("district", "TEXT"),
            ("risk_score", "INTEGER"),
            ("risk_level", "TEXT"),
            ("rain_24h", "REAL"),
            ("soil_moisture", "REAL"),
            ("slope", "TEXT"),
            ("landslide_status", "TEXT"),
            ("road_status", "TEXT"),
            ("last_updated", "TEXT"),
            ("data_status", "TEXT"),
        ]:
            try:
                cursor.execute(f"ALTER TABLE roads ADD COLUMN {col} {col_type}")
            except Exception:
                pass

        # 1. Seed Default Users (Admin, District Officer, Citizen)
        default_users = [
            (
                "usr-admin-01",
                "admin@nera.gov.in",
                hash_password("Admin@NERA2026"),
                "NERA State Administrator",
                "admin",
                "ADMIN-NER-01",
                "+91-361-2234000",
                1,
                now_iso,
            ),
            (
                "usr-officer-01",
                "officer@nera.gov.in",
                hash_password("Officer@NERA2026"),
                "District Disaster Officer",
                "officer",
                "DDMA-OFF-402",
                "+91-360-2212000",
                1,
                now_iso,
            ),
            (
                "usr-citizen-01",
                "citizen@nera.org",
                hash_password("Citizen@NERA2026"),
                "Community Reporter",
                "citizen",
                None,
                "+91-9876543210",
                1,
                now_iso,
            ),
        ]

        for u in default_users:
            cursor.execute(
                """
                INSERT INTO users (id, email, hashed_password, full_name, role, badge_id, phone, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    email=excluded.email,
                    role=excluded.role,
                    full_name=excluded.full_name
                """,
                u,
            )

        # 2. Seed 8 NER States
        for s in NER_STATES_SEED:
            cursor.execute(
                """
                INSERT INTO states (short, name, score, level, rain, alerts, lat, lng, soil, slope, elevation, updated, event, data_status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(short) DO UPDATE SET
                    name=excluded.name,
                    score=excluded.score,
                    level=excluded.level,
                    rain=excluded.rain,
                    alerts=excluded.alerts,
                    lat=excluded.lat,
                    lng=excluded.lng,
                    soil=excluded.soil,
                    slope=excluded.slope,
                    elevation=excluded.elevation,
                    updated=excluded.updated,
                    event=excluded.event,
                    data_status=excluded.data_status,
                    updated_at=excluded.updated_at
                """,
                (
                    s["short"],
                    s["name"],
                    s["score"],
                    s["level"],
                    s["rain"],
                    s["alerts"],
                    s["lat"],
                    s["lng"],
                    s["soil"],
                    s["slope"],
                    s["elevation"],
                    s["updated"],
                    s["event"],
                    s["data_status"],
                    now_iso,
                ),
            )

        # 3. Seed Initial Alerts
        for a in INITIAL_ALERTS_SEED:
            cursor.execute(
                """
                INSERT INTO alerts (id, state, location, level, reason, action, time, status, delivery_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    state=excluded.state,
                    location=excluded.location,
                    level=excluded.level,
                    reason=excluded.reason,
                    action=excluded.action,
                    time=excluded.time,
                    status=excluded.status
                """,
                (
                    a["id"],
                    a["state"],
                    a["location"],
                    a["level"],
                    a["reason"],
                    a["action"],
                    a["time"],
                    a["status"],
                    a["delivery_status"],
                    now_iso,
                ),
            )

        # 4. Seed Villages
        for v in VILLAGES_SEED:
            cursor.execute(
                """
                INSERT INTO villages (id, name, state_code, district, population, slope_deg, risk_score, risk_level, lat, lng)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    district=excluded.district,
                    population=excluded.population,
                    slope_deg=excluded.slope_deg,
                    risk_score=excluded.risk_score,
                    risk_level=excluded.risk_level,
                    lat=excluded.lat,
                    lng=excluded.lng
                """,
                (
                    v["id"],
                    v["name"],
                    v["state_code"],
                    v["district"],
                    v["population"],
                    v["slope_deg"],
                    v["risk_score"],
                    v["risk_level"],
                    v["lat"],
                    v["lng"],
                ),
            )

        # 5. Seed Roads
        for r in ROADS_SEED:
            cursor.execute(
                """
                INSERT INTO roads (id, highway_code, name, state_code, district, vulnerable_stretch_km, status, elevation_m, lat, lng,
                                  segment_km_start, segment_km_end, start_lat, start_lng, end_lat, end_lng,
                                  risk_score, risk_level, rain_24h, soil_moisture, slope, landslide_status, road_status, last_updated, data_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    highway_code=excluded.highway_code,
                    name=excluded.name,
                    state_code=excluded.state_code,
                    district=excluded.district,
                    vulnerable_stretch_km=excluded.vulnerable_stretch_km,
                    status=excluded.status,
                    elevation_m=excluded.elevation_m,
                    lat=excluded.lat,
                    lng=excluded.lng,
                    segment_km_start=excluded.segment_km_start,
                    segment_km_end=excluded.segment_km_end,
                    start_lat=excluded.start_lat,
                    start_lng=excluded.start_lng,
                    end_lat=excluded.end_lat,
                    end_lng=excluded.end_lng,
                    risk_score=excluded.risk_score,
                    risk_level=excluded.risk_level,
                    rain_24h=excluded.rain_24h,
                    soil_moisture=excluded.soil_moisture,
                    slope=excluded.slope,
                    landslide_status=excluded.landslide_status,
                    road_status=excluded.road_status,
                    last_updated=excluded.last_updated,
                    data_status=excluded.data_status
                """,
                (
                    r["id"],
                    r["highway_code"],
                    r["name"],
                    r["state_code"],
                    r.get("district", "NER Corridor"),
                    r["vulnerable_stretch_km"],
                    r["status"],
                    r["elevation_m"],
                    r["lat"],
                    r["lng"],
                    r.get("segment_km_start"),
                    r.get("segment_km_end"),
                    r.get("start_lat"),
                    r.get("start_lng"),
                    r.get("end_lat"),
                    r.get("end_lng"),
                    r.get("risk_score", 50),
                    r.get("risk_level", "Medium"),
                    r.get("rain_24h", 50.0),
                    r.get("soil_moisture", 50.0),
                    r.get("slope", "20°"),
                    r.get("landslide_status", "Monitored"),
                    r.get("road_status", r["status"]),
                    r.get("last_updated", "10 min ago"),
                    r.get("data_status", "AVAILABLE"),
                ),
            )

        # 6. Seed Historical Landslides
        for h in HISTORICAL_LANDSLIDES_SEED:
            cursor.execute(
                """
                INSERT INTO historical_landslides (id, location, state_code, date, severity, trigger, lat, lng)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    location=excluded.location,
                    state_code=excluded.state_code,
                    date=excluded.date,
                    severity=excluded.severity,
                    trigger=excluded.trigger,
                    lat=excluded.lat,
                    lng=excluded.lng
                """,
                (
                    h["id"],
                    h["location"],
                    h["state_code"],
                    h["date"],
                    h["severity"],
                    h["trigger"],
                    h["lat"],
                    h["lng"],
                ),
            )

        # 7. Seed Critical Infrastructure Points
        for inf in INFRASTRUCTURE_POINTS_SEED:
            cursor.execute(
                """
                INSERT INTO infrastructure_points (id, name, category, state_code, lat, lng, capacity_beds, emergency_shelter)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    category=excluded.category,
                    state_code=excluded.state_code,
                    lat=excluded.lat,
                    lng=excluded.lng,
                    capacity_beds=excluded.capacity_beds,
                    emergency_shelter=excluded.emergency_shelter
                """,
                (
                    inf["id"],
                    inf["name"],
                    inf["category"],
                    inf["state_code"],
                    inf["lat"],
                    inf["lng"],
                    inf["capacity_beds"],
                    inf["emergency_shelter"],
                ),
            )

        # 8. Seed Volunteers Network
        for v in VOLUNTEERS_SEED:
            cursor.execute(
                """
                INSERT INTO volunteers (id, name, state_code, district, role, badge, reports_verified, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    state_code=excluded.state_code,
                    district=excluded.district,
                    role=excluded.role,
                    badge=excluded.badge,
                    reports_verified=excluded.reports_verified,
                    status=excluded.status
                """,
                (
                    v["id"],
                    v["name"],
                    v["state_code"],
                    v["district"],
                    v["role"],
                    v["badge"],
                    v["reports_verified"],
                    v["status"],
                ),
            )

        # 9. Seed Reference Incident Reports (Verified & Unverified)
        for rep in INITIAL_REPORTS_SEED:
            cursor.execute(
                """
                INSERT INTO reports (id, citizen_name, contact, incident_type, description, lat, lng, media_url, status, verified_by, officer_notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    incident_type=excluded.incident_type,
                    description=excluded.description,
                    lat=excluded.lat,
                    lng=excluded.lng,
                    status=excluded.status,
                    verified_by=excluded.verified_by,
                    officer_notes=excluded.officer_notes
                """,
                (
                    rep["id"],
                    rep["citizen_name"],
                    rep["contact"],
                    rep["incident_type"],
                    rep["description"],
                    rep["lat"],
                    rep["lng"],
                    rep["media_url"],
                    rep["status"],
                    rep.get("verified_by"),
                    rep.get("officer_notes"),
                    rep["created_at"],
                ),
            )


if __name__ == "__main__":
    init_database()
    print("NERA 2.0 Database initialized successfully with all 8 NER states and seed records.")

