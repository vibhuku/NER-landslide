"""User management endpoints (restricted to Admin)."""

from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from backend.auth.dependencies import require_admin
from backend.database.db import get_db
from backend.models.schemas import UserOut

router = APIRouter(prefix="/api/users", tags=["Users Management"])


class RoleUpdateRequest(BaseModel):
    role: Literal["citizen", "officer", "admin"]


@router.get("", response_model=list[UserOut])
def list_users(admin: dict = Depends(require_admin)):
    """List all registered users (Admin only)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, full_name, role, badge_id, created_at FROM users ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


@router.patch("/{user_id}/role")
def update_user_role(user_id: str, req: RoleUpdateRequest, admin: dict = Depends(require_admin)):
    """Promote or demote user roles (Admin only)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, role FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        cursor.execute("UPDATE users SET role = ? WHERE id = ?", (req.role, user_id))

    return {"message": f"User role updated to '{req.role}' successfully", "user_id": user_id, "new_role": req.role}
