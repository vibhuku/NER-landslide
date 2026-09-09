"""End-to-End HTTP Integration Verification for NERA 2.0.

Tests all REST APIs and static serving over live HTTP connection.
"""

import json
import time
from typing import Any
import urllib.error
import urllib.request

BASE_URL = "http://127.0.0.1:8000"


def http_request(
    path: str,
    method: str = "GET",
    data: dict[str, Any] | None = None,
    token: str | None = None,
) -> tuple[int, Any]:
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            status = res.status
            content = res.read().decode("utf-8")
            try:
                return status, json.loads(content)
            except Exception:
                return status, {"raw": content}
    except urllib.error.HTTPError as e:
        err_content = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_content)
        except Exception:
            return e.code, {"error": err_content}


def run_checks():
    print("Connecting to live NERA 2.0 HTTP server at", BASE_URL)

    # 1. Health check
    code, res = http_request("/api/health")
    assert code == 200, f"Health check failed: {code} {res}"
    print(" [x] Health Check: OK -", res.get("service"), res.get("status"))

    # 2. Risk Data 8 states
    code, states = http_request("/api/risk-data/states")
    assert code == 200 and len(states) == 8, f"Expected 8 states, got: {len(states) if isinstance(states, list) else states}"
    print(f" [x] Risk Data: OK - Retrieved all {len(states)} NER states")

    # 3. Static frontend index.html
    code, html = http_request("/")
    assert code == 200 and "NER-Landslide" in html.get("raw", ""), "Frontend static mount failed"
    print(" [x] Static Mount: OK - index.html loaded with Leaflet Risk Map")

    # 4. Auth - Officer Login
    code, auth_res = http_request(
        "/api/auth/login",
        method="POST",
        data={"email": "officer@nera.gov.in", "password": "Officer@NERA2026"}
    )
    assert code == 200 and "access_token" in auth_res, f"Officer login failed: {auth_res}"
    officer_token = auth_res["access_token"]
    print(" [x] Auth: OK - Officer authenticated, JWT issued")

    # 5. Citizen Report Submission
    code, report = http_request(
        "/api/reports",
        method="POST",
        data={
            "citizen_name": "E2E Test Citizen",
            "contact": "+91-9876543210",
            "incident_type": "Road Blockage",
            "description": "Fallen boulder on NH-10 near Rangpo corridor",
            "lat": 27.18,
            "lng": 88.53,
            "offline_client_id": f"e2e-{int(time.time())}"
        }
    )
    assert code == 201 and report["status"] == "pending", f"Report submission failed: {report}"
    report_id = report["id"]
    print(f" [x] Citizen Reporting: OK - Report {report_id} created with status 'pending'")

    # 6. Officer Verification
    code, verify_res = http_request(
        f"/api/reports/{report_id}/verify",
        method="PATCH",
        data={"status": "verified", "officer_notes": "Verified by District Control Room"},
        token=officer_token
    )
    assert code == 200 and verify_res["status"] == "verified", f"Verification failed: {verify_res}"
    print(f" [x] Officer Verification: OK - Report {report_id} marked 'verified'")

    # 7. Alerts
    code, alerts = http_request("/api/alerts")
    assert code == 200 and len(alerts) > 0, f"Alerts query failed: {alerts}"
    print(f" [x] Alerts: OK - {len(alerts)} active advisories retrieved")

    # 8. AI/ML Prediction Engine
    code, pred = http_request(
        "/api/predictions/evaluate",
        method="POST",
        data={
            "rainfall_24h_mm": 115.0,
            "soil_moisture_pct": 78.0,
            "slope_deg": 32.0,
            "elevation_m": 1600.0,
            "historical_events_count": 3,
            "satellite_insar_velocity_mm_yr": 4.5
        }
    )
    assert code == 200 and "risk_score" in pred, f"Prediction engine failed: {pred}"
    print(f" [x] AI/ML Prediction: OK - Score: {pred['risk_score']}/100, Level: {pred['risk_level']}, Reasons: {len(pred['reasons'])}")

    # 9. Data Sources Status Check
    code, sources = http_request("/api/data-sources/status")
    assert code == 200 and len(sources) == 7, f"Data sources failed: {sources}"
    nisar = next(s for s in sources if s["key"] == "nisar_l")
    assert nisar["status_label"] == "Demo / Data source not connected", f"Unexpected label: {nisar}"
    print(" [x] Data Sources: OK - Verified strict 'Demo / Data source not connected' safety status")

    print("\nALL 9 END-TO-END HTTP INTEGRATION CHECKS PASSED PERFECTLY!")


if __name__ == "__main__":
    run_checks()

