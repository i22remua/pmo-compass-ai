import asyncio

import httpx

from app.config import Settings
from app.models.generation import GenerationRequest, ProviderResult
from app.providers.base import AIProvider, ProviderError
from app.providers.prompts import build_messages, validate_risk_evidence


class OllamaAIProvider(AIProvider):
    name = 'ollama'

    def __init__(self, settings: Settings):
        self.settings = settings

    async def generate(self, request: GenerationRequest) -> ProviderResult:
        try:
            # Bound the whole operation as well as connection/read waits. No startup model check
            # or automatic model download: an absent Ollama must not prevent the app starting.
            async with asyncio.timeout(self.settings.ollama_timeout_seconds):
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(self.settings.ollama_timeout_seconds, connect=min(5, self.settings.ollama_timeout_seconds)),
                ) as client:
                    response = await client.post(
                        f'{self.settings.ollama_base_url.rstrip("/")}/api/chat',
                        json={
                            'model': self.settings.ollama_model,
                            'stream': False,
                            'format': ProviderResult.model_json_schema(),
                            'options': {'temperature': 0.2},
                            'messages': build_messages(request),
                        },
                    )
                    response.raise_for_status()
                    envelope = response.json()
                    if envelope.get('done') is not True or envelope.get('done_reason') == 'length':
                        raise ProviderError('incomplete_provider_response', 'Ollama did not finish the document. Retry or continue with demo templates.', 502)
                    result = ProviderResult.model_validate_json(envelope['message']['content'])
                    return validate_risk_evidence(result, request)
        except (TimeoutError, httpx.TimeoutException) as exc:
            raise ProviderError('provider_timeout', 'Ollama timed out. Retry, select a smaller model or continue with demo templates.', 504) from exc
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                raise ProviderError('ollama_model_unavailable', 'The configured Ollama model was not found. Run ollama pull for OLLAMA_MODEL or continue with demo templates.') from exc
            raise ProviderError('provider_unavailable', 'Ollama rejected the request. Check the service and model, retry or continue with demo templates.') from exc
        except httpx.HTTPError as exc:
            raise ProviderError('provider_unavailable', 'Cannot connect to Ollama. Start the local service or continue with demo templates.') from exc
        except (ValueError, KeyError, TypeError, AttributeError) as exc:
            raise ProviderError('invalid_provider_response', 'Ollama returned an empty, invalid or unsupported document. Retry or continue with demo templates.', 502) from exc
