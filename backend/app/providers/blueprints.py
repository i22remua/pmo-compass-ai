"""Document-specific guidance shared by the local templates and model prompts."""

TITLES = {
    'en': {
        'executive_brief': 'Executive Project Brief', 'weekly_status': 'Weekly Status Report',
        'risk_register': 'Risk Register', 'meeting_minutes': 'Meeting Minutes',
        'action_items': 'Action Items', 'stakeholder_email': 'Stakeholder Email',
        'scope_change': 'Scope Change Impact Analysis', 'lessons_learned': 'Lessons Learned Report',
    },
    'es': {
        'executive_brief': 'Resumen ejecutivo del proyecto', 'weekly_status': 'Informe semanal de estado',
        'risk_register': 'Registro de riesgos', 'meeting_minutes': 'Acta de reunión',
        'action_items': 'Plan de acciones', 'stakeholder_email': 'Email a stakeholders',
        'scope_change': 'Análisis de impacto del cambio de alcance', 'lessons_learned': 'Informe de lecciones aprendidas',
    },
}

DOCUMENT_GUIDANCE = {
    'executive_brief': 'Write for the sponsor: executive summary, project facts, measurable objectives, current position, dependencies, decisions requested and proposed next actions. Distinguish the baseline from proposed changes.',
    'weekly_status': 'Write a weekly status report: reported status, executive summary, completed work, blockers and risks, decisions needed, next steps and stakeholder communications. Do not invent a reporting period or week-on-week variance. Future work is not completed progress.',
    'risk_register': 'Write an evidence-based risk register. Include the assessment basis and a separate entry for each supported signal: evidence, potential cause, impact, probability, severity, mitigation, early warning, suggested owner and next review. Do not fabricate risks when evidence is missing.',
    'meeting_minutes': 'Write minutes: meeting date and confirmed attendance only if supplied, topics discussed, recorded decisions, unresolved decisions and an action table. Stakeholders are not automatically attendees. Clearly separate approved decisions from requests for approval.',
    'action_items': 'Write an actionable follow-up register. Use IDs, action/source, owner, due date, dependency and observable closure evidence. Retain explicit owners and deadlines exactly; label inferred assignments. Include a follow-up and escalation protocol.',
    'stakeholder_email': 'Draft a concise stakeholder email with a subject, recipients to validate, professional greeting, project status, supported progress, attention points, precise requests and closing. Never claim the email was sent. Do not use tables if a short list reads better.',
    'scope_change': 'Write a change impact analysis: known baseline, requested change and rationale, affected deliverables, schedule/cost/resource/quality implications, approve/defer/reject options and the approval path. Quantify only supplied estimates; a baseline budget is not a change estimate.',
    'lessons_learned': 'Write a retrospective: context, reported outcomes, observations, cause hypotheses, candidate lessons, practices to retain and specific actions for the next project. Distinguish observation from hypothesis and avoid inventing successes or root causes.',
}

REVIEW_CHECKS = {
    'executive_brief': {
        'es': ['Confirmar el objetivo y los criterios de aceptación con el sponsor.', 'Vincular las decisiones solicitadas a su impacto en los objetivos.', 'Validar línea base, responsables y dependencias antes del comité.'],
        'en': ['Confirm the objective and acceptance criteria with the sponsor.', 'Connect each requested decision to its impact on objectives.', 'Validate the baseline, owners and dependencies before the steering review.'],
    },
    'weekly_status': {
        'es': ['Confirmar las fechas del periodo de reporte.', 'Separar avances completados de trabajo previsto y aportar evidencia.', 'Acordar el siguiente hito y las decisiones necesarias para alcanzarlo.'],
        'en': ['Confirm the dates of the reporting period.', 'Separate completed progress from planned work and attach evidence.', 'Agree the next milestone and the decisions needed to reach it.'],
    },
    'risk_register': {
        'es': ['Revisar cada señal con el responsable del trabajo afectado.', 'Acordar probabilidad, impacto y umbral de escalado con evidencia.', 'Registrar responsable, fecha de revisión y criterio de cierre de cada riesgo.'],
        'en': ['Review each signal with the owner of the affected work.', 'Agree probability, impact and escalation thresholds using evidence.', 'Record an owner, review date and closure criterion for each risk.'],
    },
    'meeting_minutes': {
        'es': ['Confirmar fecha, asistentes y propósito de la reunión.', 'Validar qué decisiones se aprobaron y cuáles siguen pendientes.', 'Confirmar responsables y fechas antes de circular el acta.'],
        'en': ['Confirm the meeting date, attendees and purpose.', 'Validate which decisions were approved and which remain open.', 'Confirm action owners and deadlines before circulating the minutes.'],
    },
    'action_items': {
        'es': ['Confirmar que cada acción describe un resultado verificable.', 'Acordar asignaciones, fechas y dependencias con sus responsables.', 'Definir evidencia de cierre y punto de control del seguimiento.'],
        'en': ['Confirm that each action describes a verifiable outcome.', 'Agree assignments, dates and dependencies with the owners.', 'Define closure evidence and the next follow-up checkpoint.'],
    },
    'stakeholder_email': {
        'es': ['Validar destinatarios y nivel de detalle para esta comunicación.', 'Identificar las decisiones o confirmaciones solicitadas.', 'Revisar hechos y fechas antes de enviar por el canal acordado.'],
        'en': ['Validate recipients and the level of detail for this communication.', 'Identify the decisions or confirmations being requested.', 'Review facts and dates before sending through the agreed channel.'],
    },
    'scope_change': {
        'es': ['Registrar la solicitud concreta, su motivo y quién la solicita.', 'Comparar el cambio con los entregables y criterios aprobados.', 'Obtener una estimación y decisión formal antes de modificar la línea base.'],
        'en': ['Record the specific request, its rationale and the requester.', 'Compare the change with approved deliverables and acceptance criteria.', 'Obtain an estimate and a formal decision before changing the baseline.'],
    },
    'lessons_learned': {
        'es': ['Recoger resultados y observaciones verificables de la retrospectiva.', 'Contrastar las hipótesis de causa con el equipo.', 'Asignar una mejora concreta y un criterio para evaluar su adopción.'],
        'en': ['Collect verifiable outcomes and observations from the retrospective.', 'Check cause hypotheses with the team.', 'Assign a concrete improvement and a criterion for evaluating its adoption.'],
    },
}
