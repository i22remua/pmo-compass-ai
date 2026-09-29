"""Selected source privacy, bounded input and evidence provenance (no live AI)."""
import asyncio
from unittest.mock import patch, AsyncMock

import pytest
from pydantic import ValidationError

from app.config import Settings
from app.models.generation import GenerationRequest
from app.providers.offline import OfflinePMOProvider
from app.providers.prompts import build_messages, minimal_ai_context, validate_risk_evidence
from app.providers.service import generate_document
from app.services.inference import PMOInferenceService


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


@pytest.mark.parametrize('language', ['es', 'en'])
def test_contradictions_show_both_evidence_sides_and_diagnosis_labels(payload, language):
    data = with_source(payload)
    data['language'] = language
    data['project'].update(
        startDate='2026-01-01',
        endDate='2026-03-31',
        status='at_risk',
        notes=(
            'The budget is approved. Costs are pending confirmation. The project is on track.'
            if language == 'en'
            else 'El presupuesto está aprobado. Los costes están pendientes. El proyecto está en plazo.'
        ),
    )
    data['sourceExcerpts'][0]['text'] = (
        'The integration dependency finishes 2026-04-15.'
        if language == 'en'
        else 'La dependencia de integración termina el 2026-04-15.'
    )
    data['trackingRecords'] = [
        {'id': 'action-1', 'kind': 'action', 'title': 'Confirm recovery', 'status': 'open',
         'dueDate': '2020-01-01', 'severity': 'unspecified', 'evidence': 'Approved action'},
        {'id': 'risk-1', 'kind': 'risk', 'title': 'Migration failure', 'status': 'open',
         'dueDate': None, 'severity': 'high', 'evidence': 'Reviewed risk'},
        {'id': 'decision-1', 'kind': 'decision', 'title': 'Approve cutover', 'status': 'open',
         'dueDate': None, 'severity': 'unspecified', 'evidence': 'Steering committee'},
    ]
    analysis = PMOInferenceService().analyze(GenerationRequest(**data))
    titles = ' '.join(item.title for item in analysis.contradictions).lower()
    assert ('dependency' if language == 'en' else 'dependencia') in titles
    assert ('budget' if language == 'en' else 'presupuesto') in titles
    assert len(analysis.contradictions) >= 3
    for contradiction in analysis.contradictions:
        assert contradiction.evidenceA.text and contradiction.evidenceB.text
        assert contradiction.suggestedCheck
    assert any(item.classification == 'provided' for item in analysis.diagnosis.currentSituation)
    assert any(item.classification == 'provided' and 'Confirm recovery' in item.text for item in analysis.diagnosis.alerts)
    assert all(item.classification == 'inferred' for item in analysis.diagnosis.potentialImpact)
    assert all(item.classification == 'insufficient' for item in analysis.diagnosis.missingData)


def test_contradiction_detector_does_not_treat_a_budget_number_as_approval(payload):
    payload['project']['notes'] = 'Costs are pending confirmation.'
    payload['project']['budget'] = 120000
    analysis = PMOInferenceService().analyze(GenerationRequest(**payload))
    assert not any('budget' in item.title.lower() for item in analysis.contradictions)


def test_contradiction_detector_separates_conflicting_phrases_in_one_note(payload):
    payload['project']['notes'] = 'The budget is approved, but costs are pending.'
    analysis = PMOInferenceService().analyze(GenerationRequest(**payload))
    contradiction = next(
        item for item in analysis.contradictions if 'budget' in item.title.lower()
    )
    assert contradiction.evidenceA.text.lower() == 'budget is approved'
    assert contradiction.evidenceB.text.lower() == 'costs are pending'


@pytest.mark.parametrize('language', ['es', 'en'])
@pytest.mark.parametrize('scenario', ['delay go-live by three weeks', 'lose the supplier', 'reduce scope'])
def test_offline_scenario_is_explicitly_not_a_prediction(payload, language, scenario):
    request = GenerationRequest(**(payload | {
        'language': language, 'analysisMode': 'scenario', 'question': scenario,
        'trackingRecords': [{'id': 'risk-1', 'kind': 'risk', 'title': 'Vendor dependency',
                             'status': 'open', 'severity': 'high', 'evidence': 'Reviewed'}],
    }))
    result = asyncio.run(generate_document(request, Settings(_env_file=None, ai_provider='offline')))
    assert result.provider == 'offline'
    assert ('no es una predicción' if language == 'es' else 'not a prediction') in result.content
    for heading in (
        ['Consecuencias plausibles', 'Áreas afectadas', 'Riesgos secundarios', 'Decisiones necesarias', 'Datos para una evaluación más fiable']
        if language == 'es'
        else ['Plausible consequences', 'Areas affected', 'Secondary risks', 'Decisions needed', 'Information needed for a more reliable assessment']
    ):
        assert heading in result.content
    assert 'probability' not in result.content.lower() and 'probabilidad' not in result.content.lower()


def test_scenario_prompt_enforces_conditional_language_and_scenario_requires_question(payload):
    from app.providers.prompts import build_messages
    request = GenerationRequest(**(payload | {'analysisMode': 'scenario', 'question': 'What if scope is reduced?'}))
    system = build_messages(request)[0]['content']
    assert 'not a forecast' in system
    assert 'Do not assign probabilities' in system
    assert 'Plausible consequences' in system
    with pytest.raises(ValidationError):
        GenerationRequest(**(payload | {'analysisMode': 'scenario', 'question': ''}))


@pytest.mark.parametrize('record', [
    {'id': 'x', 'kind': 'decision', 'title': 'Decision', 'status': 'open', 'dueDate': '2026-01-01'},
    {'id': 'x', 'kind': 'action', 'title': 'Action', 'status': 'open', 'severity': 'high'},
    {'id': '<x>', 'kind': 'risk', 'title': 'Risk', 'status': 'open', 'severity': 'high'},
])
def test_invalid_tracking_context_is_rejected(payload, record):
    with pytest.raises(ValidationError):
        GenerationRequest(**(payload | {'trackingRecords': [record]}))


def test_tracking_context_is_bounded(payload):
    records = [
        {'id': f'action-{index}', 'kind': 'action', 'title': f'Action {index}', 'status': 'open'}
        for index in range(51)
    ]
    with pytest.raises(ValidationError):
        GenerationRequest(**(payload | {'trackingRecords': records}))


def test_external_ai_context_excludes_account_operational_and_database_identifiers(payload):
    data = with_source(payload) | {
        'externalContextConsent': True,
        'trackingRecords': [{
            'id': 'firestore-record-id', 'kind': 'risk', 'title': 'Supplier delay',
            'status': 'open', 'severity': 'high', 'evidence': 'Reviewed note',
        }],
    }
    request = GenerationRequest(**data)
    context = minimal_ai_context(request)
    serialised = __import__('json').dumps(context)
    assert 'firestore-record-id' not in serialised
    assert 'excerpt-1' not in serialised
    assert 'aiAccess' not in serialised
    assert 'externalContextConsent' not in serialised
    assert 'useOfflineFallback' not in serialised
    assert 'ownerId' not in serialised and 'uid' not in serialised and 'email' not in serialised
    assert context['sourceExcerpts'][0]['reference'] == 'S1'
    assert context['project']['description'] == payload['project']['description']
