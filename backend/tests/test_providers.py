import asyncio
import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from pydantic import ValidationError

from app.config import Settings, get_settings
from app.main import app
from app.models.generation import DocumentType, GenerationRequest, ProviderResult
from app.providers.base import ProviderError
from app.providers.demo import DemoAIProvider
from app.providers.external import ExternalAIProvider
from app.providers.factory import create_provider
from app.providers.ollama import OllamaAIProvider
from app.providers.prompts import build_messages


def ollama_config(**kwargs):
    return Settings(_env_file=None, ai_provider='ollama', auth_mode='demo', **kwargs)


@pytest.mark.parametrize('kind', list(DocumentType))
@pytest.mark.parametrize('language', ['es', 'en'])
def test_sparse_projects_receive_useful_document_specific_preparation(client, kind, language):
    response = client.post('/api/v1/generate', json={
        'project': {'name': 'Harbour modernisation', 'sector': 'Logistics'},
        'type': kind.value, 'language': language,
    })
    assert response.status_code == 200, response.text
    data = response.json()
    assert len(data['content']) > 700
    assert 'Harbour modernisation' in data['content']
    assert ('Información necesaria' if language == 'es' else 'Information needed') in data['content']
    assert data['risks'] and all(r['source'] == 'inferred' for r in data['risks'])
    assert 'None' not in data['content']


def test_formats_have_distinct_structures_and_context_is_not_lost(client, payload):
    payload['project']['notes'] = '\n'.join(f'Background item {index}: plan reviewed.' for index in range(30))
    payload['inputContext'] = 'Prepare the sponsor decision on the Terminal 7 scope change.'
    contents = []
    for kind in DocumentType:
        payload['type'] = kind.value
        response = client.post('/api/v1/generate', json=payload)
        assert response.status_code == 200
        content = response.json()['content']
        assert 'Terminal 7 scope change' in content
        contents.append(tuple(line for line in content.splitlines() if line.startswith('## ')))
    assert len(set(contents)) == 8


@pytest.mark.parametrize('notes,expected', [
    ('No delays, but failed tests block acceptance.', 'Quality or acceptance risk'),
    ('Sin retrasos, pero hay defectos de integración.', 'Quality or acceptance risk'),
    ('No reported defects; integration delayed by 5 days.', 'Schedule slippage'),
    ('No quality issues and no scope changes.', None),
    ('The delay is resolved.', None),
])
def test_negation_does_not_hide_other_independent_signals(client, payload, notes, expected):
    payload['project']['notes'] = notes
    data = client.post('/api/v1/generate', json=payload).json()
    if expected:
        assert expected in [r['risk'] for r in data['risks']]
    else:
        assert data['risks'] and all(r['source'] == 'inferred' for r in data['risks'])
    if notes.startswith(('No delays', 'Sin retrasos')):
        assert 'Schedule slippage' not in [r['risk'] for r in data['risks']]


@pytest.mark.parametrize('notes', ['The release will be delivered next week.', 'El piloto será aprobado el viernes.', 'The design is not approved.'])
def test_future_or_negated_work_is_not_presented_as_completed(client, payload, notes):
    payload.update(type='weekly_status')
    payload['project']['notes'] = notes
    content = client.post('/api/v1/generate', json=payload).json()['content']
    progress = content.split('## Progress this week')[1].split('\n## ')[0]
    assert 'No verifiable progress was provided' in progress


@pytest.mark.parametrize('language,notes,owner,day', [
    ('en', 'Diego must confirm the recovery plan by 2026-10-03.', 'Diego', '2026-10-03'),
    ('es', 'Marta debe enviar el plan antes del viernes.', 'Marta', 'viernes'),
])
def test_actions_retain_explicit_owners_and_deadline_references(client, payload, language, notes, owner, day):
    payload.update(type='action_items', language=language)
    payload['project']['notes'] = notes
    content = client.post('/api/v1/generate', json=payload).json()['content']
    row = next(line for line in content.splitlines() if '| A-01 |' in line)
    cells = row.split('|')
    assert owner in cells[3] and day in cells[4]
    assert ('validar' if language == 'es' else 'validate') in cells[4]


