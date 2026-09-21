"""Trusted provenance appendix shared by local drafts and external model results."""
from app.models.generation import ProjectIntelligence
from app.providers.risk_catalog import clean


def provenance_sections(analysis: ProjectIntelligence, language: str) -> str:
    es = language == 'es'
    groups = [
        ('Información aportada', 'Provided information', analysis.providedInformation),
        ('Supuestos inferidos — revisar', 'AI-inferred assumptions — review', analysis.assumptions),
        ('Información faltante', 'Missing information', analysis.missingInformation),
        ('Próximos pasos recomendados', 'Recommended next steps', [a.action for a in analysis.recommendedActions]),
    ]
    result = ''.join(f'\n## {spanish if es else english}\n\n' + '\n'.join(f'- {clean(item)}' for item in items) + '\n' for spanish, english, items in groups)
    if analysis.previousDocumentCount:
        result += '\n> ' + ('Los documentos anteriores se usan como borradores de referencia, no como hechos confirmados.' if es else 'Previous documents are reference drafts, not confirmed facts.') + '\n'
    result += '\n> ' + ('El contenido generado debe ser revisado por un project manager antes de utilizarse.' if es else 'Generated content should be reviewed by a project manager before use.') + '\n'
    return result
