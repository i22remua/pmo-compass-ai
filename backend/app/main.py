from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.api.routes import router
from app.config import get_settings
from app.providers.base import ProviderError


class BodyLimitMiddleware:
    def __init__(self, app, limit=256_000):
        self.app, self.limit = app, limit

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or scope['method'] not in ('POST', 'PUT', 'PATCH'):
            return await self.app(scope, receive, send)
        messages, size = [], 0
        while True:
            message = await receive()
            if message['type'] == 'http.disconnect':
                return
            size += len(message.get('body', b''))
            if size > self.limit:
                response = JSONResponse(status_code=413, content={'detail': {'code': 'request_too_large', 'message': 'Request exceeds 256 KB.'}})
                return await response(scope, receive, send)
            messages.append(message)
            if not message.get('more_body', False):
                break

        async def replay():
            return messages.pop(0) if messages else await receive()

        return await self.app(scope, replay, send)


settings = get_settings()
app = FastAPI(title='PMO Compass AI', version='1.0.0', description='Bilingual PMO intelligence with free-tier providers and an explainable offline engine.')
app.add_middleware(BodyLimitMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=['GET', 'POST'], allow_headers=['Authorization', 'Content-Type'])
app.include_router(router)


@app.get('/', include_in_schema=False)
async def api_home():
    return RedirectResponse(url='/docs')


@app.exception_handler(ProviderError)
async def provider_error(_: Request, error: ProviderError):
    return JSONResponse(status_code=error.status_code, content={'detail': {
        'code': error.code, 'message': error.message,
        'provider': error.provider, 'fallbackAvailable': error.fallback_available,
    }})


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, error: RequestValidationError):
    # Do not echo project notes or other request bodies into error responses.
    fields = [{'field': '.'.join(str(x) for x in e['loc']), 'message': e['msg']} for e in error.errors()]
    return JSONResponse(status_code=422, content={'detail': {'code': 'validation_error', 'message': 'Check your project fields.', 'fields': fields}})


@app.exception_handler(Exception)
async def unexpected_error(_: Request, error: Exception):
    return JSONResponse(status_code=500, content={'detail': {'code': 'internal_error', 'message': 'Generation failed. Please retry.'}})
