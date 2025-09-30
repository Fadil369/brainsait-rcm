"""
BRAINSAIT: AI-Powered Fraud Detection Service
Detects patterns: Duplicate, Unbundling, Upcoding, Phantom Billing
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FraudDetector:
    """
    AI-powered fraud detection for medical claims
    """

    def __init__(self):
        self.isolation_forest = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100
        )
        self.scaler = StandardScaler()
        self.trained = False

    def detect_duplicate_billing(self, claims: List[Dict]) -> List[Dict]:
        """
        Detect duplicate billing fraud
        """
        alerts = []
        df = pd.DataFrame(claims)

        # Group by physician, patient, service, and date
        duplicates = df.groupby([
            'physician_id',
            'patient_id',
            'service_code',
            'service_date'
        ]).size()

        duplicate_groups = duplicates[duplicates > 1]

        for idx, count in duplicate_groups.items():
            physician_id, patient_id, service_code, service_date = idx
            alerts.append({
                'type': 'DUPLICATE',
                'severity': 'HIGH' if count > 2 else 'MEDIUM',
                'physician_id': physician_id,
                'patient_id': patient_id,
                'service_code': service_code,
                'service_date': service_date,
                'count': int(count),
                'description': f'Service {service_code} billed {count} times on same date',
                'detected_at': datetime.now().isoformat()
            })

        return alerts

    def detect_unbundling(self, claims: List[Dict]) -> List[Dict]:
        """
        Detect unbundling fraud (billing separately for bundled services)
        """
        alerts = []

        # Common bundled procedures in Saudi healthcare
        bundled_services = {
            'LAB_PANEL': ['LAB001', 'LAB002', 'LAB003'],  # Should be billed as panel
            'SURGERY_PACKAGE': ['SURG001', 'ANESTH001', 'RECOVERY001'],
            'IMAGING_CONTRAST': ['RAD001', 'CONTRAST001']
        }

        df = pd.DataFrame(claims)

        for bundle_name, codes in bundled_services.items():
            # Find claims where all components are billed separately
            for physician_id in df['physician_id'].unique():
                physician_claims = df[df['physician_id'] == physician_id]

                for date in physician_claims['service_date'].unique():
                    date_claims = physician_claims[physician_claims['service_date'] == date]
                    billed_codes = set(date_claims['service_code'].values)

                    if all(code in billed_codes for code in codes):
                        alerts.append({
                            'type': 'UNBUNDLING',
                            'severity': 'HIGH',
                            'physician_id': physician_id,
                            'service_date': date,
                            'bundle_name': bundle_name,
                            'unbundled_codes': codes,
                            'description': f'Bundled service {bundle_name} billed separately',
                            'detected_at': datetime.now().isoformat()
                        })

        return alerts

    def detect_upcoding(self, claims: List[Dict], historical_data: List[Dict]) -> List[Dict]:
        """
        Detect upcoding (billing higher-level service than provided)
        """
        alerts = []
        df = pd.DataFrame(claims)
        hist_df = pd.DataFrame(historical_data)

        # Calculate baseline service mix for each physician
        for physician_id in df['physician_id'].unique():
            current_claims = df[df['physician_id'] == physician_id]
            historical_claims = hist_df[hist_df['physician_id'] == physician_id]

            if len(historical_claims) < 10:  # Need sufficient history
                continue

            # Check for abnormal increase in high-complexity services
            current_high_complexity = (current_claims['complexity_level'] == 'HIGH').mean()
            historical_high_complexity = (historical_claims['complexity_level'] == 'HIGH').mean()

            if current_high_complexity > historical_high_complexity * 1.5:
                alerts.append({
                    'type': 'UPCODING',
                    'severity': 'MEDIUM',
                    'physician_id': physician_id,
                    'current_high_complexity_rate': float(current_high_complexity),
                    'historical_high_complexity_rate': float(historical_high_complexity),
                    'increase_factor': float(current_high_complexity / historical_high_complexity),
                    'description': f'Abnormal increase in high-complexity billing',
                    'detected_at': datetime.now().isoformat()
                })

        return alerts

    def detect_phantom_billing(self, claims: List[Dict],
                               facility_schedules: Dict) -> List[Dict]:
        """
        Detect phantom billing (billing for services not provided)
        """
        alerts = []
        df = pd.DataFrame(claims)

        for idx, claim in df.iterrows():
            physician_id = claim['physician_id']
            service_date = pd.to_datetime(claim['service_date'])

            # Check if physician was actually working that day
            if physician_id in facility_schedules:
                schedule = facility_schedules[physician_id]

                # Check if date is outside working schedule
                if service_date.strftime('%Y-%m-%d') not in schedule.get('working_days', []):
                    alerts.append({
                        'type': 'PHANTOM_BILLING',
                        'severity': 'CRITICAL',
                        'physician_id': physician_id,
                        'claim_id': claim.get('id'),
                        'service_date': service_date.isoformat(),
                        'description': 'Service billed on non-working day',
                        'detected_at': datetime.now().isoformat()
                    })

                # Check for impossible patient load
                daily_claims = df[
                    (df['physician_id'] == physician_id) &
                    (pd.to_datetime(df['service_date']) == service_date)
                ]

                if len(daily_claims) > 50:  # Threshold for suspicious patient load
                    alerts.append({
                        'type': 'PHANTOM_BILLING',
                        'severity': 'HIGH',
                        'physician_id': physician_id,
                        'service_date': service_date.isoformat(),
                        'patient_count': len(daily_claims),
                        'description': 'Impossibly high patient count per day',
                        'detected_at': datetime.now().isoformat()
                    })

        return alerts

    def detect_anomalies_ml(self, claims: List[Dict]) -> List[Dict]:
        """
        Use machine learning to detect anomalous billing patterns
        """
        alerts = []
        df = pd.DataFrame(claims)

        if len(df) < 100:  # Need sufficient data
            logger.warning("Insufficient data for ML-based anomaly detection")
            return alerts

        # Feature engineering
        features = pd.DataFrame({
            'amount': df['billed_amount'],
            'services_per_patient': df.groupby('patient_id')['service_code'].transform('count'),
            'avg_service_cost': df.groupby('physician_id')['billed_amount'].transform('mean'),
            'day_of_week': pd.to_datetime(df['service_date']).dt.dayofweek,
            'hour_of_day': pd.to_datetime(df['service_date']).dt.hour if 'service_time' in df else 12,
        })

        # Scale features
        features_scaled = self.scaler.fit_transform(features)

        # Train isolation forest if not trained
        if not self.trained:
            self.isolation_forest.fit(features_scaled)
            self.trained = True

        # Predict anomalies
        predictions = self.isolation_forest.predict(features_scaled)
        anomaly_scores = self.isolation_forest.score_samples(features_scaled)

        # Generate alerts for anomalies
        anomaly_indices = np.where(predictions == -1)[0]

        for idx in anomaly_indices:
            claim = df.iloc[idx]
            alerts.append({
                'type': 'ANOMALY_DETECTED',
                'severity': 'MEDIUM' if anomaly_scores[idx] > -0.5 else 'HIGH',
                'physician_id': claim['physician_id'],
                'claim_id': claim.get('id'),
                'anomaly_score': float(anomaly_scores[idx]),
                'billed_amount': float(claim['billed_amount']),
                'description': 'ML model detected anomalous billing pattern',
                'detected_at': datetime.now().isoformat()
            })

        return alerts

    def analyze_physician_risk(self, physician_id: str,
                               claims: List[Dict],
                               alerts: List[Dict]) -> Dict:
        """
        Calculate overall fraud risk score for a physician
        """
        physician_alerts = [a for a in alerts if a['physician_id'] == physician_id]
        physician_claims = [c for c in claims if c['physician_id'] == physician_id]

        if not physician_claims:
            return {'risk_score': 0, 'risk_level': 'NONE'}

        # Calculate risk score
        severity_weights = {
            'LOW': 1,
            'MEDIUM': 3,
            'HIGH': 7,
            'CRITICAL': 10
        }

        risk_score = sum(
            severity_weights.get(alert['severity'], 0)
            for alert in physician_alerts
        )

        # Normalize by number of claims
        normalized_risk = risk_score / max(len(physician_claims), 1) * 100

        # Determine risk level
        if normalized_risk >= 50:
            risk_level = 'CRITICAL'
        elif normalized_risk >= 30:
            risk_level = 'HIGH'
        elif normalized_risk >= 15:
            risk_level = 'MEDIUM'
        elif normalized_risk >= 5:
            risk_level = 'LOW'
        else:
            risk_level = 'NONE'

        return {
            'physician_id': physician_id,
            'risk_score': float(normalized_risk),
            'risk_level': risk_level,
            'alert_count': len(physician_alerts),
            'claim_count': len(physician_claims),
            'alerts_by_type': {
                alert_type: len([a for a in physician_alerts if a['type'] == alert_type])
                for alert_type in set(a['type'] for a in physician_alerts)
            },
            'requires_investigation': risk_level in ['HIGH', 'CRITICAL'],
            'requires_training': risk_level in ['MEDIUM', 'HIGH'],
        }


def run_fraud_detection(claims: List[Dict],
                       historical_data: List[Dict] = None,
                       facility_schedules: Dict = None) -> Dict:
    """
    Main function to run all fraud detection algorithms
    """
    detector = FraudDetector()

    all_alerts = []

    # Run all detection algorithms
    logger.info("Running duplicate billing detection...")
    all_alerts.extend(detector.detect_duplicate_billing(claims))

    logger.info("Running unbundling detection...")
    all_alerts.extend(detector.detect_unbundling(claims))

    if historical_data:
        logger.info("Running upcoding detection...")
        all_alerts.extend(detector.detect_upcoding(claims, historical_data))

    if facility_schedules:
        logger.info("Running phantom billing detection...")
        all_alerts.extend(detector.detect_phantom_billing(claims, facility_schedules))

    logger.info("Running ML-based anomaly detection...")
    all_alerts.extend(detector.detect_anomalies_ml(claims))

    # Analyze risk for each physician
    physician_ids = list(set(claim['physician_id'] for claim in claims))
    physician_risks = [
        detector.analyze_physician_risk(pid, claims, all_alerts)
        for pid in physician_ids
    ]

    return {
        'alerts': all_alerts,
        'total_alerts': len(all_alerts),
        'alerts_by_severity': {
            severity: len([a for a in all_alerts if a['severity'] == severity])
            for severity in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        },
        'alerts_by_type': {
            alert_type: len([a for a in all_alerts if a['type'] == alert_type])
            for alert_type in set(a['type'] for a in all_alerts)
        },
        'physician_risks': physician_risks,
        'high_risk_physicians': [
            p for p in physician_risks if p['risk_level'] in ['HIGH', 'CRITICAL']
        ],
        'analysis_timestamp': datetime.now().isoformat()
    }