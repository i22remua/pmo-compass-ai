from collections import defaultdict, deque
from time import monotonic

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.auth import authenticate
from app.config import Settings, get_settings
from app.models.generation import GenerationRequest, GenerationResponse
from app.providers.service import generate_document

router = APIRouter(prefix='/api/v1')


class RateLimiter:
    def __init__(self):
        self.hits: dict[str, deque] = defaultdict(deque)

    def check(self, key: str, limit: int):
        now = monotonic()
        # Expire inactive clients so public demo traffic cannot grow the map indefinitely.
        for old in list(self.hits):
            if not self.hits[old] or self.hits[old][-1] <= now - 60:
                del self.hits[old]
        queue = self.hits[key]
        while queue and queue[0] <= now - 60:
            queue.popleft()
        if len(queue) >= limit:
            raise HTTPException(429, detail={'code': 'rate_limited', 'message': 'Too many requests. Retry in one minute.'}, headers={'Retry-After': '60'})
        queue.append(now)


limiter = RateLimiter()


@router.get('/health', tags=['System'])
async def health(settings: Settings = Depends(get_settings)):
    return {'status': 'ok', 'provider': settings.ai_provider, 'authMode': settings.auth_mode,
            'model': settings.ollama_model if settings.ai_provider == 'ollama' else None,
            'version': '1.0.0'}


@router.post('/generate', response_model=GenerationResponse, tags=['Generation'])
async def generate(payload: GenerationRequest, request: Request, uid: str = Depends(authenticate), settings: Settings = Depends(get_settings)):
    key = uid if settings.auth_mode == 'firebase' else (request.client.host if request.client else 'unknown')
    limiter.check(key, settings.rate_limit_per_minute)
    return await generate_document(payload, settings)


@router.post('/demo/generate', response_model=GenerationResponse, tags=['Generation'])
async def public_demo(payload: GenerationRequest, request: Request, settings: Settings = Depends(get_settings)):
    """Public playground: deterministic templates only, never a paid/local model."""
    limiter.check(f'demo:{request.client.host if request.client else "unknown"}', settings.rate_limit_per_minute)
    return await generate_document(payload, settings, public_demo=True)
