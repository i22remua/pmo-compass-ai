from collections import defaultdict, deque
from time import monotonic
from ipaddress import ip_address
import os

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.auth import authenticate
from app.config import Settings, get_settings
from app.models.generation import GenerationRequest, GenerationResponse, ProjectIntelligence
from app.providers.service import generate_document
from app.services.inference import PMOInferenceService

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


class FreeUsageLimiter:
    """Single-process rolling quotas. Exhaustion keeps offline generation available."""
    def __init__(self):
        self.hits: dict[str, deque] = {}

    def reserve(self, keys: list[str], daily: int, minute: int) -> bool:
        now = monotonic()
        for key in list(self.hits):
            queue = self.hits[key]
            while queue and queue[0] <= now - 86400:
                queue.popleft()
            if not queue:
                del self.hits[key]
        if len(self.hits) >= 10000 and any(key not in self.hits for key in keys):
            return False
        for key in keys:
            queue = self.hits.get(key, ())
            if len(queue) >= daily or sum(hit > now - 60 for hit in queue) >= minute:
                return False
        for key in keys:
            self.hits.setdefault(key, deque()).append(now)
        return True


free_usage = FreeUsageLimiter()


def client_ip(request: Request) -> str:
    # Vercel overwrites this header at its ingress; other hosts use Uvicorn's trusted-proxy handling.
    if os.environ.get('VERCEL') == '1':
        try:
            return str(ip_address(request.headers.get('x-forwarded-for', '').strip()))
        except ValueError:
            pass
    return request.client.host if request.client else 'unknown'


async def run_generation(payload, request, settings, uid=None):
    ip = client_ip(request)
    limiter.check(f'ip:{ip}', settings.rate_limit_per_minute)
    keys = [f'ip:{ip}'] + ([f'uid:{uid}'] if uid and settings.auth_mode == 'firebase' else [])
    allowed = True
    if settings.ai_provider not in ('offline', 'demo') and not (payload.useOfflineFallback or payload.useDemoFallback):
        allowed = free_usage.reserve(keys, settings.free_ai_daily_limit_per_user, settings.free_ai_rate_limit_per_minute)
    return await generate_document(payload, settings, force_offline=not allowed)


@router.get('/health', tags=['System'])
async def health(settings: Settings = Depends(get_settings)):
    return {'status': 'ok', 'provider': settings.ai_provider, 'authMode': settings.auth_mode,
            'model': settings.ollama_model if settings.ai_provider == 'ollama' else None,
            'version': '1.0.0'}


@router.post('/generate', response_model=GenerationResponse, tags=['Generation'])
async def generate(payload: GenerationRequest, request: Request, uid: str = Depends(authenticate), settings: Settings = Depends(get_settings)):
    return await run_generation(payload, request, settings, uid)


@router.post('/workspace/generate', response_model=GenerationResponse, tags=['Generation'])
async def workspace_generate(payload: GenerationRequest, request: Request, settings: Settings = Depends(get_settings)):
    """Public, quota-limited generation; never grants access to stored Firebase data."""
    return await run_generation(payload, request, settings)


@router.post('/intelligence', response_model=ProjectIntelligence, tags=['Intelligence'])
async def intelligence(payload: GenerationRequest, request: Request, uid: str = Depends(authenticate), settings: Settings = Depends(get_settings)):
    limiter.check(f'intelligence:{client_ip(request)}', settings.rate_limit_per_minute)
    return PMOInferenceService().analyze(payload)


@router.post('/workspace/intelligence', response_model=ProjectIntelligence, tags=['Intelligence'])
async def workspace_intelligence(payload: GenerationRequest, request: Request, settings: Settings = Depends(get_settings)):
    limiter.check(f'intelligence:{client_ip(request)}', settings.rate_limit_per_minute)
    return PMOInferenceService().analyze(payload)


@router.post('/demo/generate', response_model=GenerationResponse, tags=['Generation'])
async def public_demo(payload: GenerationRequest, request: Request, settings: Settings = Depends(get_settings)):
    """Legacy route: deterministic offline output, retained for older clients."""
    limiter.check(f'demo:{request.client.host if request.client else "unknown"}', settings.rate_limit_per_minute)
    return await generate_document(payload, settings, public_demo=True)
