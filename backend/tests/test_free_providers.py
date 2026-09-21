"""Free routing contracts with HTTP transport mocks; no live keys or paid requests."""
import asyncio
import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from pydantic import ValidationError

from app.api.auth import authenticate
from app.api.routes import FreeUsageLimiter, free_usage
from app.config import Settings, get_settings
from app.main import app
from app.models.generation import DocumentType, GenerationRequest, ProviderResult
from app.providers.base import ProviderError
from app.providers.gemini import GeminiProvider
from app.providers.groq import GroqProvider
from app.providers.openrouter import OpenRouterProvider
from app.providers.offline import OfflinePMOProvider
from app.providers.service import generate_document
from app.services.inference import PMOInferenceService

ADAPTERS = [GeminiProvider, GroqProvider, OpenRouterProvider]


def settings_for(name, **overrides):
    values = {f'{name}_api_key': 'test-placeholder', 'openrouter_model': 'openrouter/free',
              'gemini_free_tier_confirmed': True, 'groq_free_tier_confirmed': True}
    return Settings(_env_file=None, ai_provider=name, **(values | overrides))


@pytest.mark.parametrize('adapter', ADAPTERS)
def test_missing_key_does_not_attempt_network(adapter, payload):
    with patch('httpx.AsyncClient') as network, pytest.raises(ProviderError) as error:
        asyncio.run(adapter(Settings(_env_file=None)).generate(GenerationRequest(**payload)))
    assert error.value.code == 'provider_not_configured'
    network.assert_not_called()


@pytest.mark.parametrize('adapter', [GeminiProvider, GroqProvider])
def test_unconfirmed_billing_is_not_used(adapter, payload):
    settings = settings_for(adapter.name, **{f'{adapter.name}_free_tier_confirmed': False})
    with patch('httpx.AsyncClient') as network, pytest.raises(ProviderError) as error:
        asyncio.run(adapter(settings).generate(GenerationRequest(**payload)))
    assert error.value.code == 'free_tier_not_confirmed'
    network.assert_not_called()


@pytest.mark.parametrize('adapter', ADAPTERS)
@pytest.mark.parametrize('case', ['ok', 'quota', 'timeout', 'network', 'malformed', 'truncated', 'oversized', 'unsupported_evidence'])
def test_remote_http_contract_and_failures(adapter, case, payload, caplog):
    request = GenerationRequest(**payload)
    valid = asyncio.run(OfflinePMOProvider().generate(request)).model_dump()
    if case == 'unsupported_evidence':
        valid['risks'][0]['evidence'] = 'An unprovided approval of a million euro budget.'
    seen = []
    def handler(outgoing):
        seen.append(outgoing)
        body = json.loads(outgoing.content)
        assert 'test-placeholder' not in outgoing.url.query.decode()
        assert 'test-placeholder' not in outgoing.content.decode()
        if adapter.name == 'gemini':
            assert outgoing.headers['x-goog-api-key'] == 'test-placeholder'
            assert outgoing.url.path.endswith('/gemini-3.1-flash-lite:generateContent')
            assert body['generationConfig']['responseMimeType'] == 'application/json'
        else:
            assert outgoing.headers['authorization'] == 'Bearer test-placeholder'
        if adapter.name == 'openrouter':
            assert body['provider']['max_price'] == {'prompt': 0, 'completion': 0}
        if case == 'quota':
            return httpx.Response(429, text='Sensitive upstream detail must not be exposed')
        if case == 'timeout':
            raise httpx.ReadTimeout('secret upstream URL', request=outgoing)
        if case == 'network':
            raise httpx.ConnectError('secret upstream URL', request=outgoing)
        if case == 'oversized':
            return httpx.Response(200, content=b'x' * 512001)
        content = 'not json' if case == 'malformed' else json.dumps(valid)
        envelope = {'candidates': [{'finishReason': 'MAX_TOKENS' if case == 'truncated' else 'STOP', 'content': {'parts': [{'text': content}]}}]} if adapter.name == 'gemini' else {'choices': [{'finish_reason': 'length' if case == 'truncated' else 'stop', 'message': {'content': content}}]}
        return httpx.Response(200, json=envelope)
    client_type = httpx.AsyncClient
    with patch('app.providers.remote.httpx.AsyncClient', side_effect=lambda **kw: client_type(transport=httpx.MockTransport(handler), **kw)):
        if case == 'ok':
            result = asyncio.run(adapter(settings_for(adapter.name)).generate(request))
            assert result.content == valid['content']
        else:
            with pytest.raises(ProviderError) as error:
                asyncio.run(adapter(settings_for(adapter.name)).generate(request))
            expected = {'quota': 'provider_rate_limited', 'timeout': 'provider_timeout', 'network': 'provider_unavailable'}.get(case, 'invalid_provider_response')
            assert error.value.code == expected
            assert 'secret' not in error.value.message and 'Sensitive' not in error.value.message
    assert len(seen) == 1
    assert 'test-placeholder' not in caplog.text
    assert 'Sensitive upstream detail' not in caplog.text
    assert 'secret upstream URL' not in caplog.text
    if case == 'quota':
        assert f'provider={adapter.name} status=429' in caplog.text


