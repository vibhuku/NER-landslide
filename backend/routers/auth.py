"""Authentication endpoints: register, login, Google/Firebase OAuth, and user profile."""

from datetime import datetime, timezone
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from backend.auth.dependencies import get_current_user
from backend.auth.security import create_access_token, hash_password, verify_password
from backend.config import settings
from backend.database.db import get_db
from backend.models.schemas import (
    GoogleAuthRequest,
    ProfileUpdateRequest,
    TokenResponse,
    UserLogin,
    UserOut,
    UserRegister,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.get("/firebase-config")
def get_firebase_config():
    """Return public Firebase web client credentials from environment.
    
    Security: Only client configuration is returned; private keys are never exposed.
    Supports both VITE_FIREBASE_* and FIREBASE_* environment variables.
    """
    project_id = settings.FIREBASE_PROJECT_ID or os.getenv("VITE_FIREBASE_PROJECT_ID", "") or os.getenv("FIREBASE_PROJECT_ID", "")
    auth_domain = (
        settings.FIREBASE_AUTH_DOMAIN
        or os.getenv("VITE_FIREBASE_AUTH_DOMAIN", "")
        or os.getenv("FIREBASE_AUTH_DOMAIN", "")
        or (f"{project_id}.firebaseapp.com" if project_id else "")
    )
    storage_bucket = (
        settings.FIREBASE_STORAGE_BUCKET
        or os.getenv("VITE_FIREBASE_STORAGE_BUCKET", "")
        or os.getenv("FIREBASE_STORAGE_BUCKET", "")
        or (f"{project_id}.appspot.com" if project_id else "")
    )
    return {
        "apiKey": settings.FIREBASE_API_KEY or os.getenv("VITE_FIREBASE_API_KEY", "") or os.getenv("FIREBASE_API_KEY", ""),
        "authDomain": auth_domain,
        "projectId": project_id,
        "storageBucket": storage_bucket,
        "messagingSenderId": settings.FIREBASE_MESSAGING_SENDER_ID or os.getenv("VITE_FIREBASE_MESSAGING_SENDER_ID", "") or os.getenv("FIREBASE_MESSAGING_SENDER_ID", ""),
        "appId": settings.FIREBASE_APP_ID or os.getenv("VITE_FIREBASE_APP_ID", "") or os.getenv("FIREBASE_APP_ID", ""),
        "measurementId": settings.FIREBASE_MEASUREMENT_ID or os.getenv("VITE_FIREBASE_MEASUREMENT_ID", "") or os.getenv("FIREBASE_MEASUREMENT_ID", ""),
    }


@router.post("/google", response_model=TokenResponse)
def google_auth(req: GoogleAuthRequest):
    """Authenticate or register a public user via Google / Firebase.
    
    Security:
    - New accounts are strictly defaulted to the 'citizen' (Public) role.
    - Prevents privilege escalation: users can never choose or elevate to Officer/Admin.
    - Existing users maintain their authorized role.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    clean_email = req.email.lower().strip()
    provided_name = (req.full_name or req.display_name or "").strip()
    full_name = provided_name or clean_email.split("@")[0].title()
    photo_url = req.photo_url
    firebase_uid = req.firebase_uid or req.uid

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE email = ?",
            (clean_email,),
        )
        row = cursor.fetchone()

        if row:
            user = dict(row)
            if not user.get("is_active"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account has been suspended. Please contact administrator.",
                )
            user_id = user["id"]
            role = user["role"]  # Preserves existing role
            # Update user profile with latest Google authentication information
            update_name = provided_name or user.get("full_name") or clean_email.split("@")[0].title()
            photo_url = req.photo_url or user.get("photo_url")
            firebase_uid = firebase_uid or user.get("firebase_uid")
            try:
                cursor.execute(
                    """
                    UPDATE users
                    SET full_name = ?, photo_url = ?, firebase_uid = ?
                    WHERE id = ?
                    """,
                    (update_name, photo_url, firebase_uid, user_id),
                )
            except Exception:
                cursor.execute("UPDATE users SET full_name = ? WHERE id = ?", (update_name, user_id))
            created_at = user.get("created_at") or now_iso
            final_full_name = update_name
        else:
            user_id = f"usr-{uuid.uuid4().hex[:12]}"
            role = "citizen"  # Strictly Public for newly registered users
            created_at = now_iso
            final_full_name = full_name
            try:
                cursor.execute(
                    """
                    INSERT INTO users (id, email, hashed_password, full_name, role, is_active, created_at, photo_url, firebase_uid)
                    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
                    """,
                    (user_id, clean_email, "oauth:google", full_name, role, now_iso, photo_url, firebase_uid),
                )
            except Exception:
                cursor.execute(
                    """
                    INSERT INTO users (id, email, hashed_password, full_name, role, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, 1, ?)
                    """,
                    (user_id, clean_email, "oauth:google", full_name, role, now_iso),
                )

    token = create_access_token(
        data={"sub": user_id, "email": clean_email, "role": role}
    )

    user_info = {
        "id": user_id,
        "email": clean_email,
        "full_name": final_full_name,
        "role": role,
        "photo_url": photo_url,
        "firebase_uid": firebase_uid,
        "created_at": created_at,
    }

    return {"access_token": token, "token_type": "bearer", "user": user_info}


@router.patch("/profile", response_model=UserOut)
def update_profile(req: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Update current user's profile display name."""
    clean_name = req.full_name.strip()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET full_name = ? WHERE id = ?", (clean_name, current_user["id"]))

    current_user["full_name"] = clean_name
    return current_user


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserRegister):
    """Register a new citizen or field officer account."""
    now_iso = datetime.now(timezone.utc).isoformat()
    user_id = f"usr-{uuid.uuid4().hex[:12]}"

    with get_db() as conn:
        cursor = conn.cursor()
        # Check if email already registered
        cursor.execute("SELECT id FROM users WHERE email = ?", (req.email.lower().strip(),))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists.",
            )

        # Validate badge_id requirement for officer
        if req.role == "officer" and not req.badge_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Official Badge ID / Departmental ID is mandatory for officer registration.",
            )

        hashed = hash_password(req.password)
        cursor.execute(
            """
            INSERT INTO users (id, email, hashed_password, full_name, role, badge_id, phone, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
            """,
            (
                user_id,
                req.email.lower().strip(),
                hashed,
                req.full_name.strip(),
                req.role,
                req.badge_id.strip() if req.badge_id else None,
                req.phone.strip() if req.phone else None,
                now_iso,
            ),
        )

    # Generate JWT token
    token = create_access_token(
        data={"sub": user_id, "email": req.email.lower().strip(), "role": req.role}
    )

    user_info = {
        "id": user_id,
        "email": req.email.lower().strip(),
        "full_name": req.full_name.strip(),
        "role": req.role,
        "badge_id": req.badge_id,
        "created_at": now_iso,
    }

    return {"access_token": token, "token_type": "bearer", "user": user_info}


@router.post("/login", response_model=TokenResponse)
def login(req: UserLogin):
    """Authenticate user with email and password, issuing a JWT bearer token."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE email = ?",
            (req.email.lower().strip(),),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        user = dict(row)
        if not verify_password(req.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not user.get("is_active"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has been suspended. Please contact administrator.",
            )

    token = create_access_token(
        data={"sub": user["id"], "email": user["email"], "role": user["role"]}
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "badge_id": user.get("badge_id"),
            "photo_url": user.get("photo_url"),
            "firebase_uid": user.get("firebase_uid"),
            "created_at": user.get("created_at"),
        },
    }


@router.get("/me", response_model=UserOut)
def get_me(current_user: dict = Depends(get_current_user)):
    """Retrieve details of current authenticated user."""
    return current_user

