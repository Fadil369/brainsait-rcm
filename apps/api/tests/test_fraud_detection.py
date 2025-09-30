"""
Tests for Fraud Detection Service
"""

import pytest
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../services/fraud-detection/src'))
from fraud_detector import FraudDetector, run_fraud_detection


class TestFraudDetector:
    """Test fraud detection algorithms"""

    @pytest.fixture
    def detector(self):
        return FraudDetector()

    @pytest.fixture
    def sample_claims(self):
        return [
            {
                "id": "CLM-001",
                "physician_id": "DOC-001",
                "patient_id": "PAT-001",
                "service_code": "SRV-001",
                "service_date": "2024-01-15",
                "billed_amount": 1000.0,
                "complexity_level": "HIGH"
            },
            {
                "id": "CLM-002",
                "physician_id": "DOC-001",
                "patient_id": "PAT-001",
                "service_code": "SRV-001",
                "service_date": "2024-01-15",
                "billed_amount": 1000.0,
                "complexity_level": "HIGH"
            }
        ]

    def test_duplicate_billing_detection(self, detector, sample_claims):
        """Test duplicate billing detection"""
        alerts = detector.detect_duplicate_billing(sample_claims)
        assert len(alerts) > 0
        assert alerts[0]["type"] == "DUPLICATE"
        assert alerts[0]["severity"] in ["MEDIUM", "HIGH"]

    def test_unbundling_detection(self, detector):
        """Test unbundling detection"""
        claims = [
            {
                "id": "CLM-001",
                "physician_id": "DOC-001",
                "patient_id": "PAT-001",
                "service_code": "LAB001",
                "service_date": "2024-01-15",
                "billed_amount": 100.0
            },
            {
                "id": "CLM-002",
                "physician_id": "DOC-001",
                "patient_id": "PAT-001",
                "service_code": "LAB002",
                "service_date": "2024-01-15",
                "billed_amount": 100.0
            },
            {
                "id": "CLM-003",
                "physician_id": "DOC-001",
                "patient_id": "PAT-001",
                "service_code": "LAB003",
                "service_date": "2024-01-15",
                "billed_amount": 100.0
            }
        ]

        alerts = detector.detect_unbundling(claims)
        # Should detect LAB_PANEL unbundling
        assert any(alert["type"] == "UNBUNDLING" for alert in alerts)

    def test_physician_risk_analysis(self, detector, sample_claims):
        """Test physician risk scoring"""
        alerts = detector.detect_duplicate_billing(sample_claims)
        risk = detector.analyze_physician_risk("DOC-001", sample_claims, alerts)

        assert "risk_score" in risk
        assert "risk_level" in risk
        assert risk["risk_level"] in ["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
        assert "requires_investigation" in risk

    def test_upcoding_detection(self, detector):
        """Test upcoding detection"""
        current_claims = [
            {
                "physician_id": "DOC-001",
                "complexity_level": "HIGH",
                "billed_amount": 500.0
            }
        ] * 20

        historical_claims = [
            {
                "physician_id": "DOC-001",
                "complexity_level": "LOW",
                "billed_amount": 200.0
            }
        ] * 50

        alerts = detector.detect_upcoding(current_claims, historical_claims)
        assert any(alert["type"] == "UPCODING" for alert in alerts)

    def test_run_fraud_detection(self, sample_claims):
        """Test comprehensive fraud detection"""
        result = run_fraud_detection(sample_claims)

        assert "alerts" in result
        assert "total_alerts" in result
        assert "alerts_by_severity" in result
        assert "alerts_by_type" in result
        assert "physician_risks" in result
        assert "analysis_timestamp" in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])