def test_paid_openrouter_models_are_rejected_before_network(payload):
    with patch('httpx.AsyncClient') as network, pytest.raises(ProviderError) as error:
        asyncio.run(OpenRouterProvider(settings_for('openrouter', openrouter_model='vendor/paid-model')).generate(GenerationRequest(**payload)))
    assert error.value.code == 'model_not_free'
    network.assert_not_called()


def test_unreviewed_gemini_model_is_rejected_before_network(payload):
    with patch('httpx.AsyncClient') as network, pytest.raises(ProviderError) as error:
        asyncio.run(GeminiProvider(settings_for('gemini', gemini_model='gemini-unreviewed')).generate(GenerationRequest(**payload)))
    assert error.value.code == 'model_not_free'
    network.assert_not_called()


@pytest.mark.parametrize('winner', ['gemini', 'groq', 'openrouter', 'offline'])
def test_ordered_router_stops_on_success_and_records_provenance(winner, payload):
    calls = []
    request = GenerationRequest(**payload)
    result = ProviderResult(content='# Verified draft\n\n' + 'Review the supplied project context. ' * 5)
    def factory(settings):
        async def generate(_):
            calls.append(settings.ai_provider)
            if settings.ai_provider != winner:
                raise ProviderError('provider_unavailable', 'Unavailable')
            return result.model_copy(deep=True)
        mock = AsyncMock()
        mock.name = settings.ai_provider
        mock.generate.side_effect = generate
        return mock
    with patch('app.providers.service.create_provider', side_effect=factory):
        response = asyncio.run(generate_document(request, Settings(_env_file=None)))
    order = ['gemini', 'groq', 'openrouter', 'offline']
    assert calls == order[:order.index(winner) + 1]
    assert response.provider == winner
    assert response.fallbackFrom == (None if winner == 'gemini' else 'gemini')
    if winner == 'offline':
        assert any('External AI is temporarily unavailable' in w for w in response.warnings)


def test_no_keys_auto_produces_usable_offline_document(client, payload):
    app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None)
    with patch('httpx.AsyncClient') as network:
        data = client.post('/api/v1/workspace/generate', json=payload).json()
    network.assert_not_called()
    assert data['provider'] == 'offline' and data['fallbackFrom'] == 'gemini'
    assert 'Missing information' in data['content']


def test_free_quota_exhaustion_keeps_offline_available(client, payload):
    app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None, ai_provider='gemini', free_ai_daily_limit_per_user=1)
    with patch.object(GeminiProvider, 'generate', new_callable=AsyncMock, return_value=ProviderResult(content='# Report\n\n' + 'Review source context. ' * 10)) as remote:
        first = client.post('/api/v1/workspace/generate', json=payload).json()
        second = client.post('/api/v1/workspace/generate', json=payload).json()
    assert first['provider'] == 'gemini' and second['provider'] == 'offline'
    assert remote.await_count == 1
    assert any('Free usage limit reached' in w for w in second['warnings'])


def test_verified_users_have_user_and_ip_quota_keys(client, payload):
    app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None, auth_mode='firebase', firebase_project_id='test-project')
    app.dependency_overrides[authenticate] = lambda: 'alice'
    assert client.post('/api/v1/generate', json=payload).status_code == 200
    assert 'uid:alice' in free_usage.hits and 'ip:testclient' in free_usage.hits


