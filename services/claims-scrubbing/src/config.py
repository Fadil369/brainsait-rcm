"""
Configuration management for Claims Scrubbing Service
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Service info
    service_name: str = "claims-scrubbing"
    version: str = "1.0.0"
    environment: str = "development"
    
    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "brainsait"
    
    # Redis
    redis_uri: str = "redis://localhost:6379"
    redis_ttl: int = 3600  # 1 hour default cache TTL
    
    # External APIs
    nphies_api_url: str = "https://api.nphies.sa/v1"
    nphies_api_key: str = "your-nphies-api-key"
    nphies_timeout: int = 30  # seconds
    
    # ML Inference Service
    ml_inference_url: str = "http://ml-inference-service:8000"
    ml_timeout: int = 10  # seconds
    
    # Feature Flags
    enable_ml_scoring: bool = True
    enable_auto_coding: bool = True
    enable_eligibility_check: bool = True
    
    # Validation Rules
    max_icd_codes: int = 10
    max_cpt_codes: int = 20
    min_claim_amount: float = 1.0
    max_claim_amount: float = 1000000.0
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        env_prefix = "CLAIMS_SCRUBBING_"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    
    Using lru_cache ensures settings are loaded once and reused.
    """
    return Settings()
