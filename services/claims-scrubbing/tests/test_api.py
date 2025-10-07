"""
Basic API tests for Claims Scrubbing Service
"""
import pytest


def test_placeholder():
    """Placeholder test to ensure pytest runs successfully."""
    assert True


def test_sample_claim_request_fixture(sample_claim_request):
    """Test that the sample claim request fixture works."""
    assert sample_claim_request["claimId"] == "CLM-2024-001"
    assert sample_claim_request["totalAmount"] == 150.0
    assert len(sample_claim_request["items"]) == 1
