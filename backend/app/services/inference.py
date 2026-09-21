"""Explainable PMO hypotheses. Rules never turn a draft or an assumption into a fact."""
import re

from app.models.generation import GenerationRequest, ProjectIntelligence, RecommendedAction, Risk
from app.providers.analysis import affirmed, recorded_decision
from app.providers.risk_catalog import RISK_RULES, sentences


# Each hypothesis has its own intervention and observable warning; no invented dates or names.
# Tuple: name, potential cause, impact, mitigation, early warning, suggested role.
ERP_RISKS = [
    (('Change resistance', 'Processes and responsibilities may change.', 'Users may retain parallel manual processes.', 'Map impacted roles and validate a change plan with process representatives.', 'Teams keep using unapproved spreadsheets after a pilot.', 'Change lead'),
     ('Resistencia al cambio', 'Los procesos y responsabilidades podrían cambiar.', 'Los usuarios podrían mantener procesos manuales paralelos.', 'Mapear los roles afectados y validar un plan de cambio con representantes de procesos.', 'El equipo mantiene hojas de cálculo no aprobadas tras el piloto.', 'Responsable de gestión del cambio')),
    (('Incomplete data migration', 'Legacy data may contain gaps or inconsistent definitions.', 'Transactions or balances may be unreliable at cutover.', 'Profile source data, reconcile a trial migration and define rollback criteria.', 'Trial migration records fail reconciliation checks.', 'Data migration lead'),
     ('Migración de datos incompleta', 'Los datos históricos podrían tener lagunas o definiciones incoherentes.', 'Las transacciones o saldos podrían ser poco fiables en la transición.', 'Perfilar datos, conciliar una migración de prueba y definir criterios de reversión.', 'Los registros de prueba no superan la conciliación.', 'Responsable de migración de datos')),
    (('Integration with existing systems', 'Interface contracts and legacy constraints may be undocumented.', 'End-to-end business flows may fail despite isolated module tests.', 'Inventory interfaces and test representative end-to-end flows before cutover.', 'Interface errors appear in cross-system acceptance tests.', 'Integration lead'),
     ('Integración con sistemas existentes', 'Los contratos de interfaz y límites de sistemas históricos podrían estar sin documentar.', 'Los procesos completos podrían fallar aunque funcionen los módulos aislados.', 'Inventariar interfaces y probar flujos completos antes de la transición.', 'Aparecen errores de interfaz en pruebas entre sistemas.', 'Responsable de integración')),
    (('Training delays', 'Operational shifts may limit training availability.', 'Users may be unprepared for critical tasks at go-live.', 'Agree role-based training, shift coverage and practical readiness checks.', 'Critical roles miss practical training sessions.', 'Training lead'),
     ('Retrasos en formación', 'Los turnos operativos podrían limitar la disponibilidad para formación.', 'Los usuarios podrían no estar preparados para tareas críticas en el arranque.', 'Acordar formación por rol, cobertura de turnos y comprobaciones prácticas.', 'Los roles críticos no completan sesiones prácticas.', 'Responsable de formación')),
    (('Vendor dependency', 'Specialist configuration may rely on limited supplier availability.', 'Configuration or incident resolution could block downstream work.', 'Confirm supplier deliverables, escalation contacts and knowledge transfer.', 'Configuration questions wait beyond the agreed response window.', 'Vendor manager'),
     ('Dependencia del proveedor', 'La configuración especializada podría depender de disponibilidad limitada del proveedor.', 'La configuración o resolución de incidencias podría bloquear trabajo posterior.', 'Confirmar entregables del proveedor, contactos de escalado y transferencia de conocimiento.', 'Las consultas de configuración superan la ventana de respuesta acordada.', 'Responsable del proveedor')),
    (('Scope creep', 'Discovery may uncover customisation beyond the initial baseline.', 'Additional modules or workflows may stretch the delivery window.', 'Define an initial release boundary and assess changes before authorising work.', 'Unassessed customisations enter the delivery backlog.', 'Project manager'),
     ('Desviación de alcance', 'El análisis podría revelar personalizaciones fuera de la línea base inicial.', 'Módulos o flujos adicionales podrían ampliar el plazo de entrega.', 'Definir el alcance inicial y evaluar cambios antes de autorizar trabajo.', 'Entran personalizaciones sin evaluar en la lista de trabajo.', 'Project manager')),
    (('Low user adoption', 'Benefits and acceptance measures may not reflect users’ daily work.', 'The new platform may be available without delivering its intended benefits.', 'Pilot representative tasks and agree adoption evidence with process owners.', 'Pilot users cannot complete core workflows without assistance.', 'Business process owner'),
     ('Baja adopción de usuarios', 'Los beneficios y criterios de aceptación podrían no reflejar el trabajo diario.', 'La plataforma podría estar disponible sin aportar los beneficios previstos.', 'Pilotar tareas representativas y acordar evidencias de adopción con responsables de procesos.', 'Los usuarios del piloto no completan flujos esenciales sin ayuda.', 'Responsable de procesos de negocio')),
]