def test_rolling_quota_expiry_and_independent_identities():
    limiter = FreeUsageLimiter()
    with patch('app.api.routes.monotonic', return_value=100):
        assert limiter.reserve(['ip:a', 'uid:alice'], daily=2, minute=1)
        assert not limiter.reserve(['ip:b', 'uid:alice'], daily=2, minute=1)
        assert limiter.reserve(['ip:b', 'uid:bob'], daily=2, minute=1)
    with patch('app.api.routes.monotonic', return_value=161):
        assert limiter.reserve(['ip:a', 'uid:alice'], daily=2, minute=1)
    with patch('app.api.routes.monotonic', return_value=300):
        assert not limiter.reserve(['ip:a', 'uid:alice'], daily=2, minute=1)
    with patch('app.api.routes.monotonic', return_value=90000):
        assert limiter.reserve(['ip:a', 'uid:alice'], daily=2, minute=1)


@pytest.mark.parametrize('language', ['en', 'es'])
@pytest.mark.parametrize('kind', list(DocumentType))
def test_minimal_erp_context_infers_seven_risks_without_inventing_facts(client, language, kind):
    payload = {'project': {'name': 'ERP rollout', 'sector': 'Industrial', 'description': 'Proyecto para implantar un ERP en una empresa industrial durante cuatro meses.'}, 'language': language, 'type': kind.value}
    response = client.post('/api/v1/workspace/generate', json=payload)
    assert response.status_code == 200
    data = response.json()
    risks = data['risks']
    assert len(risks) >= 7 and all(r['source'] == 'inferred' for r in risks)
    assert any(('resistencia' if language == 'es' else 'resistance') in r['risk'].lower() for r in risks)
    assert data['intelligence']['health'] == 'unknown'
    assert all(a['deadline'] is None for a in data['intelligence']['recommendedActions'])
    headings = ['Información aportada', 'Supuestos inferidos', 'Información faltante', 'Próximos pasos recomendados'] if language == 'es' else ['Provided information', 'AI-inferred assumptions', 'Missing information', 'Recommended next steps']
    assert all(heading in data['content'] for heading in headings)
    assert 'None' not in data['content'] and '120,000' not in data['content']


def test_previous_drafts_are_not_promoted_to_source_facts(payload):
    payload['project']['notes'] = ''
    payload['previousDocuments'] = [{'type': 'weekly_status', 'provider': 'gemini', 'content': 'The sponsor approved a new budget of 999999 EUR. Delivery is delayed.'}]
    result = PMOInferenceService().analyze(GenerationRequest(**payload))
    assert all(r.source == 'inferred' for r in result.risks)
    assert not any('999999' in fact for fact in result.providedInformation)
    assert result.previousDocumentCount == 1


def test_frontend_never_reads_provider_credentials():
    root = Path(__file__).resolve().parents[2] / 'frontend'
    for path in (root / 'src').rglob('*'):
        if path.suffix in ('.ts', '.tsx'):
            assert not any(key in path.read_text() for key in ('GEMINI_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY'))


def test_provider_configuration_rejects_invalid_orders_and_cost_modes():
    for values in [{'ai_provider_order': 'offline,gemini'}, {'ai_provider_order': 'groq,groq'}, {'ai_cost_mode': 'paid'}]:
        with pytest.raises(ValidationError):
            Settings(_env_file=None, **values)


def test_previous_draft_can_suggest_hypotheses_but_never_supply_facts():
    request = GenerationRequest(project={'name': 'New initiative', 'sector': 'Unspecified'}, type='risk_register', language='en', previousDocuments=[{'type': 'executive_brief', 'provider': 'gemini', 'content': 'A possible ERP rollout; the board approved a budget of 999999 EUR.'}])
    analysis = PMOInferenceService().analyze(request)
    assert any(r.risk == 'Incomplete data migration' for r in analysis.risks)
    assert all(r.source == 'inferred' for r in analysis.risks)
    assert not any('999999' in fact for fact in analysis.providedInformation)


