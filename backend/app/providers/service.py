"""Ordered provider routing; every fallback is visible and preserves actual provenance."""
from datetime import datetime, timezone
from uuid import uuid4
import logging

from app.config import Settings
from app.models.generation import GenerationRequest, GenerationResponse
from app.providers.base import ProviderError
from app.providers.factory import create_provider
from app.providers.offline import OfflinePMOProvider
from app.services.inference import PMOInferenceService
from app.services.provenance import provenance_sections

logger = logging.getLogger(__name__)


async def generate_document(payload: GenerationRequest, settings: Settings, *, public_demo: bool = False, force_offline: bool = False) -> GenerationResponse:
    selected_offline = payload.useOfflineFallback or payload.useDemoFallback
    if public_demo or force_offline or selected_offline:
        order = ['offline']
    elif settings.ai_provider == 'auto':
        order = [name.strip() for name in settings.ai_provider_order.split(',')]
        if 'offline' not in order:
            order.append('offline')
    else:
        order = [settings.ai_provider]
        if settings.ai_provider not in ('offline', 'demo'):
            order.append('offline')
    failed = []
    for name in order:
        provider = create_provider(settings.model_copy(update={'ai_provider': name}))
        try:
            result = await provider.generate(payload)
            break
        except ProviderError as error:
            # Stable codes only; upstream error bodies may contain credentials or source data.
            failed.append((provider.name, error.code))
            logger.warning('External AI fallback provider=%s code=%s', provider.name, error.code)
    else:
        provider = OfflinePMOProvider()
        result = await provider.generate(payload)
    analysis = PMOInferenceService().analyze(payload)
    fallback_from = failed[0][0] if failed else (settings.ai_provider if not public_demo and (selected_offline or force_offline) and settings.ai_provider not in ('offline', 'demo') else None)
    if provider.name == 'offline' and fallback_from:
        result.warnings.append('La IA externa no está disponible temporalmente. PMO Compass AI ha generado este documento con el Offline PMO Engine.' if payload.language == 'es' else 'External AI is temporarily unavailable. PMO Compass AI generated this document using the Offline PMO Engine.')
    if failed and provider.name != 'offline':
        result.warnings.append(('Se ha utilizado un proveedor alternativo: ' if payload.language == 'es' else 'An alternative provider was used: ') + provider.name + '.')
    if force_offline:
        result.warnings.append('Límite gratuito alcanzado; continúa con el motor offline.' if payload.language == 'es' else 'Free usage limit reached; continuing with the offline engine.')
    if provider.name != 'offline' and not payload.question:
        result = result.model_copy(update={'content': result.content + provenance_sections(analysis, payload.language)})
    result.warnings = result.warnings[:19] + [('El contenido generado debe ser revisado por un project manager antes de utilizarse.' if payload.language == 'es' else 'Generated content should be reviewed by a project manager before use.')]
    return GenerationResponse(
        **result.model_dump(), id=str(uuid4()), type=payload.type, language=payload.language,
        provider=provider.name, fallbackFrom=fallback_from, intelligence=analysis,
        generatedAt=datetime.now(timezone.utc),
    )
