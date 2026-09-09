"""Authoritative seed data for NERA 2.0 (North Eastern Region).

Restricted exclusively to the 8 official NER states:
- Arunachal Pradesh (AR)
- Assam (AS)
- Manipur (MN)
- Meghalaya (ML)
- Mizoram (MZ)
- Nagaland (NL)
- Sikkim (SK)
- Tripura (TR)
"""

NER_STATES_SEED = [
    {
        "name": "Arunachal Pradesh",
        "short": "AR",
        "score": 84,
        "level": "Critical",
        "rain": 118.0,
        "alerts": 2,
        "lat": 28.18,
        "lng": 94.40,
        "soil": 81.0,
        "slope": "31°",
        "elevation": "1,720 m",
        "updated": "12 min ago",
        "event": "Minor debris flow reported in Upper Subansiri",
        "data_status": "AVAILABLE"
    },
    {
        "name": "Assam",
        "short": "AS",
        "score": 43,
        "level": "Moderate",
        "rain": 74.0,
        "alerts": 0,
        "lat": 26.20,
        "lng": 92.90,
        "soil": 61.0,
        "slope": "12°",
        "elevation": "130 m",
        "updated": "15 min ago",
        "event": "No new landslide record",
        "data_status": "AVAILABLE"
    },
    {
        "name": "Meghalaya",
        "short": "ML",
        "score": 67,
        "level": "High",
        "rain": 102.0,
        "alerts": 1,
        "lat": 25.58,
        "lng": 91.88,
        "soil": 76.0,
        "slope": "26°",
        "elevation": "1,430 m",
        "updated": "9 min ago",
        "event": "Road clearance monitoring, East Khasi Hills",
        "data_status": "AVAILABLE"
    },
    {
        "name": "Manipur",
        "short": "MN",
        "score": 58,
        "level": "High",
        "rain": 89.0,
        "alerts": 0,
        "lat": 24.66,
        "lng": 93.91,
        "soil": 69.0,
        "slope": "23°",
        "elevation": "920 m",
        "updated": "17 min ago",
        "event": "No new landslide record",
        "data_status": "AVAILABLE"
    },
    {
        "name": "Mizoram",
        "short": "MZ",
        "score": 52,
        "level": "Moderate",
        "rain": 82.0,
        "alerts": 0,
        "lat": 23.16,
        "lng": 92.94,
        "soil": 65.0,
        "slope": "21°",
        "elevation": "1,040 m",
        "updated": "14 min ago",
        "event": "No new landslide record",
        "data_status": "AVAILABLE"
    },
    {
        "name": "Nagaland",
        "short": "NL",
        "score": 61,
        "level": "High",
        "rain": 93.0,
        "alerts": 1,
        "lat": 26.16,
        "lng": 94.56,
        "soil": 72.0,
        "slope": "27°",
        "elevation": "1,180 m",
        "updated": "11 min ago",
        "event": "Slope inspection recommended near Kohima",
        "data_status": "AVAILABLE"
    },
    {
        "name": "Tripura",
        "short": "TR",
        "score": 31,
        "level": "Low",
        "rain": 51.0,
        "alerts": 0,
        "lat": 23.94,
        "lng": 91.98,
        "soil": 54.0,
        "slope": "9°",
        "elevation": "55 m",
        "updated": "19 min ago",
        "event": "No new landslide record",
        "data_status": "AVAILABLE"
    },
    {
        "name": "Sikkim",
        "short": "SK",
        "score": 79,
        "level": "Critical",
        "rain": 111.0,
        "alerts": 1,
        "lat": 27.53,
        "lng": 88.51,
        "soil": 79.0,
        "slope": "33°",
        "elevation": "2,150 m",
        "updated": "8 min ago",
        "event": "Watch maintained for North Sikkim corridor",
        "data_status": "AVAILABLE"
    }
]

INITIAL_ALERTS_SEED = [
    {
        "id": "alert-ar-01",
        "state": "Arunachal Pradesh",
        "location": "Upper Subansiri Corridor",
        "level": "Warning",
        "reason": "118 mm rainfall and saturated hillslope conditions",
        "action": "Restrict travel on vulnerable road sections.",
        "time": "12 min ago",
        "status": "ACTIVE",
        "delivery_status": "SIMULATED_DEMO"
    },
    {
        "id": "alert-sk-01",
        "state": "Sikkim",
        "location": "North Sikkim corridor (NH-10)",
        "level": "Watch",
        "reason": "Elevated slope susceptibility after intense rain",
        "action": "Continue field observation and community advisory.",
        "time": "18 min ago",
        "status": "ACTIVE",
        "delivery_status": "SIMULATED_DEMO"
    },
    {
        "id": "alert-ml-01",
        "state": "Meghalaya",
        "location": "East Khasi Hills",
        "level": "Watch",
        "reason": "Rainfall accumulation above district threshold",
        "action": "Inspect known cut-slope locations.",
        "time": "24 min ago",
        "status": "ACTIVE",
        "delivery_status": "SIMULATED_DEMO"
    },
    {
        "id": "alert-nl-01",
        "state": "Nagaland",
        "location": "Kohima periphery",
        "level": "Watch",
        "reason": "High soil moisture on steep terrain",
        "action": "Notify district control room.",
        "time": "31 min ago",
        "status": "ACTIVE",
        "delivery_status": "SIMULATED_DEMO"
    }
]

