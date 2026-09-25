from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, read from environment variables (and a local .env file)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./data/app.db"
    cors_origins: str = "http://localhost:3000"
    seed_on_startup: bool = True
    llm_provider: Literal["none", "groq"] = "none"
    groq_api_key: str | None = None
    llm_model: str | None = None
    llm_timeout_seconds: float = 20
    max_upload_bytes: int = 1_000_000
    default_page_size: int = 20

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
