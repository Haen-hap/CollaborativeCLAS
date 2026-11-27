from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    database_url: str
    # Orígenes permitidos para el frontend, separados por coma
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Red y autenticación administrativa (Factor 1 + Factor 2)
    admin_allowed_cidrs: str = "127.0.0.1/32,::1/128,172.16.0.0/12,10.42.0.1/32"
    admin_secret_key: str
    admin_invite_code: str
    admin_token_expire_seconds: int = 86400

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("admin_secret_key")
    @classmethod
    def validate_admin_secret_key(cls, value: str) -> str:
        if len(value.strip()) < 32:
            raise ValueError("admin_secret_key must contain at least 32 non-whitespace characters")
        if value in {"gbm-cclas-admin-secret-key-change-in-production-2026", "GBM-ADMIN-2026"}:
            raise ValueError("admin_secret_key must not use a known default")
        if "<change-me>" in value:
            raise ValueError("admin_secret_key must not contain a placeholder")
        return value

    @field_validator("admin_invite_code")
    @classmethod
    def validate_admin_invite_code(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("admin_invite_code must not be empty")
        if value in {"gbm-cclas-admin-secret-key-change-in-production-2026", "GBM-ADMIN-2026"}:
            raise ValueError("admin_invite_code must not use a known default")
        if "<change-me>" in value:
            raise ValueError("admin_invite_code must not contain a placeholder")
        return value

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
