from functools import lru_cache
import os
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    ai_provider: Literal['auto', 'offline', 'gemini', 'groq', 'openrouter', 'demo', 'ollama', 'external'] = 'auto'
    ai_provider_order: str = 'gemini,groq,openrouter,offline'
    ai_cost_mode: Literal['free_only'] = 'free_only'
    gemini_api_key: SecretStr = SecretStr('')
    gemini_model: str = Field(default='gemini-3.1-flash-lite', pattern=r'^[a-zA-Z0-9._-]+$')
    groq_api_key: SecretStr = SecretStr('')
    groq_model: str = 'openai/gpt-oss-20b'
    openrouter_api_key: SecretStr = SecretStr('')
    openrouter_model: str = ''
    # Gemini/Groq do not expose a per-request "free only" billing switch.
    # Operators must confirm an unbilled/free account before either adapter sends data.
    gemini_free_tier_confirmed: bool = False
    groq_free_tier_confirmed: bool = False
    external_ai_timeout_seconds: float = Field(default=20, gt=0, le=30)
    free_ai_daily_limit_per_user: int = Field(default=20, ge=1, le=1000)
    free_ai_rate_limit_per_minute: int = Field(default=5, ge=1, le=100)
    auth_mode: Literal['demo', 'firebase'] = 'demo'
    app_env: Literal['development', 'test', 'production'] = 'development'
    cors_origins: list[str] = ['http://localhost:3000', 'http://127.0.0.1:3000']
    ollama_base_url: str = 'http://localhost:11434'
    ollama_model: str = 'llama3.1'
    ollama_timeout_seconds: float = Field(default=120, gt=0, le=300)
    firebase_project_id: str = ''
    firebase_service_account_json: SecretStr = SecretStr('')
    rate_limit_per_minute: int = Field(default=30, ge=1, le=1000)

    @model_validator(mode='after')
    def production_requires_auth(self):
        order = [part.strip() for part in self.ai_provider_order.split(',')]
        if not order or len(set(order)) != len(order) or any(part not in {'gemini', 'groq', 'openrouter', 'offline'} for part in order):
            raise ValueError('AI_PROVIDER_ORDER must contain unique supported providers.')
        if 'offline' in order and order[-1] != 'offline':
            raise ValueError('The offline provider must be last in AI_PROVIDER_ORDER.')
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
