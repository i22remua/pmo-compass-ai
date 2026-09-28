"""Immutable excerpt snapshots. References locate evidence; they do not prove model reasoning."""
import re
from app.models.generation import GenerationRequest, Risk
from app.providers.risk_catalog import clean


def literal(value: str) -> str:
    return re.sub(r'([\\`*_{}\[\]()#+.!<>|~-])', r'\\\1', value).replace('\n', ' ')


def attach_sources(content: str, request: GenerationRequest, risks: list[Risk] | None = None) -> str:
    es = request.language == 'es'
    for risk in risks or []:
        if risk.source != 'provided':
            continue
        for index, source in enumerate(request.sourceExcerpts, 1):
            if ' '.join(risk.evidence.split()) in ' '.join(source.text.split()):
                # The provided signal is grounded in this excerpt; its impact is still a proposal.
                quote = clean(risk.evidence)
                content = content.replace(quote, quote + f' [S{index}]')
                break
    # Link only references into the supplied snapshot, never into a mutable project source.
    def reference(match):
        index = int(match.group(1))
        return f'[S{index}](#context-source-{index})' if 1 <= index <= len(request.sourceExcerpts) else match.group(0)
    content = re.sub(r'\\?\[S(\d+)\\?\](?!\()', reference, content)
    result = content + ('\n\n## Fuentes del contexto\n\n' if es else '\n\n## Context sources\n\n')
    result += ('Las referencias permiten revisar el fragmento, no garantizan la interpretación de la IA. Las propuestas requieren validación.\n' if es else 'References locate the excerpt; they do not guarantee the AI interpretation. Proposals require validation.\n')
    for index, source in enumerate(request.sourceExcerpts, 1):
        reviewed = (' · texto revisado' if es else ' · reviewed text') if source.reviewed else ''
        result += f'\n### [S{index}] {literal(source.label)} · {literal(source.locator)}{reviewed}\n\n> {literal(source.text)}\n'
    return result
