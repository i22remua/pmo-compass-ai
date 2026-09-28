"""Selected source privacy, bounded input and evidence provenance (no live AI)."""
import asyncio
from unittest.mock import patch, AsyncMock

import pytest
from pydantic import ValidationError

from app.config import Settings
from app.models.generation import GenerationRequest
from app.providers.offline import OfflinePMOProvider
from app.providers.prompts import build_messages, validate_risk_evidence
from app.providers.service import generate_document


def with_source(payload):
    return payload | {'sourceExcerpts': [{'id': 'excerpt-1', 'label': 'Minutes.txt', 'locator': '¶ 2',
        'text': 'Vendor migration delayed by 12 days.', 'reviewed': True}]}


@pytest.mark.parametrize('language', ['es', 'en'])
@pytest.mark.parametrize('private_project,consent', [(True, True), (True, False), (False, False)])
def test_private_context_never_calls_remote_provider(payload, language, private_project, consent):
    data = with_source(payload)
    data['language'] = language
    data['project']['aiAccess'] = 'offline' if private_project else 'external'
    data['externalContextConsent'] = consent
    with patch('httpx.AsyncClient') as network:
        result = asyncio.run(generate_document(GenerationRequest(**data), Settings(_env_file=None, ai_provider='auto', gemini_api_key='placeholder', gemini_free_tier_confirmed=True)))
    network.assert_not_called()
    assert result.provider == 'offline' and result.fallbackFrom is None
    assert 'Minutes' in result.content and '[S1]' in result.content
    assert 'Vendor migration delayed by 12 days' in result.content
    assert any(('Modo privado' if language == 'es' else 'Private mode') in w for w in result.warnings)


def test_private_project_without_files_is_also_internal(payload):
    payload['project']['aiAccess'] = 'offline'
    with patch('httpx.AsyncClient') as network:
        result = asyncio.run(generate_document(GenerationRequest(**payload), Settings(_env_file=None, ai_provider='gemini')))
    network.assert_not_called()
    assert result.provider == 'offline' and result.fallbackFrom is None


def test_external_context_requires_explicit_consent_and_valid_references(payload):
    data = with_source(payload) | {'externalContextConsent': True}
    request = GenerationRequest(**data)
    assert not request.private_context
    prompt = build_messages(request)[0]['content']
    assert 'untrusted' in prompt and '[S1]' in prompt
    result = asyncio.run(OfflinePMOProvider().generate(GenerationRequest(**payload)))
    with pytest.raises(ValueError, match='citations'):
        validate_risk_evidence(result, request)
    result.content += '\nSource [S2]'
    with pytest.raises(ValueError, match='citations'):
        validate_risk_evidence(result, request)
    result.content = result.content.replace('[S2]', '[S1]')
    validate_risk_evidence(result, request)
    result.risks[0].evidence = data['sourceExcerpts'][0]['text']
    validate_risk_evidence(result, request)
    result.risks[0].evidence = 'Unprovided approved budget.'
    with pytest.raises(ValueError, match='evidence'):
        validate_risk_evidence(result, request)


@pytest.mark.parametrize('case', ['duplicate', 'too_many', 'too_long', 'aggregate', 'invalid_id', 'consent'])
def test_rejects_invalid_or_excess_context(payload, case):
    data = with_source(payload)
    source = data['sourceExcerpts'][0]
    if case == 'duplicate': data['sourceExcerpts'] *= 2
    if case == 'too_many': data['sourceExcerpts'] = [source | {'id': str(i)} for i in range(21)]
    if case == 'too_long': source['text'] = 'x' * 2001
    if case == 'aggregate': data['sourceExcerpts'] = [source | {'id': str(i), 'text': 'x' * 2000} for i in range(11)]
    if case == 'invalid_id': source['id'] = '<script>'
    if case == 'consent': data['externalContextConsent'] = 'true'
    with pytest.raises(ValidationError): GenerationRequest(**data)


def test_source_html_is_literal_and_maximum_context_remains_saveable(payload):
    data = with_source(payload)
    data['sourceExcerpts'] = [data['sourceExcerpts'][0] | {'id': str(i), 'label': '<script>not-code</script>', 'text': 'Risk delay. ' + '*[]<>!' * 331} for i in range(10)]
    result = asyncio.run(generate_document(GenerationRequest(**data), Settings(_env_file=None, ai_provider='offline')))
    assert '<script>' not in result.content
    assert len(result.content) <= 100000


def test_selected_context_is_accepted_by_api(client, payload):
    response = client.post('/api/v1/workspace/generate', json=with_source(payload))
    assert response.status_code == 200
    assert response.json()['provider'] == 'offline'
    assert '[S1]' in response.json()['content']


def test_overlong_external_output_falls_back_without_losing_sources(payload):
    request = GenerationRequest(**(with_source(payload) | {'externalContextConsent': True}))
    result = asyncio.run(OfflinePMOProvider().generate(request))
    result.content = '# Large draft\n' + 'x' * 99950 + ' [S1]'
    with patch('app.providers.gemini.GeminiProvider.generate', new=AsyncMock(return_value=result)):
        response = asyncio.run(generate_document(request, Settings(_env_file=None, ai_provider='gemini')))
    assert response.provider == 'offline'
    assert response.fallbackFrom == 'gemini'
    assert 'Minutes' in response.content and len(response.content) <= 100000
