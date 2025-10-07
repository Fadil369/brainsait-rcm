"""
Pytest configuration and fixtures for claims-scrubbing service tests.
"""
import pytest
import sys
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    from unittest.mock import Mock
    settings = Mock()
    settings.MONGODB_URI = "mongodb://localhost:27017"
    settings.MONGODB_DB_NAME = "test_brainsait"
    settings.REDIS_URL = "redis://localhost:6379/0"
    settings.ML_INFERENCE_URL = "http://localhost:8001"
    settings.NPHIES_API_URL = "http://localhost:8002"
    settings.CORS_ORIGINS = ["http://localhost:3000"]
    return settings


@pytest.fixture
def sample_claim_request():
    """Sample claim validation request for testing."""
    return {
        "claimId": "CLM-2024-001",
        "patientId": "PAT-123456",
        "providerId": "PRV-789",
        "payerId": "PAYER-001",
        "payerName": "Test Insurance Company",
        "items": [
            {
                "code": "99213",
                "description": "Office visit",
                "quantity": 1,
                "unitPrice": 150.0,
                "total": 150.0
            }
        ],
        "totalAmount": 150.0,
        "diagnoses": ["J06.9"],
        "dateOfService": "2024-01-15"
    }