SECTOR_RISKS = [
    (r'\b(health\w*|salud|sanitari\w*|clinic\w*|clínic\w*|patient\w*|paciente\w*)\b',
     ('Patient workflow disruption', 'Clinical workflows may differ between service teams.', 'Care coordination could be interrupted during transition.', 'Validate representative clinical workflows with service leads and agree continuity steps.', 'Clinical users reject a critical acceptance scenario.', 'Clinical service lead'),
     ('Interrupción de procesos asistenciales', 'Los procesos clínicos podrían variar entre equipos.', 'La coordinación asistencial podría verse afectada en la transición.', 'Validar flujos clínicos representativos y acordar medidas de continuidad.', 'Los usuarios clínicos rechazan un escenario crítico de aceptación.', 'Responsable asistencial')),
    (r'\b(construction|construcci\w*|campus|building|obra\w*)\b',
     ('Site and procurement readiness', 'Site access and material lead times may constrain work sequencing.', 'Installation could wait for access or approved materials.', 'Confirm site access windows and supplier lead times before sequencing installation.', 'Required permits or material approvals remain open at mobilisation.', 'Site delivery lead'),
     ('Disponibilidad de obra y suministros', 'Los accesos y plazos de suministro podrían condicionar la secuencia.', 'La instalación podría esperar a permisos o materiales aprobados.', 'Confirmar ventanas de acceso y plazos de proveedores antes de secuenciar la instalación.', 'Quedan permisos o aprobaciones de materiales pendientes al movilizar.', 'Responsable de obra')),
    (r'\b(logistic\w*|logístic\w*|distribution|distribuci\w*|transport\w*)\b',
     ('Carrier and demand mismatch', 'Planned volumes may exceed confirmed transport capacity.', 'Deliveries could miss service commitments.', 'Reconcile forecast volumes with carrier capacity and trial exception handling.', 'Unallocated shipments accumulate before dispatch cut-off.', 'Logistics lead'),
     ('Desajuste de transporte y demanda', 'Los volúmenes previstos podrían superar la capacidad confirmada.', 'Las entregas podrían incumplir compromisos de servicio.', 'Conciliar previsión y capacidad del transportista y probar la gestión de excepciones.', 'Se acumulan envíos sin asignar antes del cierre de expedición.', 'Responsable de logística')),
    (r'\b(event\w*|evento\w*|forum|foro|conference|congreso)\b',
     ('Event readiness dependency', 'Venue, speakers and technical operations may have linked deadlines.', 'One missing confirmation could affect the attendee experience.', 'Review venue, speaker and technical readiness in a single run-of-show rehearsal.', 'A critical session has no confirmed speaker or technical owner.', 'Event operations lead'),
     ('Dependencias de preparación del evento', 'Sede, ponentes y operación técnica podrían tener plazos vinculados.', 'Una confirmación pendiente podría afectar a la experiencia del asistente.', 'Revisar sede, ponentes y operación técnica en un ensayo conjunto.', 'Una sesión crítica no tiene ponente o responsable técnico confirmado.', 'Responsable de operaciones del evento')),
    (r'\b(financ\w*|bank\w*|banc\w*|reporting)\b',
     ('Inconsistent reporting definitions', 'Source teams may interpret key metrics differently.', 'Management could receive non-comparable figures.', 'Agree metric definitions, data lineage and reconciliation evidence with finance.', 'Different sources produce unexplained differences for the same metric.', 'Finance process owner'),
     ('Definiciones de reporting incoherentes', 'Los equipos podrían interpretar las métricas de forma distinta.', 'La dirección podría recibir cifras no comparables.', 'Acordar definiciones, trazabilidad y conciliación de métricas con finanzas.', 'Distintas fuentes arrojan diferencias sin explicar para una misma métrica.', 'Responsable de procesos financieros')),
]


