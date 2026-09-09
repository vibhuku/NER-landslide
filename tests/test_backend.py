"""Comprehensive automated test suite for NERA 2.0 backend.

Covers:
- Database initialization and 8 NER state verification
- User registration and JWT authentication
- Role-based access control (Citizen vs Officer vs Admin)
- Risk data retrieval and state metrics
- Infrastructure (Villages and Roads)
- Citizen report submission, media upload, and offline batch sync
- Officer report verification and notes
- Alert creation, resolution, and provider status
- AI/ML multi-factor prediction engine
- Data source auditing ("Demo / Data source not connected")
"""

import base64
import unittest
import uuid
from backend.auth.security import create_access_token, decode_access_token, hash_password, verify_password
from backend.database.init_db import init_database
from backend.models.schemas import (
    AlertCreate,
    GoogleAuthRequest,
    MediaUploadRequest,
    ProfileUpdateRequest,
    ReportCreate,
    ReportVerify,
    UserLogin,
    UserRegister,
)
from backend.routers.alerts import create_alert, resolve_alert
from backend.routers.analytics import get_analytics_summary, get_historical_records
from backend.routers.auth import get_firebase_config, google_auth, login, register, update_profile
from backend.routers.data_sources import get_data_sources_status
from backend.routers.infrastructure import get_roads, get_villages
from backend.routers.reports import (
    BatchReportsRequest,
    batch_sync_reports,
    get_daily_risk_summary,
    get_state_wise_risk_summary,
    get_weekly_risk_summary,
    list_reports,
    submit_report,
    upload_media,
    verify_report,
)
from backend.routers.risk_data import get_all_states, get_regional_status, get_state
from backend.services.prediction_engine import LandslidePredictionEngine
from fastapi import HTTPException


class TestNeraBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Initialize database before running tests."""
        init_database()

    def test_01_database_and_8_ner_states(self):
        """Verify that strictly and only the 8 official NER states are seeded."""
        states = get_all_states()
        self.assertEqual(len(states), 8, "Must contain exactly 8 NER states")
        state_codes = {s["short"] for s in states}
        expected_codes = {"AR", "AS", "MN", "ML", "MZ", "NL", "SK", "TR"}
        self.assertEqual(state_codes, expected_codes)

        # Check detail for Arunachal Pradesh
        ar = get_state("AR")
        self.assertIsNotNone(ar)
        assert ar is not None
        self.assertEqual(ar["name"], "Arunachal Pradesh")
        self.assertEqual(ar["short"], "AR")
        self.assertGreater(ar["score"], 0)
        self.assertIn("°", ar["slope"])

    def test_02_password_hashing_and_jwt(self):
        """Test PBKDF2 hashing and JWT encode/decode."""
        raw_pw = "SecureTestPass123!"
        hashed = hash_password(raw_pw)
        self.assertTrue(verify_password(raw_pw, hashed))
        self.assertFalse(verify_password("WrongPassword", hashed))

        payload = {"sub": "usr-123", "role": "officer"}
        token = create_access_token(payload, expires_delta_seconds=60)
        decoded = decode_access_token(token)
        self.assertIsNotNone(decoded)
        assert decoded is not None
        self.assertEqual(decoded["sub"], "usr-123")
        self.assertEqual(decoded["role"], "officer")

    def test_03_auth_login_default_users(self):
        """Test authentication for pre-seeded Admin and Officer accounts."""
        login_res = login(UserLogin(email="admin@nera.gov.in", password="Admin@NERA2026"))
        self.assertIn("access_token", login_res)
        admin_user = login_res["user"]
        assert isinstance(admin_user, dict)
        self.assertEqual(admin_user["role"], "admin")

        officer_res = login(UserLogin(email="officer@nera.gov.in", password="Officer@NERA2026"))
        officer_user = officer_res["user"]
        assert isinstance(officer_user, dict)
        self.assertEqual(officer_user["role"], "officer")

    def test_04_auth_register_and_validation(self):
        """Test registration of citizen and officer accounts."""
        unique_email = f"citizen_{uuid.uuid4().hex[:8]}@test.org"
        # Citizen registration
        cit_reg = UserRegister(
            email=unique_email,
            password="password123",
            full_name="Tenzing Norbu",
            role="citizen",
            phone="+91-9876500000",
        )
        res = register(cit_reg)
        self.assertIn("access_token", res)
        cit_user = res["user"]
        assert isinstance(cit_user, dict)
        self.assertEqual(cit_user["role"], "citizen")

        # Officer registration without badge_id must fail
        with self.assertRaises(HTTPException) as cm:
            register(
                UserRegister(
                    email="bad_officer@test.org",
                    password="password123",
                    full_name="Officer NoBadge",
                    role="officer",
                    badge_id=None,
                )
            )
        self.assertEqual(cm.exception.status_code, 400)

    def test_05_infrastructure_villages_and_roads(self):
        """Test querying villages and roads across NER."""
        villages = get_villages(state_code="SK")
        self.assertTrue(any(v["name"] == "Chungthang" for v in villages))

        roads = get_roads(state_code="SK")
        self.assertTrue(any("NH-10" in r["highway_code"] for r in roads))

    def test_06_citizen_reporting_and_offline_sync(self):
        """Test report submission, media upload, duplicate prevention, and batch sync."""
        # 1. Media Upload (Base64)
        sample_img_data = base64.b64encode(b"SIMULATED_IMAGE_DATA_BYTES").decode("ascii")
        upload_res = upload_media(
            MediaUploadRequest(
                filename="slide_test.jpg",
                data_base64=f"data:image/jpeg;base64,{sample_img_data}",
            )
        )
        self.assertIn("media_url", upload_res)
        self.assertTrue(upload_res["media_url"].startswith("/uploads/"))

        # 2. Single Report submission
        client_id_1 = f"client-offline-{uuid.uuid4().hex[:8]}"
        rep = submit_report(
            ReportCreate(
                citizen_name="Bhaben Kalita",
                contact="+91-9812345678",
                incident_type="Rockfall",
                description="Boulders fell onto road near NH-13 kilometer 42",
                lat=28.12,
                lng=94.35,
                media_url=upload_res["media_url"],
                offline_client_id=client_id_1,
            )
        )
        self.assertEqual(rep["citizen_name"], "Bhaben Kalita")
        self.assertEqual(rep["status"], "pending")
        self.assertEqual(rep["offline_client_id"], client_id_1)

        # 3. Duplicate offline_client_id idempotent return
        dup = submit_report(
            ReportCreate(
                citizen_name="Bhaben Kalita",
                incident_type="Rockfall",
                description="Boulders fell onto road near NH-13 kilometer 42",
                lat=28.12,
                lng=94.35,
                offline_client_id=client_id_1,
            )
        )
        self.assertEqual(dup["id"], rep["id"])

        # 4. Batch offline sync
        client_id_2 = f"client-offline-{uuid.uuid4().hex[:8]}"
        batch_synced = batch_sync_reports(
            BatchReportsRequest(
                reports=[
                    ReportCreate(
                        citizen_name="Sangay Bhutia",
                        incident_type="Mudslide",
                        description="Slope displacement above village boundary",
                        lat=27.55,
                        lng=88.52,
                        offline_client_id=client_id_2,
                    )
                ]
            )
        )
        self.assertEqual(len(batch_synced), 1)
        self.assertEqual(batch_synced[0]["offline_client_id"], client_id_2)

    def test_07_officer_report_verification(self):
        """Test Field/District Officer verifying a citizen report."""
        # Create a fresh pending report specifically for verification
        fresh_report = submit_report(
            ReportCreate(
                citizen_name="Tenzing Lepcha",
                contact="+91-9876543210",
                incident_type="Slope Cracking",
                description="Road cracked near Dikchu bridge",
                lat=27.35,
                lng=88.55,
                offline_client_id=f"client-verify-{uuid.uuid4().hex[:8]}",
            )
        )
        self.assertEqual(fresh_report["status"], "pending")
        target_id = fresh_report["id"]

        officer_user = {"id": "usr-officer-01", "role": "officer"}
        verified = verify_report(
            report_id=target_id,
            req=ReportVerify(status="verified", officer_notes="Inspection team dispatched to NH-13 corridor."),
            officer=officer_user,
        )
        self.assertEqual(verified["status"], "verified")
        self.assertEqual(verified["verified_by"], "usr-officer-01")
        self.assertIn("Inspection team", verified["officer_notes"])

        # Also test querying list_reports with status="verified"
        verified_reports = list_reports(status="verified")
        self.assertTrue(any(r["id"] == target_id for r in verified_reports))

    def test_08_alerts_lifecycle(self):
        """Test alert creation, listing, and resolution."""
        officer_user = {"id": "usr-officer-01", "role": "officer"}
        alert = create_alert(
            req=AlertCreate(
                state="Sikkim",
                location="Mangan-Chungthang Road",
                level="Critical",
                reason="Continuous torrential rain of 135mm triggering mudflows",
                action="Close highway section for night traffic",
            ),
            officer=officer_user,
        )
        self.assertEqual(alert["state"], "Sikkim")
        self.assertEqual(alert["status"], "ACTIVE")
        self.assertIn("SIMULATED_DEMO", alert["delivery_status"])

        # Resolve alert
        resolved = resolve_alert(alert_id=alert["id"], officer=officer_user)
        self.assertEqual(resolved["status"], "RESOLVED")

    def test_09_ai_prediction_engine(self):
        """Test 6-input geotechnical prediction engine and risk classification."""
        # Critical condition test
        pred_crit = LandslidePredictionEngine.evaluate(
            rainfall_24h_mm=130.0,
            soil_moisture_pct=88.0,
            slope_deg=36.0,
            elevation_m=1800.0,
            historical_events_count=6,
            satellite_insar_velocity_mm_yr=18.0,
        )
        self.assertGreaterEqual(pred_crit["risk_score"], 80)
        self.assertEqual(pred_crit["risk_level"], "Critical")
        self.assertGreater(len(pred_crit["reasons"]), 0)
        self.assertIn("rainfall", "".join(pred_crit["reasons"]).lower())

        # Low condition test
        pred_low = LandslidePredictionEngine.evaluate(
            rainfall_24h_mm=10.0,
            soil_moisture_pct=30.0,
            slope_deg=8.0,
            elevation_m=200.0,
            historical_events_count=0,
            satellite_insar_velocity_mm_yr=0.0,
        )
        self.assertLess(pred_low["risk_score"], 40)
        self.assertEqual(pred_low["risk_level"], "Low")

    def test_10_data_sources_status_demo_label(self):
        """Verify that unconnected data sources return exactly 'Demo / Data source not connected'."""
        sources = get_data_sources_status()
        self.assertEqual(len(sources), 7)
        keys = {s["key"] for s in sources}
        expected_keys = {
            "nisar_l",
            "nisar_s_bhoonidhi",
            "rainfall",
            "soil_moisture",
            "dem_elevation",
            "slope_model",
            "historical_landslides",
        }
        self.assertEqual(keys, expected_keys)

        # In unconfigured dev environment, NISAR and Rainfall should show DEMO and exact label
        nisar_l = next(s for s in sources if s["key"] == "nisar_l")
        self.assertEqual(nisar_l["status_label"], "Demo / Data source not connected")

    def test_11_analytics_and_regional_summary(self):
        """Test regional metrics and historical inventory."""
        summary = get_analytics_summary()
        self.assertIn("regional_risk_score", summary)
        self.assertIn("weather_environment", summary)
        rainfall_7d = summary["rainfall_accumulation_7day"]
        assert isinstance(rainfall_7d, list)
        self.assertEqual(len(rainfall_7d), 7)

        history = get_historical_records()
        self.assertGreater(len(history), 0)

        reg_status = get_regional_status()
        self.assertIn("regional_assessment", reg_status)
        active_alerts = reg_status["active_alerts_count"]
        assert isinstance(active_alerts, int)
        self.assertGreaterEqual(active_alerts, 0)

    def test_12_standard_reports_and_geo_enrichment(self):
        """Test daily, weekly, state-wise standard risk reports and report geo-enrichment."""
        # 1. Daily Risk Report
        daily = get_daily_risk_summary()
        self.assertIn("regional_score", daily)
        self.assertIn("priority_zones", daily)
        self.assertIn("data_status", daily)
        self.assertEqual(daily["total_states_monitored"], 8)

        # 2. Weekly Risk Summary
        weekly = get_weekly_risk_summary()
        self.assertEqual(len(weekly["seven_day_trend"]), 7)
        self.assertIn("arterial_corridors_monitored", weekly)
        self.assertGreaterEqual(weekly["cumulative_rainfall_mm"], 0)

        # 3. State-wise Risk Report
        state_wise = get_state_wise_risk_summary()
        self.assertEqual(state_wise["total_states"], 8)
        state_names = {s["name"] for s in state_wise["states"]}
        expected_states = {
            "Arunachal Pradesh", "Assam", "Manipur", "Meghalaya",
            "Mizoram", "Nagaland", "Sikkim", "Tripura"
        }
        self.assertEqual(state_names, expected_states)
        for s in state_wise["states"]:
            self.assertIn("score", s)
            self.assertIn("level", s)
            self.assertIn(s["level"], ["Low", "Moderate", "High", "Critical"])

        # 4. Report Geo-Enrichment
        reports = list_reports(limit=5)
        if reports:
            sample = reports[0]
            self.assertIn("location", sample)
            self.assertIn("district", sample)
            self.assertIn("state", sample)

    def test_13_google_auth_and_profile(self):
        """Test Google authentication, role assignment, and profile updates."""
        # 1. Firebase configuration endpoint
        config = get_firebase_config()
        self.assertIn("apiKey", config)
        self.assertIn("projectId", config)

        # 2. Google OAuth / Sign-in endpoint
        test_email = f"google_cit_{uuid.uuid4().hex[:8]}@example.com"
        google_req = GoogleAuthRequest(
            email=test_email,
            display_name="Tashi Bhutia",
            photo_url="https://example.com/photo.jpg",
            uid="fb_uid_test_9999",
        )
        auth_res = google_auth(google_req)
        self.assertIn("access_token", auth_res)
        user = auth_res["user"]
        self.assertEqual(user["email"], test_email)
        self.assertEqual(user["full_name"], "Tashi Bhutia")
        # Newly created Google auth user MUST strictly be 'citizen' (public)
        self.assertEqual(user["role"], "citizen")
        self.assertEqual(user["photo_url"], "https://example.com/photo.jpg")
        self.assertEqual(user["firebase_uid"], "fb_uid_test_9999")

        # 3. Authenticated profile update
        profile_req = ProfileUpdateRequest(full_name="Tashi Namgyal Bhutia")
        updated_user = update_profile(profile_req, current_user=user)
        self.assertEqual(updated_user["full_name"], "Tashi Namgyal Bhutia")

        # 4. Re-authentication of existing user preserves citizen role and updates metadata
        google_req2 = GoogleAuthRequest(
            email=test_email,
            display_name="Tashi Namgyal Bhutia",
            photo_url="https://example.com/updated_photo.jpg",
            uid="fb_uid_test_9999",
        )
        auth_res2 = google_auth(google_req2)
        self.assertEqual(auth_res2["user"]["role"], "citizen")
        self.assertEqual(auth_res2["user"]["photo_url"], "https://example.com/updated_photo.jpg")


if __name__ == "__main__":
    unittest.main()

