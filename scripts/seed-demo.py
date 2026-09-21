"""Rebuild local fixtures only: no Firebase, credentials, network or user storage."""
import asyncio
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'backend'))
from app.models.generation import GenerationRequest
from app.providers.offline import OfflinePMOProvider


async def main():
    examples = json.loads((root / 'frontend/src/lib/demo-projects.json').read_text())
    outputs = {}
    for language in ('es', 'en'):
        outputs[language] = []
        for index, kind in [(0, 'weekly_status'), (1, 'risk_register'), (2, 'executive_brief'), (3, 'lessons_learned'), (4, 'meeting_minutes'), (5, 'weekly_status')]:
            result = await OfflinePMOProvider().generate(GenerationRequest(project=examples[language][index], type=kind, language=language))
            outputs[language].append({'projectIndex': index, 'type': kind, **result.model_dump()})
    (root / 'frontend/src/lib/demo-documents.json').write_text(json.dumps(outputs, ensure_ascii=False, indent=2) + '\n')
    print('Rebuilt 12 bilingual starter documents in frontend/src/lib/demo-documents.json. No user data changed.')


asyncio.run(main())
