"""Reproducible committee checks. No language model and no inferred relationships."""
import hashlib
import json
from datetime import timedelta
from app.models.review import ReviewFinding, FindingEvidence


def review_findings(request, contradictions=()):
    ctx = request.reviewContext
    if not ctx: return []
    es = request.language == 'es'
    choose = lambda a,b: a if es else b
    findings = []
    def add(rule, reference, kind, title, facts, question, due='', action=''):
        raw = json.dumps(facts,sort_keys=True,ensure_ascii=False,default=str)
        findings.append(ReviewFinding(
            id=f'{rule}:{reference}',rule=rule,classification=kind,title=title,
            explanation=title, evidence=[FindingEvidence(reference=ref,text=json.dumps(value,ensure_ascii=False,default=str)) for ref,value in facts],
            fingerprint=hashlib.sha256(raw.encode()).hexdigest(),cutoff=str(ctx.cutoff),
            question=question,action=action or choose('Revisar evidencia y acordar respuesta','Review evidence and agree a response'),dueDate=due,observedAt=str(next((c.updatedAt for c in ctx.controls if c.id==reference),next((r.updatedAt for r in request.trackingRecords if r.id==reference and r.updatedAt),ctx.projectUpdatedAt)))))
    controls={c.id:c for c in ctx.controls if not c.archived}
    for c in controls.values():
        d=c.data
        keys = {'milestone':['baselineDate','forecastDate','actualDate'], 'cost':['approved','forecast','actual','scope','asOf'], 'benefit':['objective','unit','baseline','target','actual','measuredOn'], 'decision':['status','requiredRole','dueDate','deliveryId'], 'change':['status','requiredRole','dueDate','deliveryId']}[c.kind]
        evidence=[(c.id,{'title':c.title,'data':{k:getattr(d,k) for k in keys},'evidence':c.evidence})]
        if c.updatedAt.date()>ctx.cutoff or (c.kind=='cost' and d.asOf>str(ctx.cutoff)) or (c.kind=='benefit' and d.measuredOn>str(ctx.cutoff)):
            add('after-cutoff',c.id,'insufficient',choose('Actualización posterior al corte','Update after cutoff'),evidence,choose('¿Qué valores estaban vigentes al corte? Guarda la revisión contemporánea.','Which values applied at cutoff? Save a contemporaneous review.'))
            continue
        if c.kind=='milestone':
            deadline=d.forecastDate or d.baselineDate
            if deadline and deadline<str(ctx.cutoff) and not d.actualDate:
                add('milestone-overdue',c.id,'deviation',choose('Hito vencido sin finalización registrada','Overdue milestone without recorded completion'),evidence,choose('¿Terminó este hito? Aporta fecha y evidencia o confirma una nueva previsión.','Did this milestone finish? Provide date and evidence or confirm a new forecast.'),deadline)
            if d.forecastDate and d.baselineDate and d.forecastDate>d.baselineDate:
                add('milestone-variance',c.id,'deviation',choose('Previsión posterior a la línea base','Forecast later than baseline'),evidence,choose('¿Qué explica la desviación y qué medida se acuerda?','What explains the variance and what action is agreed?'),d.baselineDate)
            points=[]
            for h in sorted(ctx.history,key=lambda h:h.cutoff):
                old=next((x for x in h.controls if x.id==c.id),None)
                if old and old.forecastDate: points.append((str(h.cutoff),old.forecastDate))
            if d.forecastDate: points.append((str(ctx.cutoff),d.forecastDate))
            if len(points)>=3 and all(b[1]>a[1] for a,b in zip(points,points[1:])):
                add('repeated-slippage',c.id,'deviation',choose('Dos desplazamientos consecutivos de la previsión','Two consecutive forecast slips'),[(c.id,points)],choose('¿Qué cambió en cada revisión y qué dependencia explica los desplazamientos?','What changed at each review and which dependency explains the slips?'),d.baselineDate)
        if c.kind=='cost' and d.forecast is not None and d.approved is not None:
            if not d.scope:
                add('cost-scope',c.id,'insufficient',choose('Ámbito de comparación económica sin confirmar','Cost comparison scope unconfirmed'),evidence,choose('¿Presupuesto y previsión cubren el mismo ámbito y periodo? Confirma el ámbito del registro.','Do budget and forecast cover the same scope and period? Confirm the record scope.'))
            elif d.forecast>d.approved:
                add('cost-variance',c.id,'deviation',choose('Previsión superior al presupuesto comparable','Forecast exceeds comparable approved budget'),[(c.id,{'scope':d.scope,'asOf':d.asOf,'approved':d.approved,'forecast':d.forecast,'differenceEUR':round(d.forecast-d.approved,2),'evidence':c.evidence})],choose('¿Se necesita una medida correctora o una decisión presupuestaria?','Is corrective action or a budget decision needed?'))
        if c.kind in ('decision','change') and d.status in ('proposed','reviewed') and d.deliveryId:
            delivery=controls.get(d.deliveryId)
            if delivery and delivery.kind=='milestone' and delivery.updatedAt.date()<=ctx.cutoff:
                date=delivery.data.forecastDate or delivery.data.baselineDate
                if date and date<=str(ctx.cutoff+timedelta(days=14)) and not delivery.data.actualDate:
                    add('delivery-decision',c.id,'deviation',choose('Decisión pendiente vinculada a una entrega próxima','Pending decision linked to an upcoming delivery'),evidence+[(delivery.id,{'title':delivery.title,'date':date})],choose('¿Quién debe decidir y antes de qué fecha para liberar esta entrega?','Who must decide and by when to unblock this delivery?'),d.dueDate or date)
            else:
                add('missing-dependency',c.id,'insufficient',choose('Entrega vinculada fuera del contexto','Linked delivery outside context'),evidence,choose('¿Sigue vigente el vínculo? Incluye la entrega en la revisión.','Is the link still valid? Include the delivery in the review.'))
    linked={c.recordId for c in controls.values() if c.kind=='decision' and c.recordId}
    for r in request.trackingRecords:
        if r.kind=='decision' and r.id in linked: continue
        facts=[(r.id,{'title':r.title,'status':r.status,'dueDate':str(r.dueDate) if r.dueDate else '', 'ownerRole':r.ownerRole,'closureCriteria':r.closureCriteria,'completionEvidence':r.completionEvidence})]
        if r.updatedAt and r.updatedAt.date()>ctx.cutoff:
            add('after-cutoff',r.id,'insufficient',choose('Registro actualizado después del corte','Record updated after cutoff'),facts,choose('¿Qué estado tenía al corte? Consulta una revisión guardada.','What was its state at cutoff? Consult a saved review.'));continue
        if r.kind=='action' and r.status=='open' and r.dueDate and r.dueDate<ctx.cutoff:
            add('action-overdue',r.id,'deviation',choose('Compromiso vencido','Overdue commitment'),facts,choose('¿Qué impide cerrarlo y qué fecha confirma el responsable? No se asume impacto en el hito final.','What prevents closure and what date does the owner confirm? Final milestone impact is not assumed.'),str(r.dueDate))
        if r.kind!='risk' and r.status=='closed' and not r.completionEvidence.strip():
            add('closure-evidence',r.id,'insufficient',choose('Cierre declarado sin evidencia de finalización','Declared closure without completion evidence'),facts,choose('¿Qué evidencia demuestra el criterio de cierre?','What evidence demonstrates the closure criterion?'))
        previous=sorted(ctx.history,key=lambda h:h.cutoff,reverse=True)
        old=next((x for h in previous for x in h.records if x.id==r.id),None)
        if r.status=='open' and old and old.status=='closed':
            add('reopened',r.id,'deviation',choose('Compromiso reabierto','Reopened commitment'),facts+[(r.id,{'previousStatus':old.status})],choose('¿Por qué se reabrió y qué cambia en el compromiso?','Why was it reopened and what changes in the commitment?'))
    for contradiction in contradictions:
        # Existing dependency-date detector supplies both sides; never assert its suggested relation as confirmed.
        # Match the actual quote to its stable selected source; translated display labels are not identities.
        quote=contradiction.evidenceB.text
        if contradiction.evidenceA.text != str(request.project.endDate): continue
        source=next((s for s in request.sourceExcerpts if quote in s.text),None)
        reference=source.id if source else 'project'
        add('date-claim',reference,'contradiction',contradiction.title,
            [('project',{'endDate':str(request.project.endDate)}),(reference,{'quote':quote})],
            choose('¿Se refieren al mismo entregable y siguen vigentes ambas fechas? Confirma el vínculo antes de concluir incompatibilidad.', 'Do these refer to the same delivery, and are both dates current? Confirm the link before concluding they conflict.'))
    open_items=[r.id for r in request.trackingRecords if r.status=='open']+[c.id for c in controls.values() if c.kind=='decision' and c.data.status in ('proposed','reviewed')]
    if request.project.status=='completed' and open_items:
        add('completed-open','project','hypothesis',choose('Proyecto completado con pendientes por aclarar','Completed project with outstanding items to clarify'),[('project',{'status':'completed','open':open_items})],choose('¿Son trabajo residual, pendientes de cierre o registros desactualizados?','Are these residual work, closure items or stale records?'))
    dates=[ctx.projectUpdatedAt.date()]+[c.updatedAt.date() for c in controls.values()]+[r.updatedAt.date() for r in request.trackingRecords if r.updatedAt]
    past=[d for d in dates if d<=ctx.cutoff]
    if not past or (ctx.cutoff-max(past)).days>30:
        add('stale-context','project','insufficient',choose('Sin actualización registrada en los últimos 30 días','No recorded update in the last 30 days'),[('project',{'latest':str(max(past)) if past else None})],choose('¿Quién puede confirmar que la información sigue vigente?','Who can confirm that the information is still current?'))
    if ctx.coverage.partial or not request.trackingRecords or not controls:
        add('coverage','project','insufficient',choose('Cobertura del análisis por completar','Analysis coverage needs completion'),[('project',ctx.coverage.model_dump())],choose('¿Qué registros o revisiones faltan para preparar el comité?','Which records or reviews are missing for the committee?'))
    return sorted(findings,key=lambda f:(not bool(f.dueDate),f.dueDate or '9999',f.classification!='deviation',f.rule!='delivery-decision',f.observedAt,f.id))
