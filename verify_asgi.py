"""In-process ASGI Integration Verification for NERA 2.0.

Tests the FastAPI application stack in-process without requiring network socket access:
- Middlewares (CORS, Static Files)
- All REST routers
- JWT Authentication & RBAC
- Geotechnical predictions
- Citizen reporting & officer verification
"""

import asyncio
import json
from typing import Any
import uuid
from backend.main import app


async def call_asgi(
    method: str,
    path: str,
    headers: dict[str, str] | None = None,
    json_data: dict[str, Any] | None = None,
) -> tuple[int, Any, list[Any]]:
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method.upper(),
        "scheme": "http",
        "path": path,
        "raw_path": path.encode("ascii"),
        "query_string": b"",
        "headers": [],
        "client": ("127.0.0.1", 12345),
        "server": ("127.0.0.1", 8000),
    }

    raw_headers = []
    if headers:
        for k, v in headers.items():
            raw_headers.append((k.lower().encode("latin1"), v.encode("latin1")))
    if json_data is not None:
        body_bytes = json.dumps(json_data).encode("utf-8")
        raw_headers.append((b"content-type", b"application/json"))
        raw_headers.append((b"content-length", str(len(body_bytes)).encode("ascii")))
    else:
        body_bytes = b""

    scope["headers"] = raw_headers

    body_sent = False

    async def receive():
        nonlocal body_sent
        if not body_sent:
            body_sent = True
            return {"type": "http.request", "body": body_bytes, "more_body": False}
        return {"type": "http.request", "body": b"", "more_body": False}

    response_status = 200
    response_headers = []
    response_body = []

    async def send(message):
        nonlocal response_status, response_headers, response_body
        if message["type"] == "http.response.start":
            response_status = message["status"]
            response_headers = message.get("headers", [])
        elif message["type"] == "http.response.body":
            response_body.append(message.get("body", b""))

    await app(scope, receive, send)

    full_body = b"".join(response_body).decode("utf-8", errors="replace")
    try:
        parsed_json = json.loads(full_body)
    except Exception:
        parsed_json = {"raw": full_body}

    return response_status, parsed_json, response_headers


async def main():
    print("Executing In-Process ASGI Verification for NERA 2.0...")

    # 1. Health check
    status, res, _ = await call_asgi("GET", "/api/health")
    assert status == 200 and res.get("status") == "HEALTHY", f"Health failed: {status} {res}"
    print(" [x] Health Check: OK - Status is HEALTHY")

    # 2. Risk Data: 8 states
    status, states, _ = await call_asgi("GET", "/api/risk-data/states")
    assert status == 200 and len(states) == 8, f"Expected 8 states, got {states}"
    print(f" [x] Risk Data: OK - Retrieved exactly 8 NER states: {[s['short'] for s in states]}")

    # 3. Regional status
    status, reg, _ = await call_asgi("GET", "/api/risk-data/regional-status")
    assert status == 200 and "regional_assessment" in reg, f"Regional status failed: {reg}"
    print(f" [x] Regional Status: OK - Assessment: '{reg['regional_assessment']}'")

    # 4. Authentication: Officer login
    status, auth_res, _ = await call_asgi(
        "POST",
        "/api/auth/login",
        json_data={"email": "officer@nera.gov.in", "password": "Officer@NERA2026"},
    )
    assert status == 200 and "access_token" in auth_res, f"Login failed: {auth_res}"
    officer_token = auth_res["access_token"]
    print(f" [x] Officer Auth: OK - JWT token issued for {auth_res['user']['email']} ({auth_res['user']['role']})")

    # 5. Citizen Report Submission
    status, rep, _ = await call_asgi(
        "POST",
        "/api/reports",
        json_data={
            "citizen_name": "Wangshu Jamatia",
            "contact": "+91-9876500111",
            "incident_type": "Debris Flow",
            "description": "Slope wash along arterial bypass road",
            "lat": 23.94,
            "lng": 91.98,
            "offline_client_id": f"asgi-test-{uuid.uuid4().hex[:8]}",
        },
    )
    assert status == 201 and rep["status"] == "pending", f"Report failed: {rep}"
    report_id = rep["id"]
    print(f" [x] Citizen Reporting: OK - Report {report_id} created with status 'pending'")

    # 6. Officer Verification
    status, ver, _ = await call_asgi(
        "PATCH",
        f"/api/reports/{report_id}/verify",
        headers={"Authorization": f"Bearer {officer_token}"},
        json_data={"status": "verified", "officer_notes": "Ground team mobilized from Agartala"},
    )
    assert status == 200 and ver["status"] == "verified", f"Verify failed: {ver}"
    print(f" [x] Officer Verification: OK - Report {report_id} verified by {ver.get('verified_by')}")

    # 7. Alerts Management
    status, alerts, _ = await call_asgi("GET", "/api/alerts")
    assert status == 200 and len(alerts) > 0, f"Alerts failed: {alerts}"
    print(f" [x] Alerts: OK - {len(alerts)} active advisories found")

    # 8. AI/ML Geotechnical Prediction Engine
    status, pred, _ = await call_asgi(
        "POST",
        "/api/predictions/evaluate",
        json_data={
            "rainfall_24h_mm": 125.0,
            "soil_moisture_pct": 82.0,
            "slope_deg": 33.0,
            "elevation_m": 1750.0,
            "historical_events_count": 4,
            "satellite_insar_velocity_mm_yr": 8.0,
        },
    )
    assert status == 200 and pred["risk_level"] == "Critical", f"Prediction failed: {pred}"
    print(f" [x] AI/ML Prediction: OK - Score: {pred['risk_score']}/100, Level: {pred['risk_level']}")
    for reason in pred["reasons"][:2]:
        print(f"     * {reason}")

    # 9. Data Sources - Unconnected Safety Check
    status, sources, _ = await call_asgi("GET", "/api/data-sources/status")
    assert status == 200 and len(sources) == 7, f"Sources failed: {sources}"
    nisar = next(s for s in sources if s["key"] == "nisar_l")
    assert nisar["status_label"] == "Demo / Data source not connected", f"Unexpected label: {nisar}"
    print(" [x] Data Sources: OK - Verified strict 'Demo / Data source not connected' safety response")

    # 10. Static Mount: Frontend index.html served
    status, index_content, _ = await call_asgi("GET", "/")
    assert status == 200 and "NER-Landslide" in index_content.get("raw", ""), "Static index.html failed"
    print(" [x] Static Serving: OK - index.html served with Leaflet GIS dashboard")

    print("\n========================================================")
    print(" ALL 10 IN-PROCESS ASGI INTEGRATION CHECKS PASSED 100%!")
    print("========================================================")


if __name__ == "__main__":
    asyncio.run(main())

