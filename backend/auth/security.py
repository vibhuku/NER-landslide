"""Cryptographic security utilities for NERA 2.0.

Provides PBKDF2-HMAC-SHA256 password hashing with random salt and
HMAC-SHA256 based standard JWT generation and verification.
"""

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any, Optional
from backend.config import settings

PBKDF2_ITERATIONS = 600_000


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 32-byte salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored PBKDF2-HMAC-SHA256 hash."""
    try:
        parts = hashed_password.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = parts[2]
        expected_key = parts[3]

        computed_key = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        ).hex()

        return hmac.compare_digest(computed_key, expected_key)
    except Exception:
        return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    padding = 4 - (len(s) % 4)
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s.encode("ascii"))


def create_access_token(data: dict[str, Any], expires_delta_seconds: Optional[int] = None) -> str:
    """Create a signed JWT token using HMAC-SHA256."""
    to_encode = data.copy()
    now = int(time.time())
    if expires_delta_seconds is not None:
        expire = now + expires_delta_seconds
    else:
        expire = now + (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {**to_encode, "iat": now, "exp": expire}

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    sig_b64 = _b64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    """Verify signature and expiration of JWT token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            signing_input,
            hashlib.sha256,
        ).digest()
        computed_sig_b64 = _b64url_encode(expected_sig)

        if not hmac.compare_digest(sig_b64, computed_sig_b64):
            return None

        payload_bytes = _b64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))

        # Verify expiration
        exp = payload.get("exp")
        if exp and int(time.time()) > exp:
            return None

        return payload
    except Exception:
        return None

