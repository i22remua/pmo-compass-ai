from unittest.mock import MagicMock, patch

from app.config import Settings, get_settings
from app.main import app


def test_operational_response_headers_do_not_disclose_credentials(client):
    response = client.get('/api/v1/health', headers={
        'Authorization': 'Bearer never-log-this',
        'X-Firebase-AppCheck': 'never-log-this-either',
    })
    assert response.status_code == 200
    assert response.headers['x-content-type-options'] == 'nosniff'
    assert response.headers['referrer-policy'] == 'no-referrer'
    assert response.headers['x-request-id']
    assert 'never-log' not in response.text


def test_private_route_identity_comes_from_verified_claim_not_request(client, payload):
    app.dependency_overrides[get_settings] = lambda: Settings(
        _env_file=None, auth_mode='firebase', firebase_project_id='demo-pmo-compass',
        ai_provider='offline')
    forged = payload | {'project': payload['project'] | {'ownerId': 'victim'}}
    with patch('app.api.auth.firebase_app', return_value=MagicMock()), patch(
        'app.api.auth.auth.verify_id_token', return_value={'uid': 'attacker'}):
        response = client.post('/api/v1/generate', json=forged,
                               headers={'Authorization': 'Bearer verified-attacker-token'})
    assert response.status_code == 422
    assert 'victim' not in response.text


def test_cors_never_reflects_an_unconfigured_origin(client):
    response = client.options('/api/v1/workspace/generate', headers={
        'Origin': 'https://attacker.example',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'X-Firebase-AppCheck,Authorization',
    })
    assert response.headers.get('access-control-allow-origin') is None
