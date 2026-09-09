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
    INITIAL_ALERTS_SEED,
    NER_STATES_SEED,
    ROADS_SEED,
    VILLAGES_SEED,
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
    vulnerable_stretch_km REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'MONITORED',
    elevation_m REAL NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL
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

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
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
                INSERT INTO roads (id, highway_code, name, state_code, vulnerable_stretch_km, status, elevation_m, lat, lng)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    highway_code=excluded.highway_code,
                    name=excluded.name,
                    vulnerable_stretch_km=excluded.vulnerable_stretch_km,
                    status=excluded.status,
                    elevation_m=excluded.elevation_m,
                    lat=excluded.lat,
                    lng=excluded.lng
                """,
                (
                    r["id"],
                    r["highway_code"],
                    r["name"],
                    r["state_code"],
                    r["vulnerable_stretch_km"],
                    r["status"],
                    r["elevation_m"],
                    r["lat"],
                    r["lng"],
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


if __name__ == "__main__":
    init_database()
    print("NERA 2.0 Database initialized successfully with all 8 NER states and seed records.")

