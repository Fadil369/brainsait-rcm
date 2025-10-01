"""
Database indexes for authentication collections
"""

from motor.motor_asyncio import AsyncIOMotorDatabase


async def create_indexes(db: AsyncIOMotorDatabase):
    """
    Create all required indexes for authentication system.
    """
    print("Creating database indexes...")
    
    # Users collection
    await db.users.create_index("email", unique=True, sparse=True)
    await db.users.create_index("phone", unique=True, sparse=True)
    await db.users.create_index("username", unique=True, sparse=True)
    await db.users.create_index([("role", 1), ("status", 1)])
    await db.users.create_index("created_at")
    print("✓ Users indexes created")
    
    # OAuth providers collection
    await db.oauth_providers.create_index([("user_id", 1), ("provider", 1)])
    await db.oauth_providers.create_index(
        [("provider", 1), ("provider_user_id", 1)],
        unique=True
    )
    await db.oauth_providers.create_index("created_at")
    print("✓ OAuth providers indexes created")
    
    # OTP verifications collection
    await db.otp_verifications.create_index(
        [("identifier", 1), ("purpose", 1), ("verified", 1)]
    )
    await db.otp_verifications.create_index(
        "expires_at",
        expireAfterSeconds=0
    )
    print("✓ OTP verifications indexes created")
    
    # Refresh tokens collection
    await db.refresh_tokens.create_index("token_hash", unique=True)
    await db.refresh_tokens.create_index([("user_id", 1), ("created_at", -1)])
    await db.refresh_tokens.create_index(
        "expires_at",
        expireAfterSeconds=0
    )
    await db.refresh_tokens.create_index("revoked")
    print("✓ Refresh tokens indexes created")
    
    # Auth events collection (audit logs)
    await db.auth_events.create_index([("user_id", 1), ("created_at", -1)])
    await db.auth_events.create_index([("event_type", 1), ("created_at", -1)])
    await db.auth_events.create_index(
        "created_at",
        expireAfterSeconds=7776000  # 90 days
    )
    print("✓ Auth events indexes created")
    
    # Rate limits collection
    await db.rate_limits.create_index(
        [("identifier", 1), ("endpoint", 1), ("window_start", 1)]
    )
    await db.rate_limits.create_index(
        "expires_at",
        expireAfterSeconds=0
    )
    print("✓ Rate limits indexes created")
    
    print("All indexes created successfully!")
