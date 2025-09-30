"""
BRAINSAIT: Multi-Tenant Support System
Enables multiple healthcare facilities to use the system independently
"""

import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import Depends, Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import CollectionInvalid

from .main import get_db_client

logger = logging.getLogger(__name__)


class TenantContext:
    """Tenant context for multi-tenant operations"""

    def __init__(self, tenant_id: str, tenant_name: str, database_name: str):
        self.tenant_id = tenant_id
        self.tenant_name = tenant_name
        self.database_name = database_name


class MultiTenantService:
    """Service for managing multi-tenant operations"""

    def __init__(self, db_client: AsyncIOMotorClient):
        self.db_client = db_client
        self.tenants_db = db_client.brainsait_tenants

    async def get_tenant_by_id(self, tenant_id: str) -> Optional[dict]:
        """Get tenant information by ID"""
        tenant = await self.tenants_db.tenants.find_one({"tenant_id": tenant_id})
        return tenant

    async def get_tenant_by_subdomain(self, subdomain: str) -> Optional[dict]:
        """Get tenant by subdomain"""
        tenant = await self.tenants_db.tenants.find_one({"subdomain": subdomain})
        return tenant

    async def create_tenant(self, tenant_data: dict) -> dict:
        """
        Create a new tenant with isolated database
        """
        # Validate tenant data
        required_fields = ['name', 'subdomain', 'admin_email']
        missing_fields = [field for field in required_fields if not tenant_data.get(field)]
        if missing_fields:
            raise HTTPException(
                status_code=422,
                detail=f"Missing required tenant fields: {', '.join(missing_fields)}"
            )

        # Ensure subdomain uniqueness to avoid collisions
        duplicate_checks = [
            {"subdomain": tenant_data['subdomain']},
            {"admin_email": tenant_data['admin_email']}
        ]

        if tenant_data.get('tenant_id'):
            duplicate_checks.append({"tenant_id": tenant_data['tenant_id']})

        existing = await self.tenants_db.tenants.find_one({"$or": duplicate_checks})

        if existing:
            raise HTTPException(
                status_code=409,
                detail="Tenant already exists with the provided identifier or subdomain"
            )

        # Generate unique tenant ID
        tenant_id = f"tenant_{uuid.uuid4().hex[:12]}"

        # Create tenant document
        tenant_doc = {
            "tenant_id": tenant_id,
            "name": tenant_data['name'],
            "subdomain": tenant_data['subdomain'],
            "admin_email": tenant_data['admin_email'],
            "database_name": f"brainsait_{tenant_id}",
            "status": "active",
            "plan": tenant_data.get('plan', 'standard'),
            "created_at": datetime.utcnow(),
            "settings": {
                "max_users": tenant_data.get('max_users', 50),
                "max_branches": tenant_data.get('max_branches', 10),
                "features": {
                    "fraud_detection": True,
                    "predictive_analytics": True,
                    "mobile_app": True,
                    "whatsapp_notifications": tenant_data.get('plan', 'standard') != 'basic',
                }
            }
        }

        # Insert tenant
        await self.tenants_db.tenants.insert_one(tenant_doc)

        # Initialize tenant database with collections
        await self._initialize_tenant_database(tenant_doc['database_name'])

        return tenant_doc

    async def _initialize_tenant_database(self, database_name: str):
        """Initialize collections and indexes for tenant database"""
        tenant_db = self.db_client[database_name]

        # Create collections
        collections = [
            'rejections',
            'compliance_letters',
            'users',
            'audit_logs',
            'physicians',
            'branches',
            'appeals'
        ]

        existing_collections = set(await tenant_db.list_collection_names())

        for collection_name in collections:
            if collection_name in existing_collections:
                continue
            try:
                await tenant_db.create_collection(collection_name)
            except CollectionInvalid:
                logger.debug("Collection %s already exists for %s", collection_name, database_name)

        # Create indexes
        await tenant_db.rejections.create_index([("insurance_company", 1)])
        await tenant_db.rejections.create_index([("rejection_received_date", -1)])
        await tenant_db.rejections.create_index([("status", 1)])

        await tenant_db.users.create_index([("email", 1)], unique=True)
        await tenant_db.audit_logs.create_index([("timestamp", -1)])

    async def get_tenant_database(self, tenant_id: str):
        """Get tenant-specific database"""
        tenant = await self.get_tenant_by_id(tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        return self.db_client[tenant['database_name']]

    async def verify_tenant_access(self, tenant_id: str, user_id: str) -> bool:
        """Verify user has access to tenant"""
        tenant_db = await self.get_tenant_database(tenant_id)
        user = await tenant_db.users.find_one({"id": user_id, "tenant_id": tenant_id})
        return user is not None


# Dependency for extracting tenant from request
async def get_current_tenant(
    x_tenant_id: Optional[str] = Header(None),
    host: Optional[str] = Header(None),
    db_client: AsyncIOMotorClient = Depends(get_db_client)
) -> TenantContext:
    """
    Extract tenant context from request headers
    Supports both X-Tenant-ID header and subdomain routing
    """
    tenant_service = MultiTenantService(db_client)

    tenant = None

    # Try to get tenant from header first
    if x_tenant_id:
        tenant = await tenant_service.get_tenant_by_id(x_tenant_id)

    # Try subdomain if no tenant from header
    elif host:
        subdomain = host.split('.')[0] if '.' in host else None
        if subdomain:
            tenant = await tenant_service.get_tenant_by_subdomain(subdomain)

    if not tenant:
        raise HTTPException(
            status_code=401,
            detail="Tenant not identified. Provide X-Tenant-ID header or use tenant subdomain"
        )

    return TenantContext(
        tenant_id=tenant['tenant_id'],
        tenant_name=tenant['name'],
        database_name=tenant['database_name']
    )


# Middleware for tenant isolation
async def get_tenant_db(
    tenant: TenantContext = Depends(get_current_tenant),
    db_client: AsyncIOMotorClient = Depends(get_db_client)
):
    """
    Get tenant-specific database connection
    Use this dependency in routes to ensure tenant isolation
    """
    return db_client[tenant.database_name]


# Example usage in routes:
"""
@app.get("/api/rejections")
async def get_rejections(
    tenant: TenantContext = Depends(get_current_tenant),
    db = Depends(get_tenant_db)
):
    # This will automatically query the correct tenant database
    rejections = await db.rejections.find({}).to_list(length=100)
    return rejections
"""
