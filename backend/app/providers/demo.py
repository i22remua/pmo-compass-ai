"""Deterministic PMO drafts: evidence extraction + explicitly proposed assessments."""
import re
from datetime import date

from app.models.generation import GenerationRequest, ProviderResult, Risk
from app.providers.base import AIProvider


from app.providers.blueprints import TITLES, REVIEW_CHECKS
from app.providers.analysis import action_owner, action_deadline, affirmed, recorded_decision, reported_progress

# Each matched category has a specific response; ratings are proposals, not measured facts.
RISK_RULES = [
    (r'\b(delay\w*|late|blocked|bottleneck\w*|retras\w*|bloque\w*|dependenc\w*|dependencia\w*)\b',
     ('Schedule slippage', 'An unresolved dependency may affect the delivery sequence.', 'Milestones may move; confirm the critical path before changing the baseline.', 'Review dependencies, assign a recovery action and agree a checkpoint with the delivery lead.', 'A committed dependency is not ready at its agreed checkpoint.', 'Delivery lead'),
     ('Desviación del calendario', 'Una dependencia pendiente puede afectar a la secuencia de entrega.', 'Los hitos podrían desplazarse; revisar la ruta crítica antes de cambiar la línea base.', 'Revisar dependencias, asignar una acción de recuperación y acordar un punto de control con el responsable de entrega.', 'Una dependencia comprometida no está lista en el punto de control acordado.', 'Responsable de entrega')),
    (r'\b(overrun\w*|overspend\w*|cost increase|over budget|sobrecost\w*|sobrecoste\w*|presupuesto insuficiente|coste adicional|budget gap)\b',
     ('Budget pressure', 'The source reports a cost or funding constraint.', 'Available funding may not cover the current baseline; the amount is not verified.', 'Reconcile committed costs and remaining work; present funding or scope options to the sponsor.', 'The estimate to complete exceeds the approved remaining budget.', 'Project sponsor'),
     ('Presión presupuestaria', 'La fuente señala una restricción de coste o financiación.', 'Los fondos disponibles podrían no cubrir la línea base; el importe no está verificado.', 'Conciliar costes comprometidos y trabajo pendiente; presentar opciones de financiación o alcance al sponsor.', 'La estimación para completar supera el presupuesto restante aprobado.', 'Sponsor del proyecto')),
    (r'\b(scope change|scope creep|additional requirements?|new requirement\w*|cambio de alcance|ampliar el alcance|nuevos? requisit\w*|fuera de alcance)\b',
     ('Uncontrolled scope expansion', 'A change to requirements is described in the source.', 'Additional work could affect effort, budget and acceptance criteria.', 'Record the change request, estimate options, and obtain sponsor approval before updating the baseline.', 'Work starts on a change without an approved impact assessment.', 'Project manager'),
     ('Ampliación de alcance sin control', 'La fuente describe un cambio en los requisitos.', 'El trabajo adicional podría afectar al esfuerzo, presupuesto y criterios de aceptación.', 'Registrar la solicitud, estimar opciones y obtener aprobación del sponsor antes de actualizar la línea base.', 'Se inicia trabajo sobre un cambio sin análisis de impacto aprobado.', 'Project manager')),
    (r'\b(understaff\w*|capacity short\w*|resource short\w*|unavailable|overload\w*|sobrecarga\w*|falta de personal|falta de recursos|baja del equipo)\b',
     ('Insufficient delivery capacity', 'The notes indicate reduced capacity or availability.', 'Parallel tasks or specialist work may be delayed.', 'Compare demand with actual capacity; prioritise critical work and confirm cover with the team lead.', 'Critical work has no available qualified owner.', 'Team lead'),
     ('Capacidad de entrega insuficiente', 'Las notas indican menor capacidad o disponibilidad.', 'Las tareas paralelas o especializadas podrían retrasarse.', 'Comparar demanda con capacidad real; priorizar trabajo crítico y confirmar cobertura con el responsable del equipo.', 'Una tarea crítica no tiene un responsable cualificado disponible.', 'Responsable del equipo')),
    (r'\b(defect\w*|failed test\w*|quality issue\w*|bug\w*|defecto\w*|fallo\w*|pruebas fallidas|error de integración)\b',
     ('Quality or acceptance risk', 'The source reports a defect or failed validation.', 'Rework may be required before the deliverable can be accepted.', 'Triage the issue, define acceptance criteria and run a documented regression check before release.', 'A critical acceptance criterion remains unverified at the release gate.', 'Quality lead'),
     ('Riesgo de calidad o aceptación', 'La fuente informa de un defecto o validación fallida.', 'Podría ser necesario retrabajo antes de aceptar el entregable.', 'Clasificar el problema, definir criterios de aceptación y documentar una regresión antes de la entrega.', 'Un criterio de aceptación crítico sigue sin verificarse en el control de entrega.', 'Responsable de calidad')),
    (r'\b(pending approval|approval pending|sign.off pending|sin aprobación|aprobación pendiente|pendiente de aprobación|unconfirmed stakeholder)\b',
     ('Decision bottleneck', 'A required approval is pending in the source.', 'Dependent work may wait or proceed without an agreed decision.', 'Document decision options, identify the approver and agree a decision deadline.', 'The decision deadline passes without a recorded approval.', 'Project sponsor'),
     ('Bloqueo de decisiones', 'La fuente indica una aprobación pendiente.', 'El trabajo dependiente podría esperar o avanzar sin una decisión acordada.', 'Documentar opciones, identificar al aprobador y acordar una fecha de decisión.', 'Vence la fecha de decisión sin una aprobación registrada.', 'Sponsor del proyecto')),
]


