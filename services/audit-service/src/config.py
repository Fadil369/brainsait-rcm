"""
Audit Service - Configuration

Environment-based configuration using Pydantic Settings.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Audit Service settings"""
    
    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    
    # Kafka
    enable_kafka: bool = True
    kafka_brokers: str = "localhost:9092"
    kafka_topic: str = "audit-events"
    
    # Retention
    retention_days: int = 2555  # 7 years for HIPAA compliance
    enable_cold_storage: bool = True
    
    # CORS
    cors_origins: List[str] = ["*"]
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
