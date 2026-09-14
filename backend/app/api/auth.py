from functools import lru_cache

import firebase_admin
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth
from starlette.concurrency import run_in_threadpool

from app.config import Settings, get_settings

bearer = HTTPBearer(auto_error=False)


@lru_cache
def firebase_app(project_id: str):
    return firebase_admin.initialize_app(options={'projectId': project_id}, name=f'pmo-{project_id}')


async def authenticate(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    settings: Settings = Depends(get_settings),
) -> str:
    if settings.auth_mode == 'demo':
        return 'local-demo'
    if not credentials:
        raise HTTPException(401, detail={'code': 'authentication_required', 'message': 'Sign in to generate a document.'}, headers={'WWW-Authenticate': 'Bearer'})
    try:
        app = firebase_app(settings.firebase_project_id)
        claims = await run_in_threadpool(auth.verify_id_token, credentials.credentials, app=app, check_revoked=True)
        return claims['uid']
    except (auth.InvalidIdTokenError, auth.RevokedIdTokenError, auth.UserDisabledError, ValueError, KeyError):
        raise HTTPException(401, detail={'code': 'invalid_token', 'message': 'Your session expired. Please sign in again.'}, headers={'WWW-Authenticate': 'Bearer'}) from None
    except Exception:
        raise HTTPException(503, detail={'code': 'auth_unavailable', 'message': 'Authentication service is unavailable.'}) from None
