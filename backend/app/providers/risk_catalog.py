"""Bilingual source-signal rules and safe Markdown helpers."""
import re

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