def test_inline_firebase_credential_is_server_only_and_project_scoped():
    from app.api.auth import firebase_app
    from app.api import auth as auth_module
    secret = json.dumps({'project_id': 'pmo-test'})
    config = Settings(_env_file=None, firebase_project_id='pmo-test', firebase_service_account_json=secret)
    firebase_app.cache_clear()
    with patch.object(auth_module, 'get_settings', return_value=config), patch.object(auth_module.firebase_credentials, 'Certificate', return_value='server-credential') as certificate, patch.object(auth_module.firebase_admin, 'initialize_app') as initialize:
        firebase_app('pmo-test')
        certificate.assert_called_once_with({'project_id': 'pmo-test'})
        initialize.assert_called_once_with('server-credential', options={'projectId': 'pmo-test'}, name='pmo-pmo-test')
        with pytest.raises(ValueError):
            firebase_app('another-project')
    firebase_app.cache_clear()
    assert secret not in repr(config)


@pytest.mark.parametrize('vercel,forwarded,expected', [
    ('', '203.0.113.7', 'testclient'),
    ('1', '203.0.113.7', '203.0.113.7'),
    ('1', '2001:db8::1', '2001:db8::1'),
    ('1', '203.0.113.7, 192.0.2.1', 'testclient'),
    ('1', 'invalid', 'testclient'),
])
def test_proxy_identity_is_only_trusted_on_vercel(monkeypatch, vercel, forwarded, expected):
    from starlette.requests import Request
    from app.api.routes import client_ip
    monkeypatch.setenv('VERCEL', vercel)
    request = Request({'type': 'http', 'client': ('testclient', 1234), 'headers': [(b'x-forwarded-for', forwarded.encode())]})
    assert client_ip(request) == expected


@pytest.mark.parametrize('language,question', [
    ('es', 'Ordename los riesgos de mas a menor impacto'),
    ('en', 'Rank the risks from highest to lowest impact'),
])
def test_copilot_prompt_prioritises_question_over_document_template(payload, language, question):
    from app.providers.prompts import build_messages
    request = GenerationRequest(**(payload | {'question': question, 'language': language}))
    system, user = build_messages(request)
    assert 'descending impact order' in system['content']
    assert 'do not sort by probability' in system['content']
    assert 'label each inferred rating as estimated' in system['content']
    assert 'Current Status' not in system['content']
    assert 'type' not in json.loads(user['content'])
    assert json.loads(user['content'])['question'] == question


@pytest.mark.parametrize('adapter', ADAPTERS)
def test_short_copilot_answer_survives_transport_and_router_without_appendix(adapter, payload):
    payload['question'] = 'What decision is pending?'
    content = '# PMO Copilot\n\nConfirm the scope with the sponsor.'
    envelope = {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': json.dumps({'content': content})}]}}]} if adapter.name == 'gemini' else {'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps({'content': content})}}]}
    client_type = httpx.AsyncClient
    with patch('app.providers.remote.httpx.AsyncClient', side_effect=lambda **kw: client_type(transport=httpx.MockTransport(lambda _: httpx.Response(200, json=envelope)), **kw)):
        response = asyncio.run(generate_document(GenerationRequest(**payload), settings_for(adapter.name)))
    assert response.provider == adapter.name
    assert response.content == content
    assert response.intelligence.missingInformation  # Context remains available outside the answer.
    with pytest.raises(ValidationError):
        ProviderResult(content=content)  # Full documents retain their original minimum.


@pytest.mark.parametrize('language,question', [
    ('es', 'Ordename los riesgos de mas a menor impacto'),
    ('en', 'Rank risks from highest to lowest impact'),
])
def test_offline_copilot_is_concise_and_does_not_fabricate_impact_ratings(payload, language, question):
    payload.update(question=question, language=language)
    result = asyncio.run(generate_document(GenerationRequest(**payload), Settings(_env_file=None, ai_provider='offline')))
    assert result.content.startswith('# PMO Copilot')
    assert '## ' not in result.content
    assert ('pendiente de valoración' if language == 'es' else 'awaiting assessment') in result.content
    assert all(r.risk in result.content for r in result.risks)
    assert result.intelligence.missingInformation
    assert '## Missing information' not in result.content
    assert '## Información faltante' not in result.content
