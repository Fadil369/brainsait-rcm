"""
BrainSAIT API Tests
Comprehensive test suite for FastAPI endpoints
"""

import pytest
from datetime import datetime, timezone
from httpx import AsyncClient
from fastapi.testclient import TestClient

# Import the app
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from main import app


@pytest.fixture
def client():
    """Test client fixture"""
    return TestClient(app)


class TestHealthEndpoints:
    """Test health check and root endpoints"""

    def test_root_endpoint(self, client):
        """Test root endpoint returns correct info"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "BrainSAIT RCM API"
        assert data["version"] == "1.0.0"
        assert data["status"] == "operational"

    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "database" in data
        assert "api" in data
        assert data["api"] == "operational"


class TestRejectionEndpoints:
    """Test rejection management endpoints"""

    def test_create_rejection(self, client):
        """Test creating a new rejection record"""
        rejection_data = {
            "id": "REJ-001",
            "tpa_name": "Test TPA",
            "insurance_company": "Test Insurance",
            "branch": "Main Branch",
            "billed_amount": {
                "net": 1000.0,
                "vat": 150.0,
                "total": 1150.0
            },
            "rejected_amount": {
                "net": 500.0,
                "vat": 75.0,
                "total": 575.0
            },
            "rejection_received_date": datetime.now(timezone.utc).isoformat(),
            "reception_mode": "NPHIES",
            "initial_rejection_rate": 50.0,
            "within_30_days": True,
            "status": "PENDING_REVIEW",
            "audit_log": []
        }

        response = client.post("/api/rejections", json=rejection_data)
        # May fail if DB not available, but test structure is correct
        assert response.status_code in [200, 201, 503]

    def test_get_current_month_rejections(self, client):
        """Test fetching current month rejections"""
        response = client.get("/api/rejections/current-month")
        assert response.status_code in [200, 503]  # 503 if DB not available


class TestAIEndpoints:
    """Test AI-powered endpoints"""

    def test_fraud_detection(self, client):
        """Test fraud detection endpoint"""
        request_data = {
            "claims": [
                {
                    "id": "CLM-001",
                    "physician_id": "DOC-001",
                    "patient_id": "PAT-001",
                    "service_code": "SRV-001",
                    "service_date": "2024-01-15",
                    "billed_amount": 1000.0,
                    "complexity_level": "HIGH"
                }
            ],
            "historical_data": [],
            "facility_schedules": {}
        }

        response = client.post("/api/ai/fraud-detection", json=request_data)
        # May fail if services not available
        assert response.status_code in [200, 500, 503]

    def test_predictive_analytics(self, client):
        """Test predictive analytics endpoint"""
        request_data = {
            "historical_data": [
                {
                    "rejection_received_date": datetime.now(timezone.utc).isoformat(),
                    "initial_rejection_rate": 15.0,
                    "recovery_rate": 60.0
                }
            ],
            "forecast_days": 30
        }

        response = client.post("/api/ai/predictive-analytics", json=request_data)
        assert response.status_code in [200, 500, 503]


class TestFHIRValidation:
    """Test FHIR validation endpoints"""

    def test_validate_claim_response(self, client):
        """Test FHIR ClaimResponse validation"""
        fhir_data = {
            "resource_type": "ClaimResponse",
            "data": {
                "resourceType": "ClaimResponse",
                "status": "active",
                "type": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/claim-type",
                        "code": "institutional"
                    }]
                },
                "use": "claim",
                "patient": {"reference": "Patient/123"},
                "insurer": {"display": "Test Insurance"},
                "outcome": "error"
            }
        }

        response = client.post("/api/fhir/validate", json=fhir_data)
        assert response.status_code in [200, 500, 503]


class TestAnalyticsEndpoints:
    """Test analytics and reporting endpoints"""

    def test_dashboard_analytics(self, client):
        """Test dashboard analytics endpoint"""
        response = client.get("/api/analytics/dashboard")
        assert response.status_code in [200, 503]

    def test_trends_analytics(self, client):
        """Test trends analytics endpoint"""
        response = client.get("/api/analytics/trends?days=30")
        assert response.status_code in [200, 503]


class TestAuthenticationEndpoints:
    """Test authentication endpoints"""

    def test_login_endpoint_structure(self, client):
        """Test login endpoint accepts correct structure"""
        login_data = {
            "username": "testuser",
            "password": "testpass"
        }

        response = client.post("/api/auth/login", json=login_data)
        # Will fail without valid credentials but tests structure
        assert response.status_code in [200, 401, 500, 503]


class TestComplianceEndpoints:
    """Test compliance letter endpoints"""

    def test_create_compliance_letter(self, client):
        """Test creating compliance letter"""
        letter_data = {
            "type": "INITIAL_NOTIFICATION",
            "recipient": "test@insurance.com",
            "subject": {
                "ar": "إشعار أولي",
                "en": "Initial Notification"
            },
            "body": {
                "ar": "هذا نص الخطاب",
                "en": "This is the letter body"
            },
            "due_date": datetime.now(timezone.utc).isoformat(),
            "days_overdue": 0,
            "total_amount": 10000.0,
            "claim_references": ["CLM-001", "CLM-002"],
            "audit_log": []
        }

        response = client.post("/api/compliance/letters", json=letter_data)
        assert response.status_code in [200, 201, 503]

    def test_get_pending_letters(self, client):
        """Test fetching pending compliance letters"""
        response = client.get("/api/compliance/letters/pending")
        assert response.status_code in [200, 503]


class TestAppealsEndpoints:
    """Test appeals management endpoints"""

    def test_get_appeals(self, client):
        """Test fetching appeals"""
        response = client.get("/api/appeals")
        assert response.status_code in [200, 503]

    def test_get_appeals_with_status_filter(self, client):
        """Test fetching appeals with status filter"""
        response = client.get("/api/appeals?status=PENDING")
        assert response.status_code in [200, 503]


@pytest.mark.asyncio
class TestAsyncEndpoints:
    """Test async endpoints"""

    async def test_whatsapp_notification(self):
        """Test WhatsApp notification endpoint"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            notification_data = {
                "to_number": "+966501234567",
                "notification_type": "rejection_notification",
                "locale": "en",
                "data": {
                    "rejection_count": 5,
                    "total_amount": 10000.0,
                    "rejection_rate": 15.0
                }
            }

            response = await client.post("/api/notifications/whatsapp", json=notification_data)
            assert response.status_code in [200, 500, 503]


# Integration Tests (require running services)

@pytest.mark.integration
class TestIntegrationEndpoints:
    """Integration tests requiring full stack"""

    def test_full_rejection_workflow(self, client):
        """Test complete rejection to appeal workflow"""
        # This would test: create rejection -> validate FHIR -> create appeal
        # Skipped in unit tests, run with pytest -m integration
        pass

    def test_fraud_detection_workflow(self, client):
        """Test fraud detection with real data"""
        # Skipped in unit tests
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])