from app.config import Settings
from app.providers.base import AIProvider
from app.providers.demo import DemoAIProvider
from app.providers.ollama import OllamaAIProvider
from app.providers.external import ExternalAIProvider
from app.providers.offline import OfflinePMOProvider
from app.providers.gemini import GeminiProvider
from app.providers.groq import GroqProvider
from app.providers.openrouter import OpenRouterProvider


def create_provider(settings: Settings) -> AIProvider:
    if settings.ai_provider == 'ollama':
        return OllamaAIProvider(settings)
    if settings.ai_provider == 'external':
        return ExternalAIProvider()
    if settings.ai_provider == 'gemini':
        return GeminiProvider(settings)
    if settings.ai_provider == 'groq':
        return GroqProvider(settings)
    if settings.ai_provider == 'openrouter':
        return OpenRouterProvider(settings)
    if settings.ai_provider == 'demo':
        return DemoAIProvider()
    return OfflinePMOProvider()
