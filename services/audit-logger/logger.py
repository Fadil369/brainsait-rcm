"""
BrainSAIT: HIPAA-Compliant Audit Logger
Logs all data access and modifications for compliance
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AuditEvent(BaseModel):
    """HIPAA-compliant audit event"""
    timestamp: datetime
    event_type: str  # ACCESS, CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT
    user_id: str
    username: str
    resource_type: str  # Patient, Claim, Rejection, etc.
    resource_id: Optional[str] = None
    action: str  # Read, Write, Delete, etc.
    status: str  # SUCCESS, FAILURE
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    phi_accessed: bool = False  # Protected Health Information accessed
    changes: Optional[Dict[str, Any]] = None  # Before/after for updates


class AuditLogger:
    """Audit logging service"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.audit_log

    async def log_event(self, event: AuditEvent) -> bool:
        """Log an audit event"""
        try:
            await self.collection.insert_one(event.model_dump(mode='json'))

            # Also log to file for backup
            if event.phi_accessed:
                logger.warning(
                    f"PHI ACCESS: {event.user_id} accessed {event.resource_type}/{event.resource_id}"
                )

            return True
        except Exception as e:
            logger.exception(f"Failed to log audit event: {e}")
            return False

    async def log_data_access(
        self,
        user_id: str,
        username: str,
        resource_type: str,
        resource_id: str,
        action: str = "READ",
        phi_accessed: bool = True,
        ip_address: Optional[str] = None,
        details: Optional[Dict] = None
    ) -> bool:
        """Log data access event"""
        event = AuditEvent(
            timestamp=datetime.now(timezone.utc),
            event_type="ACCESS",
            user_id=user_id,
            username=username,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            status="SUCCESS",
            ip_address=ip_address,
            details=details,
            phi_accessed=phi_accessed
        )
        return await self.log_event(event)

    async def log_data_modification(
        self,
        user_id: str,
        username: str,
        resource_type: str,
        resource_id: str,
        action: str,  # CREATE, UPDATE, DELETE
        changes: Optional[Dict] = None,
        ip_address: Optional[str] = None
    ) -> bool:
        """Log data modification event"""
        event = AuditEvent(
            timestamp=datetime.now(timezone.utc),
            event_type=action,
            user_id=user_id,
            username=username,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            status="SUCCESS",
            ip_address=ip_address,
            changes=changes,
            phi_accessed=True
        )
        return await self.log_event(event)

    async def log_authentication(
        self,
        user_id: str,
        username: str,
        action: str,  # LOGIN, LOGOUT
        success: bool,
        ip_address: Optional[str] = None,
        details: Optional[Dict] = None
    ) -> bool:
        """Log authentication event"""
        event = AuditEvent(
            timestamp=datetime.now(timezone.utc),
            event_type=action,
            user_id=user_id,
            username=username,
            resource_type="Authentication",
            action=action,
            status="SUCCESS" if success else "FAILURE",
            ip_address=ip_address,
            details=details,
            phi_accessed=False
        )
        return await self.log_event(event)

    async def log_data_export(
        self,
        user_id: str,
        username: str,
        export_type: str,  # PDF, Excel, CSV
        record_count: int,
        ip_address: Optional[str] = None
    ) -> bool:
        """Log data export event"""
        event = AuditEvent(
            timestamp=datetime.now(timezone.utc),
            event_type="EXPORT",
            user_id=user_id,
            username=username,
            resource_type="Report",
            action="EXPORT",
            status="SUCCESS",
            ip_address=ip_address,
            details={
                "export_type": export_type,
                "record_count": record_count
            },
            phi_accessed=True
        )
        return await self.log_event(event)

    async def get_user_activity(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> list:
        """Get audit trail for a specific user"""
        query = {"user_id": user_id}

        if start_date or end_date:
            query["timestamp"] = {}
            if start_date:
                query["timestamp"]["$gte"] = start_date
            if end_date:
                query["timestamp"]["$lte"] = end_date

        cursor = self.collection.find(query).sort("timestamp", -1).limit(limit)
        return await cursor.to_list(length=limit)

    async def get_resource_history(
        self,
        resource_type: str,
        resource_id: str,
        limit: int = 50
    ) -> list:
        """Get audit trail for a specific resource"""
        cursor = self.collection.find({
            "resource_type": resource_type,
            "resource_id": resource_id
        }).sort("timestamp", -1).limit(limit)

        return await cursor.to_list(length=limit)

    async def get_phi_access_report(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """Generate PHI access report for compliance"""
        pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": start_date, "$lte": end_date},
                    "phi_accessed": True
                }
            },
            {
                "$group": {
                    "_id": {
                        "user_id": "$user_id",
                        "resource_type": "$resource_type"
                    },
                    "access_count": {"$sum": 1},
                    "first_access": {"$min": "$timestamp"},
                    "last_access": {"$max": "$timestamp"}
                }
            }
        ]

        results = await self.collection.aggregate(pipeline).to_list(length=1000)

        return {
            "report_period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_phi_accesses": len(results),
            "access_by_user": results
        }

    async def detect_suspicious_activity(self) -> list:
        """Detect suspicious access patterns"""
        suspicious_events = []

        # Check for unusual access patterns in last 24 hours
        from datetime import timedelta
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)

        # Multiple failed login attempts
        failed_logins = await self.collection.count_documents({
            "timestamp": {"$gte": yesterday},
            "event_type": "LOGIN",
            "status": "FAILURE"
        })

        if failed_logins > 5:
            suspicious_events.append({
                "type": "MULTIPLE_FAILED_LOGINS",
                "severity": "HIGH",
                "count": failed_logins,
                "description": f"{failed_logins} failed login attempts in last 24 hours"
            })

        # Unusual data export volume
        exports = await self.collection.count_documents({
            "timestamp": {"$gte": yesterday},
            "event_type": "EXPORT"
        })

        if exports > 20:
            suspicious_events.append({
                "type": "EXCESSIVE_EXPORTS",
                "severity": "MEDIUM",
                "count": exports,
                "description": f"{exports} data exports in last 24 hours"
            })

        # Access from multiple IPs
        pipeline = [
            {"$match": {"timestamp": {"$gte": yesterday}}},
            {"$group": {
                "_id": "$user_id",
                "ip_addresses": {"$addToSet": "$ip_address"},
                "access_count": {"$sum": 1}
            }},
            {"$match": {"ip_addresses": {"$exists": True, "$size": {"$gt": 3}}}}
        ]

        multi_ip_users = await self.collection.aggregate(pipeline).to_list(length=100)

        for user in multi_ip_users:
            suspicious_events.append({
                "type": "MULTIPLE_IP_ADDRESSES",
                "severity": "MEDIUM",
                "user_id": user["_id"],
                "ip_count": len(user["ip_addresses"]),
                "description": f"User accessed from {len(user['ip_addresses'])} different IPs"
            })

        return suspicious_events


# Convenience functions for direct use

async def audit_log(
    db: AsyncIOMotorDatabase,
    event_type: str,
    user_id: str,
    username: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    action: str = "",
    details: Optional[Dict] = None,
    ip_address: Optional[str] = None
):
    """Quick audit log function"""
    logger_service = AuditLogger(db)
    event = AuditEvent(
        timestamp=datetime.now(timezone.utc),
        event_type=event_type,
        user_id=user_id,
        username=username,
        resource_type=resource_type,
        resource_id=resource_id,
        action=action,
        status="SUCCESS",
        ip_address=ip_address,
        details=details,
        phi_accessed=resource_type in ["Patient", "Claim", "Rejection"]
    )
    await logger_service.log_event(event)