def test_minutes_separate_recorded_and_pending_decisions(client, payload):
    payload['type'] = 'meeting_minutes'
    payload['project']['notes'] = 'Design is approved.\nSponsor approval pending for SMS reminders.'
    content = client.post('/api/v1/generate', json=payload).json()['content']
    recorded = content.split('## Decisions recorded in the source')[1].split('\n## ')[0]
    pending = content.split('## Decisions awaiting confirmation')[1].split('\n## ')[0]
    assert 'Design is approved' in recorded and 'SMS reminders' not in recorded
    assert 'SMS reminders' in pending and 'Design is approved' not in pending


@pytest.mark.parametrize('name,expected', [('demo', DemoAIProvider), ('ollama', OllamaAIProvider), ('external', ExternalAIProvider)])
def test_factory_selects_the_named_adapter_without_network_calls(name, expected):
    with patch('httpx.AsyncClient') as network:
        provider = create_provider(Settings(_env_file=None, ai_provider=name))
        assert isinstance(provider, expected) and provider.name == ('offline' if name == 'demo' else name)
        network.assert_not_called()


def test_default_environment_requires_no_model_or_api_key():
    settings = Settings(_env_file=None)
    assert settings.ai_provider == 'auto'
    assert settings.ollama_base_url == 'http://localhost:11434'
    assert settings.ollama_model == 'llama3.1'


@pytest.mark.parametrize('failure,status,code', [
    (httpx.ConnectError('Service absent'), 503, 'provider_unavailable'),
    (httpx.ReadTimeout('Model slow'), 504, 'provider_timeout'),
])
def test_ollama_failure_falls_back_automatically_and_explicit_offline_skips_model(client, payload, failure, status, code):
    app.dependency_overrides[get_settings] = lambda: ollama_config()
    with patch('app.providers.ollama.httpx.AsyncClient') as factory:
        network = AsyncMock()
        network.post.side_effect = failure
        factory.return_value.__aenter__.return_value = network
        response = client.post('/api/v1/generate', json=payload)
        assert response.status_code == 200
        assert response.json()['provider'] == 'offline'
        assert response.json()['fallbackFrom'] == 'ollama'
        assert any('External AI is temporarily unavailable' in w for w in response.json()['warnings'])
        assert network.post.await_count == 1
        payload['useDemoFallback'] = True
        fallback = client.post('/api/v1/generate', json=payload)
        assert fallback.status_code == 200, fallback.text
        data = fallback.json()
        assert data['provider'] == 'offline' and data['fallbackFrom'] == 'ollama'
        assert 'Atlas portal' in data['content'] and len([r for r in data['risks'] if r['source'] == 'provided']) == 2
        assert any('Offline PMO Engine' in warning for warning in data['warnings'])
        assert network.post.await_count == 1  # Never wait for the failed model again.


def test_fallback_keeps_authentication_and_public_playground_never_calls_ollama(client, payload):
    app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None, ai_provider='ollama', auth_mode='firebase', firebase_project_id='demo-pmo-compass')
    payload['useDemoFallback'] = True
    with patch.object(OllamaAIProvider, 'generate', new_callable=AsyncMock) as model:
        denied = client.post('/api/v1/generate', json=payload)
        assert denied.status_code == 401
        public = client.post('/api/v1/demo/generate', json=payload)
        assert public.status_code == 200
        assert public.json()['provider'] == 'offline' and public.json()['fallbackFrom'] is None
        model.assert_not_called()


def test_health_is_responsive_when_ollama_is_not_installed(client):
    app.dependency_overrides[get_settings] = lambda: ollama_config()
    with patch('httpx.AsyncClient') as network:
        response = client.get('/api/v1/health')
        assert response.status_code == 200
        assert response.json()['model'] == 'llama3.1'
        network.assert_not_called()