class PMOInferenceService:
    def analyze(self, request: GenerationRequest) -> ProjectIntelligence:
        es = request.language == 'es'
        def s(spanish, english):
            return spanish if es else english
        p = request.project
        # Previous generated documents are context only, never part of the evidence corpus.
        source = sentences('\n'.join([p.description, p.objectives, p.notes, request.inputContext]))
        risks = []
        for pattern, en_values, es_values in RISK_RULES:
            evidence = next((line for line in source if affirmed(pattern, line)), None)
            if evidence:
                risks.append(self._risk(es_values if es else en_values, evidence[:600], 'provided', es))
        # Drafts can suggest hypotheses, but are excluded from provided facts and risk evidence.
        context = ' '.join([p.name, p.sector, p.description, p.objectives, p.notes, request.inputContext] + [doc.content for doc in request.previousDocuments])
        hypotheses = []
        if re.search(r'\b(erp|crm|enterprise resource planning)\b', context, re.I):
            hypotheses.extend(values[1 if es else 0] for values in ERP_RISKS)
        for pattern, en_values, es_values in SECTOR_RISKS:
            if re.search(pattern, context, re.I):
                hypotheses.append(es_values if es else en_values)
        if not hypotheses:
            hypotheses.append((
                s('Criterios de aceptación incompletos', 'Incomplete acceptance criteria'),
                s('El propósito podría interpretarse de forma diferente entre participantes.', 'Participants may interpret the project purpose differently.'),
                s('Podría ser necesario retrabajo antes de aceptar los entregables.', 'Rework may be needed before deliverables are accepted.'),
                s(f'Acordar entregables y criterios observables de aceptación para {p.name}.', f'Agree deliverables and observable acceptance criteria for {p.name}.'),
                s('Se inicia trabajo sin criterios de aceptación compartidos.', 'Work begins without shared acceptance criteria.'),
                s('Responsable de negocio', 'Business owner'),
            ))
        evidence = s('Hipótesis por contexto; no se ha comunicado como incidencia.', 'Context-based hypothesis; not reported as an incident.')
        risks.extend(self._risk(values, evidence, 'inferred', es) for values in hypotheses)
        fields = [
            (p.description, s('Descripción y entregables', 'Description and deliverables')),
            (p.objectives, s('Objetivos medibles y aceptación', 'Measurable objectives and acceptance')),
            (p.startDate, s('Fecha de inicio confirmada', 'Confirmed start date')),
            (p.endDate, s('Fecha de cierre confirmada', 'Confirmed end date')),
            (p.budget is not None, s('Presupuesto aprobado', 'Approved budget')),
            (p.stakeholders, s('Sponsor y responsables confirmados', 'Confirmed sponsor and owners')),
            (p.notes, s('Avances y decisiones comunicados', 'Reported progress and decisions')),
        ]
        missing = [label for value, label in fields if not value]
        provided = [f'{s("Proyecto", "Project")}: {p.name}', f'{s("Sector declarado", "Reported sector")}: {p.sector}']
        for value, label in [(p.description, s('Descripción', 'Description')), (p.objectives, s('Objetivo', 'Objective')), (p.stakeholders, 'Stakeholders'), (p.notes, s('Notas', 'Notes')), (request.inputContext, s('Contexto adicional', 'Additional context'))]:
            if value:
                provided.append(f'{label}: {value[:1500]}')
        for value, label in [(p.startDate, s('Inicio', 'Start')), (p.endDate, s('Fin', 'End')), (p.budget, s('Presupuesto declarado EUR', 'Reported budget EUR'))]:
            if value is not None:
                provided.append(f'{label}: {value}')
        assumptions = [s(f'En {p.name}, revisar la posibilidad de: {r.risk.lower()}.', f'For {p.name}, review the possibility of: {r.risk.lower()}.') for r in risks if r.source == 'inferred']
        dependency = s('Validar alcance, disponibilidad del equipo y restricciones antes de comprometer el plan.', 'Validate scope, team availability and constraints before committing to the plan.')
        actions = [RecommendedAction(
            action=r.mitigation, ownerRole=r.suggestedOwner, priority=r.priority,
            dependency=dependency, successCriteria=s('Evidencia de la mitigación revisada y aceptada por el rol responsable.', 'Mitigation evidence reviewed and accepted by the responsible role.'),
        ) for r in risks[:8]]
        pending = [line[:1500] for line in source if re.search(r'\b(pending|pendiente|solicit\w*|request\w*|decision|decisi\w*)\b', line, re.I) and not recorded_decision(line)][:5]
        pending += [s('Propuesta: confirmar alcance y criterios de aceptación antes de aprobar la línea base.', 'Proposed: confirm scope and acceptance criteria before approving the baseline.')]
        attention = p.status == 'at_risk' or any(r.source == 'provided' for r in risks)
        return ProjectIntelligence(
            confidence='low' if len(missing) >= 3 else 'moderate',
            confidenceReason=s('Valoración cualitativa de la información disponible; no mide probabilidad ni precisión del modelo.', 'Qualitative assessment of available information; not model accuracy or a probability.'),
            health='attention' if attention else ('unknown' if len(missing) >= 3 else 'review'),
            healthReason=s('Señales declaradas o estado en riesgo requieren revisión del PM.', 'Reported signals or an at-risk status require PM review.') if attention else s('No hay evidencia suficiente para confirmar que el proyecto está bajo control.', 'There is insufficient evidence to confirm that the project is on track.'),
            providedInformation=provided, risks=risks, assumptions=assumptions,
            missingInformation=missing or [s('Validar vigencia y coherencia de las fuentes.', 'Validate the currency and consistency of the sources.')],
            recommendedActions=actions, stakeholders=[s('Roles propuestos para validar: ', 'Proposed roles to confirm: ') + ', '.join(dict.fromkeys(r.suggestedOwner for r in risks))] + ([s('Aportados: ', 'Provided: ') + p.stakeholders[:1500]] if p.stakeholders else []),
            pendingDecisions=pending, dependencies=[dependency] + [r.cause for r in risks[:4]],
            questions=[s(f'¿Qué evidencia falta para confirmar: {item.lower()}?', f'What evidence is needed to confirm: {item.lower()}?') for item in missing[:5]] or [s('¿Qué cambió desde el último control del proyecto?', 'What changed since the last project checkpoint?')],
            scopeChanges=[line[:1500] for line in source if affirmed(r'\b(scope change|cambio de alcance|nuevos? requisit\w*|new requirement\w*)\b', line)][:5],
            previousDocumentCount=len(request.previousDocuments),
        )

    @staticmethod
    def _risk(values, evidence, source, es):
        name, cause, impact, mitigation, signal, owner = values
        return Risk(risk=name, evidence=evidence, cause=cause, impact=impact, mitigation=mitigation, signal=signal, suggestedOwner=owner, source=source,
                    probability='Sin estimar — validar' if es else 'Unestimated — validate',
                    severity='Por evaluar — propuesta' if es else 'To assess — proposed',
                    priority='Revisar en el próximo control' if es else 'Review at the next checkpoint')
