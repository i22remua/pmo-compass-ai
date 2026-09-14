"""Extension point for a future server-side OpenAI, Gemini or other adapter.

No SDK, credential lookup or network request runs in this placeholder.
Implement the AIProvider contract here and retain the shared result validation.
"""
from app.models.generation import GenerationRequest, ProviderResult
from app.providers.base import AIProvider, ProviderError


class ExternalAIProvider(AIProvider):
    name = 'external'

    async def generate(self, request: GenerationRequest) -> ProviderResult:
        raise ProviderError(
            'external_not_configured',
            'External AI is not implemented. Select demo or ollama; no paid request has been made.',
            501,
        )
