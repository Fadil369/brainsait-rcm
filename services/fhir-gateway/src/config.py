"""
FHIR Gateway Service - Configuration

Environment-based configuration using Pydantic Settings.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """FHIR Gateway Service settings"""
    
    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    
    # NPHIES
    nphies_base_url: str = "https://nphies.sa/fhir"
    nphies_api_key: str = ""
    
    # FHIR Terminology
    terminology_server: str = "https://tx.fhir.org"
    
    # CORS
    cors_origins: List[str] = ["*"]
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
