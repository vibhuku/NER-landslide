#!/usr/bin/env bash
# ==============================================================================
# NERA 2.0 - Startup and Test Automation Script
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=========================================="
echo "      NERA 2.0 - Startup & Tests          "
echo "=========================================="

echo "[1/3] Running automated unit & API test suite..."
python3 -m unittest discover -s tests -p "test_*.py" -v

echo "[2/3] Initializing database & seed records..."
python3 -m backend.database.init_db

echo "[3/3] Starting NERA 2.0 Unified Server..."
echo "Dashboard UI: http://localhost:8000"
echo "Swagger Docs: http://localhost:8000/docs"
echo "ReDoc:        http://localhost:8000/redoc"
echo "=========================================="
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