def clean(value: str) -> str:
    """Keep source text literal in Markdown, including table cells."""
    return re.sub(r'([\\`*_{}\[\]<>#|])', r'\\\1', value.replace('\n', ' ')).strip()


def sentences(text: str) -> list[str]:
    return list(dict.fromkeys(s.strip(' \t\r-•') for s in re.split(r'\n+|(?<=[.!?])\s+', text) if s.strip(' \t\r-•')))


class DemoAIProvider(AIProvider):
    name = 'demo'

    async def generate(self, request: GenerationRequest) -> ProviderResult:
        es = request.language == 'es'
        def s(spanish: str, english: str) -> str:
            return spanish if es else english

        p = request.project
        # The user's current brief must not disappear behind a long history of project notes.
        raw_source = sentences('\n'.join([request.inputContext, p.notes]))
        # Repeated sections must stay within the output limit even for maximum-sized inputs.
        source = [line[:1500] for line in raw_source]
        missing = s('Pendiente de confirmar.', 'To be confirmed.')
        statuses = {
            'planning': s('Planificación', 'Planning'), 'active': s('Activo', 'Active'),
            'at_risk': s('En riesgo', 'At risk'), 'completed': s('Completado', 'Completed'),
        }
        risks = []
        for pattern, en_values, es_values in RISK_RULES:
            evidence = next((line for line in source if affirmed(pattern, line)), None)
            if not evidence:
                continue
            name, cause, impact, mitigation, signal, owner = es_values if es else en_values
            risks.append(Risk(
                risk=name, evidence=evidence[:600], cause=cause, impact=impact,
                probability=s('Media — propuesta, validar', 'Medium — proposed, validate'),
                severity=s('Alta — propuesta, validar', 'High — proposed, validate'),
                mitigation=mitigation, signal=signal, suggestedOwner=owner,
            ))

        def bullets(items: list[str], fallback: str = missing) -> str:
            return '\n'.join(f'- {clean(item)}' for item in items) if items else f'- {fallback}'

        def table(headers: list[str], rows: list[list[str]]) -> str:
            return '\n'.join(['| ' + ' | '.join(headers) + ' |', '| ' + ' | '.join(['---'] * len(headers)) + ' |'] + ['| ' + ' | '.join(clean(str(cell)) for cell in row) + ' |' for row in rows])

        def section(title: str, content: str) -> str:
            return f'\n## {title}\n\n{content}\n'

        summary = s(
            f'**{clean(p.name)}** pertenece al sector **{clean(p.sector)}** y figura en estado **{statuses[p.status]}** en la ficha del proyecto.',
            f'**{clean(p.name)}** is in the **{clean(p.sector)}** sector and is recorded as **{statuses[p.status]}** in the project record.',
        )
        if p.description:
            summary += '\n\n' + clean(p.description)
        if p.endDate:
            summary += '\n\n' + s('Fecha objetivo declarada: ', 'Reported target date: ') + str(p.endDate) + '.'
        if p.objectives:
            summary += '\n\n' + s('Resultado buscado: ', 'Intended outcome: ') + clean(p.objectives[:1200])
        objectives = bullets(sentences(p.objectives))
        progress = [x for x in source if reported_progress(x)]
        decisions = [x for x in source if re.search(r'\b(decid\w*|decision\w*|decisi\w*|aproba\w*|approv\w*|confirm\w*|request\w*|solicit\w*|acord\w*|agreed)\b', x, re.I)]
        recorded_decisions = [x for x in decisions if recorded_decision(x)]
        pending_decisions = [x for x in decisions if x not in recorded_decisions]
        action_sources = [x for x in source if re.search(r'\b(must|should|will|need\w*|action\w*|todo|follow.up|debe\w*|pendiente\w*|acción\w*|acciones|revisar|confirmar|preparar|validar|enviar|acordar)\b', x, re.I)][:8]
        actions = action_sources or [r.mitigation for r in risks] or [f'{p.name}: {item}' for item in REVIEW_CHECKS[request.type][request.language][:2]]
        def assignment(action: str) -> str:
            owner = action_owner(action)
            if owner:
                return owner + s(' — mencionado en la fuente; confirmar', ' — named in the source; confirm')
            return s('Project manager — validar asignación', 'Project manager — confirm assignment')

        def deadline(action: str) -> str:
            value = action_deadline(action)
            return value + s(' — referencia textual; validar', ' — source reference; validate') if value else missing

        action_table = table(
            [s('ID', 'ID'), s('Acción / fuente', 'Action / source'), s('Responsable propuesto', 'Suggested owner'), s('Fecha', 'Due date'), s('Criterio de cierre', 'Closure criterion')],
            [[f'A-{i + 1:02}', action, assignment(action), deadline(action), s('Resultado de la acción documentado y aceptado por el responsable.', 'Action outcome documented and accepted by the owner.')] for i, action in enumerate(actions)],
        )
        risk_summary = bullets([f'{r.risk}: {r.evidence} — {r.mitigation}' for r in risks], s('No se han identificado señales con las reglas locales; esto no demuestra ausencia de riesgos.', 'No signals were identified by local rules; this does not establish the absence of risks.'))
        timeline = f'{p.startDate or missing} → {p.endDate or missing}'
        budget = f'{p.budget:,.2f} EUR' if p.budget is not None else missing
        if es and p.budget is not None:
            budget = budget.translate(str.maketrans(',.', '.,'))
        facts = table([s('Campo', 'Field'), s('Información aportada', 'Provided information')], [
            [s('Sector', 'Sector'), p.sector], [s('Estado declarado', 'Reported status'), statuses[p.status]],
            [s('Fechas previstas', 'Planned dates'), timeline], [s('Presupuesto base', 'Baseline budget'), budget],
            ['Stakeholders', p.stakeholders or missing],
        ])
        notice = s(
            'Borrador demo elaborado con reglas y plantillas locales. Las citas conservan el idioma original. Las valoraciones y responsables propuestos requieren validación; no se han verificado externamente los datos.',
            'Demo draft produced with local rules and templates. Quotes retain their original language. Proposed assessments and owners require validation; data has not been externally verified.',
        )
        content = f'# {TITLES[request.language][request.type]}\n\n**{clean(p.name)}** · {date.today().isoformat()}\n\n> {notice}\n'
        if request.inputContext:
            content += section(s('Contexto adicional aportado', 'Additional context provided'), '> ' + clean(request.inputContext[:1500]))
        kind = request.type.value
        if kind == 'executive_brief':
            content += section(s('Resumen ejecutivo', 'Executive summary'), summary)
            content += section(s('Ficha del proyecto', 'Project at a glance'), facts)
            content += section(s('Objetivos y resultados esperados', 'Objectives and intended outcomes'), objectives)
            content += section(s('Situación y dependencias', 'Current position and dependencies'), bullets(source[:6]))
            content += section(s('Riesgos que requieren atención', 'Risks requiring attention'), risk_summary)
            content += section(s('Decisiones para el sponsor', 'Sponsor decisions'), bullets(pending_decisions[:5]))
            content += section(s('Próximas acciones propuestas', 'Proposed next actions'), action_table)
        elif kind == 'weekly_status':
            content += section(s('Estado general', 'Overall status'), f'**{statuses[p.status]}** — ' + s('estado declarado en la ficha; validar el RAG con el equipo.', 'status reported in the project; validate the RAG assessment with the team.'))
            content += section(s('Resumen ejecutivo', 'Executive summary'), summary)
            content += section(s('Avances de la semana', 'Progress this week'), bullets(progress[:6], s('No se han aportado avances verificables. Confirmar periodo y resultados antes de distribuir.', 'No verifiable progress was provided. Confirm reporting period and outcomes before distributing.')))
            content += section(s('Riesgos clave', 'Key risks'), risk_summary)
            content += section(s('Decisiones necesarias', 'Decisions needed'), bullets(pending_decisions[:5]))
            content += section(s('Próximos pasos', 'Next steps'), action_table)
            content += section(s('Notas para stakeholders', 'Stakeholder notes'), s('Destinatarios previstos: ', 'Intended recipients: ') + clean(p.stakeholders or missing) + '\n\n' + s('Validar cambios frente a la línea base; no se dispone de histórico semanal para medir variaciones.', 'Validate changes against the baseline; no weekly history is available to measure variance.'))
        elif kind == 'risk_register':
            content += section(s('Contexto y objetivos del proyecto', 'Project context and objectives'), summary)
            content += section(s('Base de evaluación', 'Assessment basis'), s(f'{len(risks)} señales detectadas en notas y contexto. Probabilidad e impacto son propuestas cualitativas, no mediciones. Revisar en el siguiente control del proyecto.', f'{len(risks)} signals detected in notes and context. Probability and impact are proposed qualitative assessments, not measurements. Review at the next project checkpoint.'))
            if not risks:
                content += section(s('Registro', 'Register'), risk_summary)
            for i, r in enumerate(risks):
                content += section(f'R-{i + 1:02} · {r.risk}', table([s('Campo', 'Field'), s('Evaluación propuesta', 'Proposed assessment')], [
                    [s('Riesgo', 'Risk'), r.risk], [s('Evidencia textual', 'Source evidence'), r.evidence],
                    [s('Causa probable', 'Potential cause'), r.cause], [s('Impacto', 'Impact'), r.impact],
                    [s('Probabilidad', 'Probability'), r.probability], [s('Severidad', 'Severity'), r.severity],
                    [s('Plan de mitigación', 'Mitigation plan'), r.mitigation], [s('Señal de alerta temprana', 'Early warning signal'), r.signal],
                    [s('Responsable sugerido', 'Suggested owner'), r.suggestedOwner], [s('Próxima revisión', 'Next review'), missing],
                ]))
        elif kind == 'meeting_minutes':
            content += section(s('Datos de la reunión', 'Meeting details'), table([s('Campo', 'Field'), s('Detalle', 'Detail')], [[s('Fecha de la reunión', 'Meeting date'), missing], [s('Asistentes confirmados', 'Confirmed attendees'), missing], [s('Stakeholders de referencia (no asistencia)', 'Reference stakeholders (not attendance)'), p.stakeholders or missing]]))
            content += section(s('Temas tratados según las notas', 'Topics from the notes'), bullets(source[:10]))
            content += section(s('Decisiones recogidas en la fuente — validar', 'Decisions recorded in the source — validate'), bullets(recorded_decisions[:6]))
            content += section(s('Decisiones pendientes de confirmar', 'Decisions awaiting confirmation'), bullets(pending_decisions[:6]))
            content += section(s('Acciones y seguimiento propuestos', 'Proposed actions and follow-up'), action_table)
            content += section(s('Puntos abiertos', 'Open points'), risk_summary)
            content += section(s('Validación del acta', 'Minutes validation'), s('Confirmar asistentes, acuerdos, responsables y fechas con la persona que convocó la reunión antes de circular el acta.', 'Confirm attendees, agreements, owners and dates with the meeting organiser before circulating the minutes.'))
        elif kind == 'action_items':
            content += section(s('Objetivo del seguimiento', 'Follow-up objective'), summary + '\n\n' + objectives)
            content += section(s('Plan de acciones propuesto', 'Proposed action plan'), action_table)
            content += section(s('Dependencias y bloqueos', 'Dependencies and blockers'), risk_summary)
            content += section(s('Protocolo de seguimiento', 'Follow-up protocol'), s('Confirmar cada asignación con el responsable. Acordar fecha y prioridad; registrar evidencia al cerrar. Escalar bloqueos al PM en el siguiente control y mantener una única versión del registro.', 'Confirm each assignment with its owner. Agree dates and priorities; record evidence at closure. Escalate blockers to the PM at the next checkpoint and maintain a single version of the register.'))
        elif kind == 'stakeholder_email':
            content += '\n' + s('**Asunto:** ', '**Subject:** ') + clean(p.name) + s(' — estado y decisiones pendientes', ' — status and pending decisions') + '\n\n'
            content += s('**Para (validar):** ', '**To (confirm):** ') + clean(p.stakeholders or missing) + '\n\n' + s('Hola equipo,', 'Hello team,') + '\n\n'
            content += s(f'Comparto la actualización de **{clean(p.name)}**, actualmente en estado **{statuses[p.status]}** según la ficha del proyecto.', f'Here is the update for **{clean(p.name)}**, currently marked **{statuses[p.status]}** in the project record.') + '\n\n' + summary + '\n'
            content += section(s('Avances comunicados', 'Reported progress'), bullets(progress[:4]))
            content += section(s('Puntos de atención', 'Attention points'), risk_summary)
            content += section(s('Necesitamos vuestra confirmación', 'Your confirmation is needed'), bullets(pending_decisions[:4]))
            content += '\n' + s('Por favor, confirmad los responsables y fechas de las acciones pendientes para actualizar el plan.\n\nGracias,\nProject Management Office\n\n*Borrador para revisar. Este email no ha sido enviado.*', 'Please confirm the owners and dates of outstanding actions so we can update the plan.\n\nThank you,\nProject Management Office\n\n*Draft for review. This email has not been sent.*') + '\n'
        elif kind == 'scope_change':
            content += section(s('Línea base conocida', 'Known baseline'), facts + '\n\n' + objectives)
            changes = [x for x in source if re.search(r'\b(chang\w*|scope|requisit\w*|cambio\w*|alcance|añadir|ampli\w*)\b', x, re.I)]
            content += section(s('Solicitud de cambio — fuente', 'Change request — source'), bullets(changes, s('No se ha descrito una solicitud concreta. Registrar el cambio y su motivo antes de evaluar.', 'No specific change request was described. Record the change and rationale before assessment.')))
            content += section(s('Análisis de impacto preliminar', 'Preliminary impact assessment'), table([s('Dimensión', 'Dimension'), s('Evaluación necesaria', 'Required assessment')], [
                [s('Alcance', 'Scope'), s('Comparar requisitos solicitados con entregables y criterios de aceptación aprobados.', 'Compare requested requirements with approved deliverables and acceptance criteria.')],
                [s('Calendario', 'Schedule'), s('Estimar esfuerzo y dependencias; no hay base suficiente para cuantificar días.', 'Estimate effort and dependencies; there is insufficient evidence to quantify days.')],
                [s('Coste', 'Cost'), s('Solicitar estimación del trabajo adicional. No se puede inferir el coste con el presupuesto base.', 'Request an estimate for additional work. Cost cannot be inferred from the baseline budget.')],
                [s('Recursos y calidad', 'Resources and quality'), s('Verificar capacidad, pruebas y criterios de aceptación afectados.', 'Check capacity, testing and affected acceptance criteria.')],
            ]))
            content += section(s('Opciones para decisión', 'Decision options'), bullets([s('Aprobar tras estimar: actualizar línea base y financiación si procede.', 'Approve after estimation: update the baseline and funding if needed.'), s('Diferir: proteger el hito actual y evaluar en una fase posterior.', 'Defer: protect the current milestone and assess in a later phase.'), s('Rechazar: documentar el motivo y comunicar las implicaciones.', 'Reject: document the rationale and communicate implications.')]))
            content += section(s('Recomendación de gobernanza', 'Governance recommendation'), s('Solicitar estimación y decisión formal del sponsor antes de comprometer fechas o presupuesto. Estado de aprobación: pendiente de confirmar.', 'Request an estimate and a formal sponsor decision before committing dates or budget. Approval status: to be confirmed.'))
        else:
            content += section(s('Contexto y resultados reportados', 'Context and reported outcomes'), summary + '\n\n' + bullets(progress[:5]))
            content += section(s('Observaciones de la fuente', 'Source observations'), bullets(source[:8]))
            rows = [[r.evidence, r.cause, r.mitigation, r.suggestedOwner] for r in risks]
            if not rows:
                rows = [[s('No se han aportado incidencias concretas.', 'No specific incidents were provided.'), missing, s('Recoger feedback del equipo y contrastarlo con evidencias.', 'Collect team feedback and cross-check it against evidence.'), 'Project manager']]
            content += section(s('Lecciones candidatas — validar con el equipo', 'Candidate lessons — validate with the team'), table([s('Observación', 'Observation'), s('Hipótesis de causa', 'Cause hypothesis'), s('Recomendación', 'Recommendation'), s('Responsable propuesto', 'Suggested owner')], rows))
            content += section(s('Prácticas a mantener', 'Practices to retain'), s('Confirmar con el equipo qué prácticas explican los resultados reportados. No se atribuyen éxitos a causas no documentadas.', 'Confirm with the team which practices explain reported outcomes. Success is not attributed to undocumented causes.'))
            content += section(s('Aplicación al siguiente proyecto', 'Application to the next project'), action_table)
        if kind not in ('risk_register', 'meeting_minutes', 'lessons_learned'):
            content += section(s('Trazabilidad: extractos de entrada', 'Traceability: input excerpts'), bullets(source[:8]))
        gaps = []
        if not p.description: gaps.append(s('Propósito y entregables: completar la descripción del proyecto.', 'Purpose and deliverables: complete the project description.'))
        if not p.objectives: gaps.append(s('Éxito esperado: acordar objetivos medibles y criterios de aceptación.', 'Expected success: agree measurable objectives and acceptance criteria.'))
        if not p.endDate: gaps.append(s('Calendario: confirmar el hito objetivo antes de comprometer una fecha.', 'Schedule: confirm the target milestone before committing to a date.'))
        if not p.stakeholders: gaps.append(s('Gobernanza: identificar sponsor, responsables y destinatarios.', 'Governance: identify the sponsor, owners and recipients.'))
        if not source: gaps.append(s('Evidencia: añadir avances, incidencias y decisiones concretas de este proyecto.', 'Evidence: add concrete project updates, issues and decisions.'))
        if gaps:
            content += section(s('Información necesaria para completar el borrador', 'Information needed to complete the draft'), bullets(gaps))
        content += section(s('Revisión PMO antes de compartir', 'PMO review before sharing'), bullets(REVIEW_CHECKS[kind][request.language]))
        warnings = [notice]
        if not source:
            warnings.append(s('Añade notas o contexto para obtener un análisis específico del proyecto.', 'Add notes or context for a project-specific analysis.'))
        if len(source) > 10:
            warnings.append(s('La demo muestra una selección de extractos; revisa el contexto completo antes de distribuir.', 'The demo shows selected excerpts; review the full context before distributing.'))
        if any(len(line) > 1500 for line in raw_source):
            warnings.append(s('Los extractos largos se han limitado a 1.500 caracteres; consulta las notas completas para revisar todos los detalles.', 'Long excerpts were limited to 1,500 characters; consult the full notes to review all details.'))
        return ProviderResult(content=content, risks=risks, warnings=warnings)