VILLAGES_SEED = [
    {
        "id": "vil-ar-01",
        "name": "Daporijo Hills",
        "state_code": "AR",
        "district": "Upper Subansiri",
        "population": 14200,
        "slope_deg": 32.5,
        "risk_score": 83,
        "risk_level": "Critical",
        "lat": 27.98,
        "lng": 94.22
    },
    {
        "id": "vil-sk-01",
        "name": "Chungthang",
        "state_code": "SK",
        "district": "Mangan (North Sikkim)",
        "population": 4800,
        "slope_deg": 34.0,
        "risk_score": 88,
        "risk_level": "Critical",
        "lat": 27.60,
        "lng": 88.65
    },
    {
        "id": "vil-ml-01",
        "name": "Cherrapunjee Ridge",
        "state_code": "ML",
        "district": "East Khasi Hills",
        "population": 11780,
        "slope_deg": 28.0,
        "risk_score": 69,
        "risk_level": "High",
        "lat": 25.29,
        "lng": 91.72
    },
    {
        "id": "vil-nl-01",
        "name": "Jotsoma Slope",
        "state_code": "NL",
        "district": "Kohima",
        "population": 6200,
        "slope_deg": 27.5,
        "risk_score": 64,
        "risk_level": "High",
        "lat": 25.67,
        "lng": 94.07
    },
    {
        "id": "vil-mn-01",
        "name": "Noney Valley",
        "state_code": "MN",
        "district": "Noney",
        "population": 5400,
        "slope_deg": 25.0,
        "risk_score": 59,
        "risk_level": "High",
        "lat": 24.82,
        "lng": 93.60
    },
    {
        "id": "vil-mz-01",
        "name": "Sairang Foothills",
        "state_code": "MZ",
        "district": "Aizawl",
        "population": 7300,
        "slope_deg": 22.0,
        "risk_score": 53,
        "risk_level": "Moderate",
        "lat": 23.78,
        "lng": 92.65
    }
]

ROADS_SEED = [
    {
        "id": "rd-sk-nh10",
        "highway_code": "NH-10",
        "name": "Siliguri-Gangtok Highway",
        "state_code": "SK",
        "vulnerable_stretch_km": 42.5,
        "status": "RESTRICTED",
        "elevation_m": 1650.0,
        "lat": 27.25,
        "lng": 88.48
    },
    {
        "id": "rd-ar-nh13",
        "highway_code": "NH-13",
        "name": "Trans-Arunachal Highway (Subansiri-Siang)",
        "state_code": "AR",
        "vulnerable_stretch_km": 68.0,
        "status": "RESTRICTED",
        "elevation_m": 1820.0,
        "lat": 28.12,
        "lng": 94.35
    },
    {
        "id": "rd-ml-nh6",
        "highway_code": "NH-6",
        "name": "Shillong-Silchar Arterial Corridor",
        "state_code": "ML",
        "vulnerable_stretch_km": 31.0,
        "status": "MONITORED",
        "elevation_m": 1350.0,
        "lat": 25.48,
        "lng": 92.15
    },
    {
        "id": "rd-nl-nh29",
        "highway_code": "NH-29",
        "name": "Dimapur-Kohima Ghat Section",
        "state_code": "NL",
        "vulnerable_stretch_km": 24.5,
        "status": "MONITORED",
        "elevation_m": 1210.0,
        "lat": 25.75,
        "lng": 93.92
    }
]

HISTORICAL_LANDSLIDES_SEED = [
    {
        "id": "hist-01",
        "location": "Upper Subansiri, AR",
        "state_code": "AR",
        "date": "Jul 2024",
        "severity": "High",
        "trigger": "Prolonged rainfall",
        "lat": 28.15,
        "lng": 94.38
    },
    {
        "id": "hist-02",
        "location": "East Khasi Hills, ML",
        "state_code": "ML",
        "date": "Jun 2024",
        "severity": "Moderate",
        "trigger": "Slope saturation",
        "lat": 25.55,
        "lng": 91.85
    },
    {
        "id": "hist-03",
        "location": "North Sikkim, SK",
        "state_code": "SK",
        "date": "Oct 2023",
        "severity": "Critical",
        "trigger": "Extreme rainfall",
        "lat": 27.55,
        "lng": 88.52
    },
    {
        "id": "hist-04",
        "location": "Noney Tupul Yard, MN",
        "state_code": "MN",
        "date": "Jun 2022",
        "severity": "Critical",
        "trigger": "Continuous monsoon deluge & cut-slope failure",
        "lat": 24.81,
        "lng": 93.62
    }
]

