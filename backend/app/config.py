from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "PolyMind API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str = "changeme-super-secret-key-for-dev"
    AES_ENCRYPTION_KEY: str = "changeme-aes-key-must-be-32chars"  # Must be 32 chars

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://polymind:polymind@localhost:5432/polymind"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "https://polymind.app"]

    # Platform LLM Keys (fallback when user has no keys)
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    XAI_API_KEY: Optional[str] = None
    COHERE_API_KEY: Optional[str] = None
    MISTRAL_API_KEY: Optional[str] = None

    # Clerk Auth
    CLERK_SECRET_KEY: Optional[str] = None
    CLERK_PUBLISHABLE_KEY: Optional[str] = None

    # Timeouts
    DEFAULT_PROVIDER_TIMEOUT: int = 30

    # Tracing (LangSmith)
    LANGSMITH_TRACING: Optional[str] = None
    LANGSMITH_ENDPOINT: Optional[str] = None
    LANGSMITH_API_KEY: Optional[str] = None
    LANGSMITH_PROJECT: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
