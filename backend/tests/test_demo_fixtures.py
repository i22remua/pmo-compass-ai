"""The public portfolio examples must remain useful and match their checked-in drafts."""
import asyncio
import json
from datetime import date
from pathlib import Path
from unittest.mock import patch

import pytest

from app.models.generation import GenerationRequest, ProviderResult
from app.providers.demo import DemoAIProvider
from app.providers.prompts import validate_risk_evidence

fixtures = Path(__file__).resolve().parents[2] / 'frontend/src/lib'


@pytest.mark.parametrize('language', ['es', 'en'])
def test_bilingual_demo_examples_are_complete_grounded_and_reproducible(language):
    projects = json.loads((fixtures / 'demo-projects.json').read_text())[language]
    documents = json.loads((fixtures / 'demo-documents.json').read_text())[language]
    assert len(projects) == len(documents) == 6
    for index in (0, 2, 4, 5):
        for field in ('name', 'sector', 'description', 'objectives', 'stakeholders', 'notes'):
            assert projects[index][field].strip()
    for document in documents:
        request = GenerationRequest(project=projects[document['projectIndex']], type=document['type'], language=language)
        expected = ProviderResult(**{key: document[key] for key in ('content', 'risks', 'warnings')})
        # Snapshots retain their draft date; comparing against today's clock fails
        # on the next day even when every template and source fact is unchanged.
        draft_date = date.fromisoformat(expected.content.splitlines()[2].rsplit(' · ', 1)[1])
        with patch('app.providers.demo.date', wraps=date) as clock:
            clock.today.return_value = draft_date
            assert asyncio.run(DemoAIProvider().generate(request)) == expected
        assert validate_risk_evidence(expected, request) == expected
        if document['projectIndex'] in (0, 2, 4, 5):
            assert expected.risks, 'Featured examples need reviewable initial risk evidence.'
