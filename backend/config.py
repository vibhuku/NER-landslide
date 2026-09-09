"""Configuration management for NERA 2.0.

Loads settings from environment variables and .env file safely.
Never exposes sensitive secrets in logs or API responses.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env if present
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()


class Settings:
    """Application settings with safe defaults and credential auditing."""

    BASE_DIR: Path = BASE_DIR
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:8000")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "nera_super_secret_dev_key_2026_change_in_production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    ALLOWED_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
        if origin.strip()
    ]

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'nera.db'}")

    # Uploads storage directory
    UPLOAD_DIR: Path = BASE_DIR / "backend" / "uploads"

    # External credentials (only inspected for presence, never logged)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Firebase Web Client (reads VITE_* or standard prefixes)
    FIREBASE_API_KEY: str = os.getenv("VITE_FIREBASE_API_KEY") or os.getenv("FIREBASE_API_KEY", "")
    FIREBASE_AUTH_DOMAIN: str = os.getenv("VITE_FIREBASE_AUTH_DOMAIN") or os.getenv("FIREBASE_AUTH_DOMAIN", "")
    FIREBASE_PROJECT_ID: str = os.getenv("VITE_FIREBASE_PROJECT_ID") or os.getenv("FIREBASE_PROJECT_ID", "")
    FIREBASE_STORAGE_BUCKET: str = os.getenv("VITE_FIREBASE_STORAGE_BUCKET") or os.getenv("FIREBASE_STORAGE_BUCKET", "")
    FIREBASE_MESSAGING_SENDER_ID: str = os.getenv("VITE_FIREBASE_MESSAGING_SENDER_ID") or os.getenv("FIREBASE_MESSAGING_SENDER_ID", "")
    FIREBASE_APP_ID: str = os.getenv("VITE_FIREBASE_APP_ID") or os.getenv("FIREBASE_APP_ID", "")
    FIREBASE_MEASUREMENT_ID: str = os.getenv("VITE_FIREBASE_MEASUREMENT_ID") or os.getenv("FIREBASE_MEASUREMENT_ID", "")

    # Firebase Admin SDK & Push Notifications (Backend Only)
    FIREBASE_CLIENT_EMAIL: str = os.getenv("FIREBASE_CLIENT_EMAIL", "")
    FIREBASE_PRIVATE_KEY: str = os.getenv("FIREBASE_PRIVATE_KEY", "")
    FCM_SERVER_KEY: str = os.getenv("FCM_SERVER_KEY", "")

    SMS_PROVIDER_API_KEY: str = os.getenv("SMS_PROVIDER_API_KEY", "")
    SMS_PROVIDER_SENDER_ID: str = os.getenv("SMS_PROVIDER_SENDER_ID", "NERA_ALERT")

    RAINFALL_API_KEY: str = os.getenv("RAINFALL_API_KEY", "")
    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "")

    NISAR_BHOONIDHI_API_KEY: str = os.getenv("NISAR_BHOONIDHI_API_KEY", "")
    NISAR_BHOONIDHI_ENDPOINT: str = os.getenv(
        "NISAR_BHOONIDHI_ENDPOINT", "https://bhoonidhi.nrsc.gov.in/api/v1"
    )

    @classmethod
    def is_fcm_configured(cls) -> bool:
        return bool(cls.FCM_SERVER_KEY or (cls.FIREBASE_PROJECT_ID and cls.FIREBASE_PRIVATE_KEY))

    @classmethod
    def is_sms_configured(cls) -> bool:
        return bool(cls.SMS_PROVIDER_API_KEY)

    @classmethod
    def is_weather_configured(cls) -> bool:
        return bool(cls.WEATHER_API_KEY or cls.RAINFALL_API_KEY)

    @classmethod
    def is_nisar_configured(cls) -> bool:
        return bool(cls.NISAR_BHOONIDHI_API_KEY)

    @classmethod
    def is_gemini_configured(cls) -> bool:
        return bool(cls.GEMINI_API_KEY)


settings = Settings()

# Ensure uploads directory exists
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

