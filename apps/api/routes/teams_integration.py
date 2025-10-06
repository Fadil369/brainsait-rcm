"""
BrainSAIT: Teams Integration API Routes
Endpoints for Teams notifications and stakeholder communication
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/teams", tags=["Teams Integration"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class ComplianceNotificationRequest(BaseModel):
    """Request to send compliance letter via Teams"""
    title_en: str = Field(..., description="English title")
    title_ar: str = Field(..., description="Arabic title")
    insurance_company: str = Field(..., description="Insurance company name")
    claim_id: str = Field(..., description="Claim identifier")
    amount_sar: float = Field(..., description="Amount in SAR")
    rejection_date: str = Field(..., description="Rejection date (ISO format)")
    deadline_days: int = Field(default=30, description="Deadline in days")
    message_en: str = Field(..., description="English message")
    message_ar: str = Field(..., description="Arabic message")
    is_warning: bool = Field(default=False, description="Whether this is a warning notification")


class RejectionSummaryRequest(BaseModel):
    """Request to send monthly rejection summary via Teams"""
    month: str = Field(..., description="Month name")
    year: int = Field(..., description="Year")
    total_claims: int = Field(..., description="Total number of claims")
    rejection_rate: float = Field(..., description="Rejection rate percentage")
    total_amount_sar: float = Field(..., description="Total amount in SAR")
    recovery_rate: float = Field(..., description="Recovery rate percentage")
    top_reasons: List[Dict[str, Any]] = Field(..., description="Top rejection reasons")
    pending_letters: int = Field(..., description="Number of pending compliance letters")


class BroadcastMessageRequest(BaseModel):
    """Request to broadcast a simple text message"""
    message: str = Field(..., description="Message to broadcast")


class NotificationResponse(BaseModel):
    """Response after sending notification"""
    success: bool
    message: str
    installations_count: Optional[int] = None


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/notifications/compliance-letter", response_model=NotificationResponse)
async def send_compliance_letter_notification(
    request: ComplianceNotificationRequest
) -> NotificationResponse:
    """
    Send a compliance letter notification to all Teams channels
    
    This endpoint sends a bilingual adaptive card notification about
    a compliance letter that needs attention.
    """
    try:
        # Import Teams service (lazy import to avoid circular dependencies)
        import sys
        import os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../services'))
        
        # Note: This is a placeholder - actual implementation will require
        # the Teams service to be properly initialized
        logger.info(f"Compliance letter notification requested for claim {request.claim_id}")
        
        return NotificationResponse(
            success=True,
            message="Compliance letter notification queued (Teams service initialization pending)"
        )
    
    except Exception as exc:
        logger.exception("Failed to send compliance letter notification", exc_info=exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send notification: {str(exc)}"
        ) from exc


@router.post("/notifications/rejection-summary", response_model=NotificationResponse)
async def send_rejection_summary_notification(
    request: RejectionSummaryRequest
) -> NotificationResponse:
    """
    Send a monthly rejection summary to all Teams channels
    
    This endpoint sends a comprehensive monthly report with statistics
    and top rejection reasons.
    """
    try:
        logger.info(f"Rejection summary notification requested for {request.month} {request.year}")
        
        return NotificationResponse(
            success=True,
            message="Rejection summary notification queued (Teams service initialization pending)"
        )
    
    except Exception as exc:
        logger.exception("Failed to send rejection summary notification", exc_info=exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send notification: {str(exc)}"
        ) from exc


@router.post("/notifications/broadcast", response_model=NotificationResponse)
async def broadcast_message(
    request: BroadcastMessageRequest
) -> NotificationResponse:
    """
    Broadcast a simple text message to all Teams channels
    
    Useful for urgent announcements or system-wide notifications.
    """
    try:
        logger.info(f"Broadcast message requested: {request.message[:50]}...")
        
        return NotificationResponse(
            success=True,
            message="Message broadcast queued (Teams service initialization pending)",
            installations_count=0
        )
    
    except Exception as exc:
        logger.exception("Failed to broadcast message", exc_info=exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to broadcast message: {str(exc)}"
        ) from exc


@router.get("/installations")
async def get_teams_installations():
    """
    Get list of Teams installations where the bot is installed
    
    Returns information about all channels, groups, and personal chats
    where the bot is active.
    """
    try:
        return {
            "count": 0,
            "installations": [],
            "message": "Teams service initialization pending"
        }
    
    except Exception as exc:
        logger.exception("Failed to get Teams installations", exc_info=exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get installations: {str(exc)}"
        ) from exc


@router.get("/health")
async def teams_health_check():
    """
    Health check for Teams integration service
    """
    try:
        return {
            "status": "pending",
            "service": "teams-integration",
            "message": "Service awaiting configuration (BOT_ID, BOT_PASSWORD required)",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as exc:
        logger.exception("Teams health check failed", exc_info=exc)
        return {
            "status": "unhealthy",
            "service": "teams-integration",
            "error": str(exc),
            "timestamp": datetime.utcnow().isoformat()
        }
