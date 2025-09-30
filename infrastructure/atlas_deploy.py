#!/usr/bin/env python3
"""Deploy sample BrainSAIT data to a MongoDB Atlas cluster.

This script provisions baseline collections, indexes, and seed data
for the "brainsait_platform" database (configurable via env variables).

Usage:
    ATLAS_DEPLOY_URI='mongodb+srv://user:pass@cluster.mongodb.net/' \
        ATLAS_DEPLOY_DB='brainsait_platform' \
        python infrastructure/atlas_deploy.py
"""

from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from pymongo import MongoClient
from pymongo.errors import PyMongoError
from pymongo.server_api import ServerApi

ATLAS_URI_ENV = "ATLAS_DEPLOY_URI"
DB_NAME_ENV = "ATLAS_DEPLOY_DB"
DEFAULT_DB = "brainsait_platform"


def _now() -> datetime:
    """Return a timezone-aware timestamp for auditing inserts."""
    return datetime.now(timezone.utc)


def _build_hospital() -> Dict[str, Any]:
    """Construct the default hospital seed document."""
    hospital_id = uuid.uuid4().hex
    return {
        "hospital_id": hospital_id,
        "name": "King Fahd Medical City",
        "location": {
            "city": "Riyadh",
            "region": "Central",
            "coordinates": {"lat": 24.7136, "lng": 46.6753},
        },
        "license_number": "RYD-001-2024",
        "capacity": {"beds": 500, "icu": 50, "emergency": 30},
        "specializations": [
            "Cardiology",
            "Oncology",
            "Neurology",
            "Emergency",
        ],
        "digital_maturity_level": 4,
        "vision2030_compliance": {
            "health_sector_transformation": True,
            "digital_health_adoption": 85,
            "ai_integration_level": 4,
        },
        "created_at": _now(),
        "updated_at": _now(),
    }


def _build_ai_model() -> Dict[str, Any]:
    """Construct the default AI model document."""
    return {
        "model_id": uuid.uuid4().hex,
        "name": "CardioPredict AI",
        "type": "predictive",
        "version": "2.0.0",
        "healthcare_domain": "cardiology",
        "performance_metrics": {
            "accuracy": 0.942,
            "precision": 0.921,
            "recall": 0.895,
            "f1_score": 0.908,
        },
        "deployment_status": "production",
        "vision2030_alignment": {
            "innovation_contribution": 9,
            "quality_improvement": 8,
            "efficiency_gain": 7,
        },
        "created_at": _now(),
        "last_updated": _now(),
    }


def _build_vision_metrics(hospital_id: str) -> Dict[str, Any]:
    """Construct the default Vision 2030 metrics document."""
    return {
        "metric_id": uuid.uuid4().hex,
        "hospital_id": hospital_id,
        "vision2030_goals": {
            "health_sector_transformation": {
                "digital_health_adoption": 85,
                "ai_integration": 80,
                "patient_experience": 90,
            },
            "innovation_economy": {
                "tech_adoption": 75,
                "research_contribution": 70,
                "startup_collaboration": 60,
            },
            "sustainability": {
                "resource_efficiency": 80,
                "environmental_impact": 75,
                "social_responsibility": 85,
            },
        },
        "overall_alignment_score": 78.3,
        "measurement_date": _now(),
    }


def _create_indexes(db) -> None:
    """Create required indexes for seeded collections."""
    print("📋 Creating indexes...")
    db.hospitals.create_index("hospital_id", unique=True)
    db.hospitals.create_index("license_number", unique=True)
    db.hospitals.create_index("location.region")
    db.patients.create_index("patient_id", unique=True)
    db.patients.create_index("hospital_id")
    db.ai_models.create_index("model_id", unique=True)
    db.ai_models.create_index("deployment_status")
    db.vision2030_metrics.create_index("metric_id", unique=True)
    db.vision2030_metrics.create_index("measurement_date")


def deploy_to_atlas() -> None:
    """Deploy BrainSAIT baseline data to Atlas Cluster0."""
    atlas_uri = os.getenv(ATLAS_URI_ENV)
    if not atlas_uri:
        print(f"❌ Environment variable {ATLAS_URI_ENV} is not set.", file=sys.stderr)
        sys.exit(1)

    database_name = os.getenv(DB_NAME_ENV, DEFAULT_DB)

    print("🚀 Deploying BrainSAIT to MongoDB Atlas Cluster0")

    client: MongoClient | None = None
    try:
        client = MongoClient(atlas_uri, server_api=ServerApi("1"))
        db = client[database_name]

        _create_indexes(db)

        hospital_doc = _build_hospital()
        hospital_result = db.hospitals.update_one(
            {"license_number": hospital_doc["license_number"]},
            {"$set": hospital_doc},
            upsert=True,
        )
        print(f"✅ Hospital provisioned: {hospital_doc['name']}")

        ai_model_doc = _build_ai_model()
        db.ai_models.update_one(
            {"name": ai_model_doc["name"], "version": ai_model_doc["version"]},
            {"$set": ai_model_doc},
            upsert=True,
        )
        print(f"✅ AI model deployed: {ai_model_doc['name']}")

        vision_metrics_doc = _build_vision_metrics(hospital_doc["hospital_id"])
        db.vision2030_metrics.update_one(
            {"hospital_id": vision_metrics_doc["hospital_id"]},
            {"$set": vision_metrics_doc},
            upsert=True,
        )
        print("✅ Vision 2030 metrics configured")

        print("\n📊 Atlas Deployment Summary:")
        print(f"Hospitals: {db.hospitals.count_documents({})}")
        print(f"AI Models: {db.ai_models.count_documents({})}")
        print(f"Vision 2030 Metrics: {db.vision2030_metrics.count_documents({})}")
        print(f"Database: {database_name}")

        print("\n🎯 Deployment complete! Atlas cluster is ready.")
    except PyMongoError as exc:
        print(f"❌ Deployment failed: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        if client:
            client.close()


if __name__ == "__main__":
    deploy_to_atlas()
