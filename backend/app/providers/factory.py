from app.config import Settings
from app.providers.base import AIProvider
from app.providers.demo import DemoAIProvider
from app.providers.ollama import OllamaAIProvider
from app.providers.external import ExternalAIProvider


def create_provider(settings: Settings) -> AIProvider:
    if settings.ai_provider == 'ollama':
        return OllamaAIProvider(settings)
    if settings.ai_provider == 'external':
        return ExternalAIProvider()
    return DemoAIProvider()
