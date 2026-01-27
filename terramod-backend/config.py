import os
from typing import Optional

class Settings:
    """Application settings"""
    
    # API Settings
    API_HOST: str = os.getenv('API_HOST', '0.0.0.0')
    API_PORT: int = int(os.getenv('API_PORT', '8000'))
    
    # CORS Settings
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]
    
    # Registry Settings
    REGISTRY_PATH: str = os.getenv('REGISTRY_PATH', './registry/aws_services.yaml')
    
    # Logging Settings
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    
    # Cache Settings
    CACHE_MAX_SIZE_MB: int = int(os.getenv('CACHE_MAX_SIZE_MB', '100'))
    CACHE_TTL_SECONDS: int = int(os.getenv('CACHE_TTL_SECONDS', '300'))

settings = Settings()
