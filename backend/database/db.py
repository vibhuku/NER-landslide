"""Database connection and execution manager for NERA 2.0.

Provides transparent dual-backend support:
1. PostgreSQL (+ PostGIS) if DATABASE_URL is set to postgresql:// and driver is available.
2. Relational SQLite with row factory and spatial calculations for local zero-dependency runtime.
"""

from contextlib import contextmanager
import math
from pathlib import Path
import sqlite3
from typing import Any, Generator
from backend.config import settings


def dict_factory(cursor: sqlite3.Cursor, row: tuple) -> dict:
    """Map cursor row to a python dict."""
    fields = [col[0] for col in cursor.description]
    return dict(zip(fields, row))


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two points on earth in kilometers."""
    r = 6371.0  # Earth's radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (
        math.sin(dphi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def get_sqlite_db_path() -> Path:
    """Extract SQLite path from connection string."""
    url = settings.DATABASE_URL
    if url.startswith("sqlite:///"):
        raw_path = url[len("sqlite:///"):]
        return Path(raw_path).resolve()
    return (settings.BASE_DIR / "nera.db").resolve()


class DialectCursor:
    """Cursor wrapper that transparently adapts SQL parameter syntax across engines."""

    def __init__(self, cursor, is_postgres: bool = False):
        self._cursor = cursor
        self._is_postgres = is_postgres

    def execute(self, sql: str, params=None):
        if self._is_postgres and params is not None:
            sql = sql.replace("?", "%s")
        if params is not None:
            return self._cursor.execute(sql, params)
        return self._cursor.execute(sql)

    def executemany(self, sql: str, seq_of_params):
        if self._is_postgres:
            sql = sql.replace("?", "%s")
        return self._cursor.executemany(sql, seq_of_params)

    def __iter__(self):
        return iter(self._cursor)

    def __getattr__(self, name: str):
        return getattr(self._cursor, name)


class DialectConnection:
    """Connection wrapper adapting cursor instantiation."""

    def __init__(self, raw_conn, is_postgres: bool = False):
        self._conn = raw_conn
        self._is_postgres = is_postgres

    def cursor(self):
        return DialectCursor(self._conn.cursor(), self._is_postgres)

    def execute(self, sql: str, params=None):
        cur = self.cursor()
        cur.execute(sql, params)
        return cur

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        return self._conn.close()

    def __getattr__(self, name: str):
        return getattr(self._conn, name)


@contextmanager
def get_db() -> Generator[Any, None, None]:
    """Yield database connection with row factory and foreign keys enabled."""
    # Check if postgres driver is requested and available
    if settings.DATABASE_URL.startswith("postgresql://") or settings.DATABASE_URL.startswith("postgres://"):
        try:
            import psycopg2
            import psycopg2.extras
            raw_conn = psycopg2.connect(settings.DATABASE_URL)
            raw_conn.cursor_factory = psycopg2.extras.RealDictCursor
            conn = DialectConnection(raw_conn, is_postgres=True)
            try:
                yield conn
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()
            return
        except ImportError:
            # Fall back to SQLite gracefully
            pass

    # Standard SQLite connection
    db_path = get_sqlite_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    raw_conn = sqlite3.connect(str(db_path), timeout=20.0)
    raw_conn.row_factory = sqlite3.Row
    raw_conn.execute("PRAGMA foreign_keys = ON")
    raw_conn.execute("PRAGMA journal_mode = WAL")
    conn = DialectConnection(raw_conn, is_postgres=False)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

