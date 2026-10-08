from functools import lru_cache
import json
import logging
import re

import firebase_admin
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import app_check, auth, credentials as firebase_credentials
from fastapi import Request
from starlette.concurrency import run_in_threadpool

from app.config import Settings, get_settings

bearer = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


@lru_cache
def firebase_app(project_id: str):
    secret = get_settings().firebase_service_account_json.get_secret_value()
    credential = None
    if secret:
        data = json.loads(secret)
        if data.get('project_id') != project_id:
            raise ValueError('Firebase credential project must match FIREBASE_PROJECT_ID.')
        credential = firebase_credentials.Certificate(data)
    return firebase_admin.initialize_app(credential, options={'projectId': project_id}, name=f'pmo-{project_id}')


async def authenticate(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    settings: Settings = Depends(get_settings),
) -> str:
    if settings.auth_mode == 'demo':
        return 'local-demo'
    raw = request.headers.get('authorization', '')
    if not credentials or not re.fullmatch(r'Bearer [A-Za-z0-9._~-]+', raw, re.IGNORECASE):
        raise HTTPException(401, detail={'code': 'authentication_required', 'message': 'Sign in to generate a document.'}, headers={'WWW-Authenticate': 'Bearer'})
    try:
        app = firebase_app(settings.firebase_project_id)
        claims = await run_in_threadpool(auth.verify_id_token, credentials.credentials, app=app, check_revoked=True)
        return claims['uid']
    except (auth.InvalidIdTokenError, auth.RevokedIdTokenError, auth.UserDisabledError, auth.UserNotFoundError, ValueError, KeyError):
        raise HTTPException(401, detail={'code': 'invalid_token', 'message': 'Your session expired. Please sign in again.'}, headers={'WWW-Authenticate': 'Bearer'}) from None
    except Exception:
        raise HTTPException(503, detail={'code': 'auth_unavailable', 'message': 'Authentication service is unavailable.'}) from None


async def verify_app_check(request: Request, settings: Settings = Depends(get_settings)):
    """Monitor or enforce genuine-app tokens without treating them as user authorization."""
    if request.method in ('GET', 'HEAD', 'OPTIONS') or settings.app_check_mode == 'off':
        return
    token = request.headers.get('x-firebase-appcheck')
    outcome = 'missing'
    if token:
        try:
            app = firebase_app(settings.firebase_project_id)
            await run_in_threadpool(app_check.verify_token, token, app=app)
            outcome = 'valid'
        except Exception:
            outcome = 'invalid'
    logger.info('App Check endpoint=%s outcome=%s mode=%s', request.url.path, outcome, settings.app_check_mode)
    if settings.app_check_mode == 'enforce' and outcome != 'valid':
        # Only these stateless public routes may continue, using the internal engine.
        # This never grants external-provider access or access to stored account data.
        if settings.app_check_public_fallback and request.url.path in (
            '/api/v1/workspace/generate', '/api/v1/workspace/intelligence',
        ):
            request.state.app_check_offline_only = True
            return
        raise HTTPException(401, detail={
            'code': 'invalid_app_check',
            'message': 'This request could not be verified as coming from PMO Compass.',
        })
