import pytest

from app.models.generation import GenerationRequest
from app.services.inference import PMOInferenceService


@pytest.mark.parametrize('language,description', [('es', 'Prueba'), ('en', 'Trial')])
def test_minimum_valid_description_does_not_manufacture_risks(language, description):
    request = GenerationRequest(
        project={'name': 'Proyecto de prueba', 'sector': 'Unspecified', 'description': description},
        type='risk_register', language=language,
    )
    analysis = PMOInferenceService().analyze(request)
    assert analysis.health == 'unknown'
    assert analysis.confidence == 'low'
    assert not analysis.risks
    assert not analysis.assumptions
    assert not analysis.recommendedActions
    assert not analysis.pendingDecisions
    assert not analysis.stakeholders
    for group in (analysis.diagnosis.causes, analysis.diagnosis.potentialImpact, analysis.diagnosis.missingData):
        assert group and all(item.classification == 'insufficient' for item in group)
    assert any('dependenc' in item.lower() for item in analysis.missingInformation)
    assert request.project.budget is None
    assert request.project.startDate is None and request.project.endDate is None


@pytest.mark.parametrize('language', ['es', 'en'])
def test_minimum_description_does_not_hide_supplied_risk_evidence(language):
    request = GenerationRequest(
        project={'name': 'Proyecto de prueba', 'sector': 'Unspecified', 'description': 'Prueba',
                 'notes': 'Vendor delivery delayed by 12 days.'},
        type='risk_register', language=language,
    )
    analysis = PMOInferenceService().analyze(request)
    assert analysis.health == 'attention'
    assert any(risk.source == 'provided' and '12 days' in risk.evidence for risk in analysis.risks)
