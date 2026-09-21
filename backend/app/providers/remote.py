"""Bounded, server-only HTTP transport. No SDK, retries, tools or raw error logging."""
import asyncio
import json
import logging

import httpx

from app.config import Settings
from app.models.generation import CopilotResult, GenerationRequest, ProviderResult
from app.providers.base import AIProvider, ProviderError
from app.providers.prompts import build_messages, validate_risk_evidence

logger = logging.getLogger(__name__)


class RemoteAIProvider(AIProvider):
    def __init__(self, settings: Settings):
        self.settings = settings

    def configuration(self):
        key = getattr(self.settings, f'{self.name}_api_key').get_secret_value()
        model = getattr(self.settings, f'{self.name}_model')
        if not key or not model:
            raise ProviderError('provider_not_configured', f'{self.name} is not configured.')
        if self.name in ('gemini', 'groq') and not getattr(self.settings, f'{self.name}_free_tier_confirmed'):
            raise ProviderError('free_tier_not_confirmed', f'Confirm a free, unbilled {self.name} account before enabling requests.')
        if self.name == 'gemini' and model not in {'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'}:
            raise ProviderError('model_not_free', 'The Gemini model is not in the reviewed free-tier allowlist.')
        if self.name == 'groq' and model != 'openai/gpt-oss-20b':
            raise ProviderError('model_not_free', 'The Groq model is not in the reviewed free-tier allowlist.')
        if self.name == 'openrouter' and not (model == 'openrouter/free' or model.endswith(':free')):
            raise ProviderError('model_not_free', 'OpenRouter requires a :free model or openrouter/free.')
        return key, model

    async def generate(self, request: GenerationRequest) -> ProviderResult:
        key, model = self.configuration()
        messages = build_messages(request)
        if self.name == 'gemini':
            url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
            headers = {'x-goog-api-key': key}
            body = {
                'systemInstruction': {'parts': [{'text': messages[0]['content']}]},
                'contents': [{'role': 'user', 'parts': [{'text': messages[1]['content']}]}],
                'generationConfig': {'temperature': 0.2, 'maxOutputTokens': 8192, 'responseMimeType': 'application/json'},
            }
        else:
            url = 'https://api.groq.com/openai/v1/chat/completions' if self.name == 'groq' else 'https://openrouter.ai/api/v1/chat/completions'
            headers = {'Authorization': f'Bearer {key}'}
            body = {'model': model, 'messages': messages, 'stream': False, 'temperature': 0.2, 'max_tokens': 4096, 'response_format': {'type': 'json_object'}}
            if self.name == 'openrouter':
                body['provider'] = {'max_price': {'prompt': 0, 'completion': 0}, 'require_parameters': True}
        try:
            async with asyncio.timeout(self.settings.external_ai_timeout_seconds):
                async with httpx.AsyncClient(timeout=httpx.Timeout(self.settings.external_ai_timeout_seconds, connect=5), follow_redirects=False) as client:
                    async with client.stream('POST', url, headers=headers, json=body) as response:
                        response.raise_for_status()
                        data = bytearray()
                        async for chunk in response.aiter_bytes():
                            data.extend(chunk)
                            if len(data) > 512_000:
                                raise ProviderError('invalid_provider_response', 'The provider returned an oversized response.', 502)
                    envelope = json.loads(data)
                    if self.name == 'gemini':
                        candidate = envelope['candidates'][0]
                        if candidate.get('finishReason') != 'STOP':
                            raise ValueError('Incomplete generation')
                        content = ''.join(part.get('text', '') for part in candidate['content']['parts'])
                    else:
                        choice = envelope['choices'][0]
                        if choice.get('finish_reason') != 'stop':
                            raise ValueError('Incomplete generation')
                        content = choice['message']['content']
                    result_model = CopilotResult if request.question else ProviderResult
                    return validate_risk_evidence(result_model.model_validate_json(content), request)
        except (TimeoutError, httpx.TimeoutException) as exc:
            raise ProviderError('provider_timeout', 'The external provider timed out.', 504) from exc
        except httpx.HTTPStatusError as exc:
            logger.warning('External AI HTTP failure provider=%s status=%s', self.name, exc.response.status_code)
            code = 'provider_rate_limited' if exc.response.status_code == 429 else 'provider_unavailable'
            raise ProviderError(code, 'The external provider is temporarily unavailable.') from exc
        except httpx.HTTPError as exc:
            raise ProviderError('provider_unavailable', 'Cannot reach the external provider.') from exc
        except (ValueError, KeyError, TypeError, IndexError, AttributeError) as exc:
            raise ProviderError('invalid_provider_response', 'The provider returned an invalid or incomplete draft.', 502) from exc
