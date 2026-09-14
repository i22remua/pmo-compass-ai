from functools import lru_cache
import os
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    ai_provider: Literal['demo', 'ollama', 'external'] = 'demo'
    auth_mode: Literal['demo', 'firebase'] = 'demo'
    app_env: Literal['development', 'test', 'production'] = 'development'
    cors_origins: list[str] = ['http://localhost:3000', 'http://127.0.0.1:3000']
    ollama_base_url: str = 'http://localhost:11434'
    ollama_model: str = 'llama3.1'
    ollama_timeout_seconds: float = Field(default=120, gt=0, le=300)
    firebase_project_id: str = ''
    rate_limit_per_minute: int = Field(default=30, ge=1, le=1000)

    @model_validator(mode='after')
    def production_requires_auth(self):
        if self.app_env == 'production' and self.auth_mode != 'firebase':
            raise ValueError('Production requires AUTH_MODE=firebase.')
        if self.app_env == 'production' and any(
            os.environ.get(name) for name in ('FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST')
        ):
            raise ValueError('Firebase emulators must not be enabled in production.')
        if self.auth_mode == 'firebase' and not self.firebase_project_id:
            raise ValueError('FIREBASE_PROJECT_ID is required for Firebase authentication.')
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
