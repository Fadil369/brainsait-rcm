"""
Admin router for super admin user management
"""

from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import os

from auth.models import SuperAdminInitialize, UserResponse
from auth.dependencies import require_super_admin, require_admin
from auth.password import get_password_hash

router = APIRouter(prefix="/admin", tags=["Admin"])


async def get_db() -> AsyncIOMotorDatabase:
    """Get database instance"""
    from main import db
    return db


@router.post("/super-admin/initialize", response_model=UserResponse)
async def initialize_super_admin(
    admin_data: SuperAdminInitialize,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    One-time initialization of super admin account.
    Requires SUPER_ADMIN_SETUP_KEY from environment.
    """
    # Verify setup key
    setup_key = os.getenv("SUPER_ADMIN_SETUP_KEY")
    if not setup_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Super admin setup not configured"
        )
    
    if admin_data.setup_key != setup_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid setup key"
        )
    
    # Check if super admin already exists
    existing_super_admin = await db.users.find_one({"role": "SUPER_ADMIN"})
    if existing_super_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super admin already exists. This endpoint is disabled."
        )
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": admin_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create super admin
    super_admin_doc = {
        "email": admin_data.email,
        "full_name": admin_data.full_name,
        "hashed_password": get_password_hash(admin_data.password),
        "role": "SUPER_ADMIN",
        "status": "active",
        "email_verified": True,
        "phone_verified": False,
        "auth_method": "password",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "last_login": None
    }
    
    result = await db.users.insert_one(super_admin_doc)
    
    # Log the creation
    await db.auth_events.insert_one({
        "user_id": str(result.inserted_id),
        "event_type": "super_admin_created",
        "method": "setup_key",
        "success": True,
        "ip_address": "system",
        "user_agent": "setup_script",
        "metadata": {},
        "created_at": datetime.now(timezone.utc)
    })
    
    return UserResponse(
        id=str(result.inserted_id),
        email=admin_data.email,
        full_name=admin_data.full_name,
        role="SUPER_ADMIN",
        status="active",
        email_verified=True,
        phone_verified=False,
        created_at=super_admin_doc["created_at"],
        last_login=None
    )


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    role: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    List all users with pagination and filtering.
    Requires ADMIN or SUPER_ADMIN role.
    """
    # Build query
    query = {}
    
    if role:
        query["role"] = role
    
    if status:
        query["status"] = status
    
    if search:
        query["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"username": {"$regex": search, "$options": "i"}},
            {"full_name": {"$regex": search, "$options": "i"}}
        ]
    
    # Get users
    cursor = db.users.find(query).sort("created_at", -1).skip(skip).limit(limit)
    users = await cursor.to_list(length=limit)
    
    return [
        UserResponse(
            id=str(user["_id"]),
            email=user.get("email"),
            phone=user.get("phone"),
            username=user.get("username"),
            full_name=user.get("full_name"),
            role=user.get("role", "USER"),
            status=user.get("status", "active"),
            email_verified=user.get("email_verified", False),
            phone_verified=user.get("phone_verified", False),
            created_at=user.get("created_at"),
            last_login=user.get("last_login")
        )
        for user in users
    ]


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get detailed user information.
    Requires ADMIN or SUPER_ADMIN role.
    """
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(user["_id"]),
        email=user.get("email"),
        phone=user.get("phone"),
        username=user.get("username"),
        full_name=user.get("full_name"),
        role=user.get("role", "USER"),
        status=user.get("status", "active"),
        email_verified=user.get("email_verified", False),
        phone_verified=user.get("phone_verified", False),
        created_at=user.get("created_at"),
        last_login=user.get("last_login")
    )


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    role: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(require_super_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Update user role or status.
    Requires SUPER_ADMIN role.
    """
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent modifying super admin
    if user.get("role") == "SUPER_ADMIN" and user_id != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify another super admin"
        )
    
    # Build update
    update_fields = {"updated_at": datetime.now(timezone.utc)}
    
    if role:
        valid_roles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "ANALYST", "USER"]
        if role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
            )
        update_fields["role"] = role
    
    if status:
        valid_statuses = ["active", "inactive", "suspended"]
        if status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        update_fields["status"] = status
    
    # Update user
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_fields}
    )
    
    # Log the update
    await db.auth_events.insert_one({
        "user_id": current_user["id"],
        "event_type": "user_updated",
        "method": "admin_action",
        "success": True,
        "ip_address": "admin",
        "user_agent": "admin_panel",
        "metadata": {
            "target_user_id": user_id,
            "changes": update_fields
        },
        "created_at": datetime.now(timezone.utc)
    })
    
    # Get updated user
    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    return UserResponse(
        id=str(updated_user["_id"]),
        email=updated_user.get("email"),
        phone=updated_user.get("phone"),
        username=updated_user.get("username"),
        full_name=updated_user.get("full_name"),
        role=updated_user.get("role", "USER"),
        status=updated_user.get("status", "active"),
        email_verified=updated_user.get("email_verified", False),
        phone_verified=updated_user.get("phone_verified", False),
        created_at=updated_user.get("created_at"),
        last_login=updated_user.get("last_login")
    )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_super_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Delete a user permanently.
    Requires SUPER_ADMIN role.
    """
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-deletion
    if user_id == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Prevent deleting other super admins
    if user.get("role") == "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete super admin accounts"
        )
    
    # Delete user
    await db.users.delete_one({"_id": ObjectId(user_id)})
    
    # Delete related data
    await db.oauth_providers.delete_many({"user_id": user_id})
    await db.refresh_tokens.delete_many({"user_id": user_id})
    
    # Log the deletion
    await db.auth_events.insert_one({
        "user_id": current_user["id"],
        "event_type": "user_deleted",
        "method": "admin_action",
        "success": True,
        "ip_address": "admin",
        "user_agent": "admin_panel",
        "metadata": {
            "target_user_id": user_id,
            "target_user_email": user.get("email")
        },
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"message": "User deleted successfully"}


@router.get("/audit-logs")
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user_id: Optional[str] = None,
    event_type: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get authentication audit logs.
    Requires ADMIN or SUPER_ADMIN role.
    """
    # Build query
    query = {}
    
    if user_id:
        query["user_id"] = user_id
    
    if event_type:
        query["event_type"] = event_type
    
    # Get logs
    cursor = db.auth_events.find(query).sort("created_at", -1).skip(skip).limit(limit)
    logs = await cursor.to_list(length=limit)
    
    return {
        "total": await db.auth_events.count_documents(query),
        "skip": skip,
        "limit": limit,
        "logs": [
            {
                "id": str(log["_id"]),
                "user_id": log.get("user_id"),
                "event_type": log.get("event_type"),
                "method": log.get("method"),
                "success": log.get("success"),
                "ip_address": log.get("ip_address"),
                "user_agent": log.get("user_agent"),
                "metadata": log.get("metadata", {}),
                "created_at": log.get("created_at")
            }
            for log in logs
        ]
    }


@router.get("/stats")
async def get_auth_stats(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get authentication statistics.
    Requires ADMIN or SUPER_ADMIN role.
    """
    # User counts by role
    roles_pipeline = [
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]
    roles = await db.users.aggregate(roles_pipeline).to_list(length=None)
    
    # User counts by status
    status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    statuses = await db.users.aggregate(status_pipeline).to_list(length=None)
    
    # Auth method distribution
    auth_method_pipeline = [
        {"$group": {"_id": "$auth_method", "count": {"$sum": 1}}}
    ]
    auth_methods = await db.users.aggregate(auth_method_pipeline).to_list(length=None)
    
    # Total users
    total_users = await db.users.count_documents({})
    
    # Active sessions (valid refresh tokens)
    active_sessions = await db.refresh_tokens.count_documents({
        "revoked": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    return {
        "total_users": total_users,
        "active_sessions": active_sessions,
        "users_by_role": {item["_id"]: item["count"] for item in roles},
        "users_by_status": {item["_id"]: item["count"] for item in statuses},
        "users_by_auth_method": {
            item["_id"]: item["count"] for item in auth_methods
        }
    }
