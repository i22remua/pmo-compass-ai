"""Unattested public visitors get bounded internal inference, never cloud access."""
from unittest.mock import MagicMock, patch

import pytest

from app.api.routes import free_usage
from app.config import Settings, get_settings
from app.main import app
from app.providers.factory import create_provider


@pytest.fixture(autouse=True)
def public_fallback_config(config):
    app.dependency_overrides[get_settings] = lambda: Settings(
        _env_file=None, app_env='test', auth_mode='firebase',
        firebase_project_id='demo-pmo-compass', app_check_mode='enforce',
        app_check_public_fallback=True, ai_provider='gemini',
        gemini_api_key='test-key', gemini_free_tier_confirmed=True,
        rate_limit_per_minute=2,
    )


@pytest.mark.parametrize('language', ['es', 'en'])
@pytest.mark.parametrize('token', [None, 'invalid-token'])
def test_unattested_public_generation_never_calls_external_provider(client, payload, language, token):
    headers = {'X-Firebase-AppCheck': token} if token else {}
    with patch('app.api.auth.firebase_app', return_value=MagicMock()), patch(
        'app.api.auth.app_check.verify_token', side_effect=ValueError('private upstream detail')), patch(
        'app.providers.service.create_provider', wraps=create_provider) as factory:
        response = client.post('/api/v1/workspace/generate', json=payload | {'language': language}, headers=headers)
    assert response.status_code == 200
    result = response.json()
    assert result['provider'] == 'offline'
    assert result['fallbackFrom'] == 'gemini'
    assert [call.args[0].ai_provider for call in factory.call_args_list] == ['offline']
    assert not free_usage.hits
    assert 'private upstream detail' not in response.text
    warnings = ' '.join(result['warnings'])
    assert ('no ha podido validarse' if language == 'es' else 'could not be verified') in warnings
    assert 'usage limit reached' not in warnings and 'Límite gratuito alcanzado' not in warnings


@pytest.mark.parametrize('path', ['/generate', '/intelligence', '/demo/generate'])
def test_public_fallback_never_opens_other_routes(client, payload, path):
    response = client.post('/api/v1' + path, json=payload)
    assert response.status_code == 401
    assert response.json()['detail']['code'] == 'invalid_app_check'


@pytest.mark.parametrize('path', ['/workspace/generate', '/workspace/intelligence'])
def test_public_fallback_keeps_rate_limits(client, payload, path):
    for _ in range(2):
        assert client.post('/api/v1' + path, json=payload).status_code == 200
    limited = client.post('/api/v1' + path, json=payload)
    assert limited.status_code == 429
    assert limited.headers['Retry-After'] == '60'


def test_verified_visitor_still_reaches_external_provider(client, payload):
    # Substitute the transport only; capture the provider settings selected by routing.
    offline = create_provider(Settings(_env_file=None, ai_provider='offline'))
    with patch('app.api.auth.firebase_app', return_value=MagicMock()), patch(
        'app.api.auth.app_check.verify_token', return_value={'app_id': 'web-app'}), patch(
        'app.providers.service.create_provider', return_value=offline) as factory:
        response = client.post('/api/v1/workspace/generate', json=payload,
                               headers={'X-Firebase-AppCheck': 'verified-token'})
    assert response.status_code == 200
    assert factory.call_args.args[0].ai_provider == 'gemini'
    assert not any('could not be verified' in warning for warning in response.json()['warnings'])


def test_verified_app_still_requires_user_authentication_for_private_route(client, payload):
    with patch('app.api.auth.firebase_app', return_value=MagicMock()), patch(
        'app.api.auth.app_check.verify_token', return_value={'app_id': 'web-app'}):
        response = client.post('/api/v1/generate', json=payload,
                               headers={'X-Firebase-AppCheck': 'verified-token'})
    assert response.status_code == 401
    assert response.json()['detail']['code'] == 'authentication_required'


def test_public_fallback_does_not_relax_input_validation(client, payload):
    response = client.post('/api/v1/workspace/generate', json=payload | {'ownerId': 'another-user'})
    assert response.status_code == 422