def test_ollama_missing_model_explains_the_recovery(client, payload):
    app.dependency_overrides[get_settings] = lambda: ollama_config()
    network = AsyncMock()
    network.post.return_value = httpx.Response(404, json={'error': 'model not found'}, request=httpx.Request('POST', 'http://localhost:11434/api/chat'))
    with patch('app.providers.ollama.httpx.AsyncClient') as factory:
        factory.return_value.__aenter__.return_value = network
        with pytest.raises(ProviderError) as error:
            asyncio.run(OllamaAIProvider(ollama_config()).generate(GenerationRequest(**payload)))
    assert error.value.code == 'ollama_model_unavailable'


@pytest.mark.parametrize('envelope,code', [
    ({'done': True, 'message': {'content': '{"content": "   "}'}}, 'invalid_provider_response'),
    ({'done': True, 'message': {'content': '{"content": "OK"}'}}, 'invalid_provider_response'),
    ({'done': False, 'message': {'content': 'partial'}}, 'incomplete_provider_response'),
    ({'done': True, 'done_reason': 'length', 'message': {'content': 'truncated'}}, 'incomplete_provider_response'),
    ([], 'invalid_provider_response'),
])
def test_empty_or_incomplete_model_outputs_never_become_documents(client, payload, envelope, code):
    app.dependency_overrides[get_settings] = lambda: ollama_config()
    network = AsyncMock()
    network.post.return_value = httpx.Response(200, json=envelope, request=httpx.Request('POST', 'http://localhost:11434/api/chat'))
    with patch('app.providers.ollama.httpx.AsyncClient') as factory:
        factory.return_value.__aenter__.return_value = network
        with pytest.raises(ProviderError) as error:
            asyncio.run(OllamaAIProvider(ollama_config()).generate(GenerationRequest(**payload)))
    assert error.value.code == code


def test_ollama_honours_custom_model_and_rejects_fabricated_risk_quotes(payload):
    request = GenerationRequest(**payload)
    result = asyncio.run(DemoAIProvider().generate(request)).model_dump()
    result['risks'][0]['evidence'] = 'Invented: the sponsor approved a 40 percent budget increase.'
    network = AsyncMock()
    network.post.return_value = httpx.Response(200, json={'done': True, 'message': {'content': json.dumps(result)}}, request=httpx.Request('POST', 'http://localhost:11434/api/chat'))
    settings = ollama_config(ollama_model='my-local-model', ollama_base_url='http://localhost:11555/')
    with patch('app.providers.ollama.httpx.AsyncClient') as factory:
        factory.return_value.__aenter__.return_value = network
        with pytest.raises(ProviderError) as error:
            asyncio.run(OllamaAIProvider(settings).generate(request))
    assert error.value.code == 'invalid_provider_response'
    assert network.post.call_args.args[0] == 'http://localhost:11555/api/chat'
    sent = network.post.call_args.kwargs['json']
    assert sent['model'] == 'my-local-model' and sent['stream'] is False
    assert 'useDemoFallback' not in sent['messages'][1]['content']


def test_model_prompts_are_document_specific_and_keep_notes_as_data(payload):
    request = GenerationRequest(**payload)
    prompts = [build_messages(request.model_copy(update={'type': kind})) for kind in DocumentType]
    assert len({messages[0]['content'] for messages in prompts}) == 8
    for messages in prompts:
        assert 'PMO analyst' in messages[0]['content']
        assert json.loads(messages[1]['content'])['project']['notes'] == payload['project']['notes']
    spanish = build_messages(request.model_copy(update={'language': 'es'}))
    assert 'Write in Spanish' in spanish[0]['content']


def test_external_placeholder_never_attempts_a_paid_request(payload):
    with patch('httpx.AsyncClient') as network:
        with pytest.raises(ProviderError) as error:
            asyncio.run(ExternalAIProvider().generate(GenerationRequest(**payload)))
        assert error.value.code == 'external_not_configured'
        network.assert_not_called()


def test_result_contract_rejects_blank_or_schema_drifting_output():
    with pytest.raises(ValidationError):
        ProviderResult(content=' ' * 150)
    with pytest.raises(ValidationError):
        ProviderResult(content='# Report\n\n' + 'Source evidence. ' * 10, provider='external')
