"""Evidence-first contradiction detection and conservative project diagnosis."""
from datetime import date, datetime
import re

from app.models.generation import (
    Contradiction,
    DiagnosisItem,
    EvidenceReference,
    GenerationRequest,
    ProjectDiagnosis,
    ProjectIntelligence,
)
from app.providers.risk_catalog import sentences


DATE_PATTERN = re.compile(r'\b(\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{4})\b')
DEPENDENCY = re.compile(
    r'\b(dependenc\w*|dependency|depends? on|dependencia\w*|depende de)\b', re.I
)
ON_TRACK = re.compile(r'\b(on[ -]?track|green status|status green|en plazo|estado verde)\b', re.I)
BUDGET_CLOSED = re.compile(
    r'\b(budget (?:is )?(?:closed|approved|fixed)|presupuesto (?:está )?(?:cerrado|aprobado|fijado))\b',
    re.I,
)
COST_PENDING = re.compile(
    r'\b(costs? (?:are )?(?:pending|unknown|unconfirmed)|pending costs?|'
    r'costes? (?:están? )?(?:pendientes?|desconocidos?|sin confirmar)|pendiente de (?:coste|presupuesto))\b',
    re.I,
)


class ProjectDiagnosisService:
    def analyze(
        self, request: GenerationRequest, intelligence: ProjectIntelligence
    ) -> tuple[list[Contradiction], ProjectDiagnosis]:
        es = request.language == 'es'
        s = lambda spanish, english: spanish if es else english
        evidence = self._evidence(request, es)
        contradictions: list[Contradiction] = []

        def add(title, left, right, explanation, check):
            if any(item.title == title for item in contradictions):
                return
            contradictions.append(
                Contradiction(
                    id=f'C{len(contradictions) + 1:02}', title=title,
                    evidenceA=left, evidenceB=right,
                    explanation=explanation, suggestedCheck=check,
                )
            )

        target = request.project.endDate
        if target:
            target_ref = self._ref(
                s('Ficha del proyecto', 'Project record'),
                s('Fecha objetivo', 'Target date'), str(target),
            )
            for ref in evidence:
                if not DEPENDENCY.search(ref.text):
                    continue
                for raw_date in DATE_PATTERN.findall(ref.text):
                    parsed = self._date(raw_date)
                    if parsed and parsed > target:
                        add(
                            s('Dependencia posterior a la fecha objetivo', 'Dependency after the target date'),
                            target_ref, ref,
                            s('La fecha comunicada para una dependencia queda después de la fecha objetivo del proyecto.',
                              'A reported dependency date falls after the project target date.'),
                            s('Confirmar ambas fechas y actualizar la secuencia o la línea base.',
                              'Confirm both dates and update the sequence or baseline.'),
                        )
                        break

        closed = next((ref for ref in evidence if BUDGET_CLOSED.search(ref.text)), None)
        pending_cost = next((ref for ref in evidence if COST_PENDING.search(ref.text)), None)
        if closed and pending_cost:
            closed_evidence = closed
            pending_evidence = pending_cost
            if closed == pending_cost:
                closed_match = BUDGET_CLOSED.search(closed.text)
                pending_match = COST_PENDING.search(pending_cost.text)
                closed_evidence = self._ref(
                    closed.origin, closed.locator, closed_match.group(0) if closed_match else closed.text,
                )
                pending_evidence = self._ref(
                    pending_cost.origin,
                    pending_cost.locator,
                    pending_match.group(0) if pending_match else pending_cost.text,
                )
            add(
                s('Estado del presupuesto incoherente', 'Inconsistent budget status'),
                closed_evidence, pending_evidence,
                s('Una fuente presenta el presupuesto como cerrado y otra mantiene costes pendientes.',
                  'One source presents the budget as closed while another reports pending costs.'),
                s('Revisar la última aprobación presupuestaria y los costes aún no comprometidos.',
                  'Review the latest budget approval and any costs not yet committed.'),
            )

        today = date.today()
        overdue = [record for record in request.trackingRecords
                   if record.kind == 'action' and record.status == 'open'
                   and record.dueDate and record.dueDate < today]
        high = [record for record in request.trackingRecords
                if record.kind == 'risk' and record.status == 'open' and record.severity == 'high']
        on_track = next((ref for ref in evidence if ON_TRACK.search(ref.text)), None)
        if on_track and overdue:
            record = overdue[0]
            add(
                s('Estado en plazo frente a acciones vencidas', 'On-track statement versus overdue actions'),
                on_track, self._record_ref(record, es),
                s(f'Hay {len(overdue)} acciones abiertas con fecha vencida frente a una afirmación de proyecto en plazo.',
                  f'There are {len(overdue)} open overdue actions alongside an on-track statement.'),
                s('Revalidar el estado con las acciones vencidas y documentar su efecto real en el plan.',
                  'Revalidate the status against overdue actions and record their actual effect on the plan.'),
            )
        elif on_track and high:
            add(
                s('Estado en plazo frente a riesgo alto', 'On-track statement versus a high risk'),
                on_track, self._record_ref(high[0], es),
                s('El estado comunicado no refleja un riesgo alto que continúa abierto.',
                  'The reported status does not reflect an open high risk.'),
                s('Confirmar el impacto del riesgo y revisar el estado comunicado.',
                  'Confirm the risk impact and review the reported status.'),
            )

        if request.project.status == 'at_risk' and on_track:
            add(
                s('Dos estados de proyecto incompatibles', 'Conflicting project status statements'),
                self._status_ref(request, es), on_track,
                s('La ficha marca el proyecto en riesgo mientras otra fuente lo presenta en plazo.',
                  'The project record marks the project at risk while another source says it is on track.'),
                s('Acordar un único estado de referencia y registrar su fecha de corte.',
                  'Agree one authoritative status and record its reporting date.'),
            )

        open_records = [record for record in request.trackingRecords if record.status == 'open']
        if request.project.status == 'completed' and open_records:
            add(
                s('Proyecto completado con elementos abiertos', 'Completed project with open items'),
                self._status_ref(request, es), self._record_ref(open_records[0], es),
                s(f'La ficha indica que el proyecto terminó, pero mantiene {len(open_records)} elementos abiertos.',
                  f'The project is marked completed but still has {len(open_records)} open records.'),
                s('Confirmar si son pendientes de cierre, trabajo residual o registros desactualizados.',
                  'Confirm whether these are closure items, residual work or stale records.'),
            )

        diagnosis = self._diagnosis(request, intelligence, contradictions, overdue, high, es)
        return contradictions[:20], diagnosis

    def _diagnosis(self, request, intelligence, contradictions, overdue, high, es):
        s = lambda spanish, english: spanish if es else english
        p = request.project
        situation = [DiagnosisItem(
            text=s(f'El proyecto figura en estado {self._status(p.status, True)}.',
                   f'The project is recorded as {self._status(p.status, False)}.'),
            classification='provided', evidence=[self._status_ref(request, es)],
        )]
        if p.description:
            description_ref = self._ref(
                s('Ficha del proyecto', 'Project record'),
                s('Descripción', 'Description'), p.description,
            )
            situation.append(DiagnosisItem(
                text=p.description, classification='provided', evidence=[description_ref],
            ))
        else:
            situation.append(DiagnosisItem(
                text=s('No hay una descripción suficiente para resumir qué está ocurriendo.',
                       'There is no sufficient description to summarise what is happening.'),
                classification='insufficient', evidence=[],
            ))
        if p.endDate:
            situation.append(DiagnosisItem(
                text=s(f'La fecha objetivo registrada es {p.endDate}.', f'The recorded target date is {p.endDate}.'),
                classification='provided',
                evidence=[self._ref(s('Ficha del proyecto', 'Project record'), s('Fecha objetivo', 'Target date'), str(p.endDate))],
            ))

        alerts: list[DiagnosisItem] = []
        for item in contradictions[:5]:
            alerts.append(DiagnosisItem(
                text=item.explanation, classification='inferred',
                evidence=[item.evidenceA, item.evidenceB],
            ))
        for record in overdue[:5]:
            alerts.append(DiagnosisItem(
                text=s(f'Acción vencida: {record.title}.', f'Overdue action: {record.title}.'),
                classification='provided', evidence=[self._record_ref(record, es)],
            ))
        for record in high[:5]:
            alerts.append(DiagnosisItem(
                text=s(f'Riesgo alto abierto: {record.title}.', f'Open high risk: {record.title}.'),
                classification='provided', evidence=[self._record_ref(record, es)],
            ))
        decisions = [record for record in request.trackingRecords
                     if record.kind == 'decision' and record.status == 'open']
        for record in decisions[:5]:
            alerts.append(DiagnosisItem(
                text=s(f'Decisión pendiente: {record.title}.', f'Pending decision: {record.title}.'),
                classification='provided', evidence=[self._record_ref(record, es)],
            ))
        if not alerts:
            alerts.append(DiagnosisItem(
                text=s('No hay alertas confirmadas suficientes; esto no demuestra que el proyecto esté bajo control.',
                       'There are not enough confirmed alerts; this does not prove the project is under control.'),
                classification='insufficient', evidence=[],
            ))

        causes: list[DiagnosisItem] = []
        impacts: list[DiagnosisItem] = []
        for risk in intelligence.risks[:5]:
            ref = self._matching_evidence(request, risk.evidence, es)
            causes.append(DiagnosisItem(
                text=risk.cause, classification='inferred', evidence=[ref] if ref else [],
            ))
            impacts.append(DiagnosisItem(
                text=risk.impact, classification='inferred', evidence=[ref] if ref else [],
            ))

        if not causes:
            causes.append(DiagnosisItem(
                text=s('Información insuficiente para identificar causas.',
                       'Insufficient information to identify causes.'),
                classification='insufficient', evidence=[],
            ))
            impacts.append(DiagnosisItem(
                text=s('Información insuficiente para evaluar el impacto potencial.',
                       'Insufficient information to assess potential impact.'),
                classification='insufficient', evidence=[],
            ))

        actions: list[DiagnosisItem] = []
        for contradiction in contradictions[:3]:
            actions.append(DiagnosisItem(
                text=contradiction.suggestedCheck, classification='inferred',
                evidence=[contradiction.evidenceA, contradiction.evidenceB],
            ))
        for action in intelligence.recommendedActions:
            if len(actions) >= 6:
                break
            actions.append(DiagnosisItem(text=action.action, classification='inferred', evidence=[]))

        missing = [DiagnosisItem(text=item, classification='insufficient', evidence=[])
                   for item in intelligence.missingInformation[:8]]
        return ProjectDiagnosis(
            currentSituation=situation, alerts=alerts[:20], causes=causes,
            potentialImpact=impacts, recommendedActions=actions, missingData=missing,
        )

    def _evidence(self, request, es):
        refs = []
        project_fields = [
            (request.project.description, 'Descripción' if es else 'Description'),
            (request.project.objectives, 'Objetivos' if es else 'Objectives'),
            (request.project.notes, 'Notas' if es else 'Notes'),
            (request.inputContext, 'Contexto adicional' if es else 'Additional context'),
        ]
        for value, locator in project_fields:
            refs.extend(self._ref('Ficha del proyecto' if es else 'Project record', locator, line)
                        for line in sentences(value))
        for index, source in enumerate(request.sourceExcerpts, 1):
            refs.extend(self._ref(source.label, f'[S{index}] · {source.locator}', line)
                        for line in sentences(source.text))
        return refs

    @staticmethod
    def _ref(origin, locator, text):
        return EvidenceReference(origin=origin[:120], locator=locator[:120], text=text[:2000])

    def _record_ref(self, record, es):
        details = [record.title]
        if record.dueDate:
            details.append(('Vence: ' if es else 'Due: ') + str(record.dueDate))
        if record.kind == 'risk':
            details.append(('Nivel: ' if es else 'Level: ') + record.severity)
        if record.evidence:
            details.append(record.evidence)
        return self._ref('Seguimiento PMO' if es else 'PMO tracking', record.kind, ' · '.join(details))

    def _status_ref(self, request, es):
        return self._ref(
            'Ficha del proyecto' if es else 'Project record',
            'Estado' if es else 'Status', self._status(request.project.status, es),
        )

    def _matching_evidence(self, request, quote, es):
        normalised = ' '.join(quote.split())
        for ref in self._evidence(request, es):
            if normalised and normalised in ' '.join(ref.text.split()):
                return ref
        return None

    @staticmethod
    def _date(value):
        try:
            return datetime.strptime(value, '%Y-%m-%d' if '-' in value else '%d/%m/%Y').date()
        except ValueError:
            return None

    @staticmethod
    def _status(value, es):
        labels = {
            'planning': ('planificación', 'planning'),
            'active': ('activo', 'active'),
            'at_risk': ('en riesgo', 'at risk'),
            'completed': ('completado', 'completed'),
        }
        return labels[value][0 if es else 1]
