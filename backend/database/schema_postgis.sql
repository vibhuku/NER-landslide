-- =============================================================================
-- NERA 2.0 - Production PostgreSQL + PostGIS Schema
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'citizen', -- 'citizen', 'officer', 'admin'
    badge_id VARCHAR(64),
    phone VARCHAR(32),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. NER 8 States Risk Assessment
CREATE TABLE IF NOT EXISTS states (
    short VARCHAR(8) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    score INTEGER NOT NULL,
    level VARCHAR(32) NOT NULL,
    rain DOUBLE PRECISION NOT NULL,
    alerts INTEGER NOT NULL DEFAULT 0,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    soil DOUBLE PRECISION NOT NULL,
    slope VARCHAR(32) NOT NULL,
    elevation VARCHAR(32) NOT NULL,
    updated VARCHAR(64) NOT NULL,
    event TEXT NOT NULL,
    data_status VARCHAR(32) DEFAULT 'AVAILABLE',
    geom geometry(Point, 4326),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_states_geom ON states USING GIST(geom);

-- 3. Vulnerable Villages
CREATE TABLE IF NOT EXISTS villages (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    state_code VARCHAR(8) NOT NULL REFERENCES states(short) ON DELETE CASCADE,
    district VARCHAR(128) NOT NULL,
    population INTEGER NOT NULL DEFAULT 0,
    slope_deg DOUBLE PRECISION NOT NULL,
    risk_score INTEGER NOT NULL,
    risk_level VARCHAR(32) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geom geometry(Point, 4326)
);

CREATE INDEX IF NOT EXISTS idx_villages_geom ON villages USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_villages_state ON villages(state_code);

-- 4. Vulnerable Road Corridors
CREATE TABLE IF NOT EXISTS roads (
    id VARCHAR(64) PRIMARY KEY,
    highway_code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    state_code VARCHAR(8) NOT NULL REFERENCES states(short) ON DELETE CASCADE,
    vulnerable_stretch_km DOUBLE PRECISION NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'MONITORED', -- 'OPEN', 'RESTRICTED', 'BLOCKED', 'MONITORED'
    elevation_m DOUBLE PRECISION NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geom geometry(Point, 4326)
);

CREATE INDEX IF NOT EXISTS idx_roads_geom ON roads USING GIST(geom);

-- 5. Citizen Reports & Verification
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(64) PRIMARY KEY,
    citizen_name VARCHAR(128) NOT NULL,
    contact VARCHAR(64),
    incident_type VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    media_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
    verified_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    officer_notes TEXT,
    offline_client_id VARCHAR(128),
    geom geometry(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_geom ON reports USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- 6. Alerts & Advisories
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(64) PRIMARY KEY,
    state VARCHAR(64) NOT NULL,
    location VARCHAR(255) NOT NULL,
    level VARCHAR(32) NOT NULL, -- 'Watch', 'Warning', 'Critical'
    reason TEXT NOT NULL,
    action TEXT NOT NULL,
    time VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'RESOLVED'
    delivery_status VARCHAR(64) NOT NULL DEFAULT 'SIMULATED_DEMO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);

-- 7. Historical Landslide Records
CREATE TABLE IF NOT EXISTS historical_landslides (
    id VARCHAR(64) PRIMARY KEY,
    location VARCHAR(255) NOT NULL,
    state_code VARCHAR(8) NOT NULL,
    date VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    trigger TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geom geometry(Point, 4326)
);

CREATE INDEX IF NOT EXISTS idx_historical_geom ON historical_landslides USING GIST(geom);

-- 8. Spatial trigger helper: keep geom synced with lat/lng
CREATE OR REPLACE FUNCTION update_geom_from_latlng()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reports_geom ON reports;
CREATE TRIGGER trg_reports_geom BEFORE INSERT OR UPDATE OF lat, lng ON reports
FOR EACH ROW EXECUTE FUNCTION update_geom_from_latlng();

