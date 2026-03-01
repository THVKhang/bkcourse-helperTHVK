from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, field_validator
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DB_URL: str
    CORS_ORIGINS: str = "http://localhost:3000"
    DEBUG: bool = False

    @field_validator("CORS_ORIGINS")
    @classmethod
    def normalize_cors(cls, v: str) -> str:
        # allow comma-separated
        return v

    def cors_list(self) -> List[str]:
        return [s.strip() for s in self.CORS_ORIGINS.split(",") if s.strip()]


settings = Settings()
