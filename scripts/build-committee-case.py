# Run from repository root: backend/.venv/bin/python scripts/build-committee-case.py
from pathlib import Path
import sys,json,hashlib
sys.path.insert(0,'backend')
from app.models.generation import GenerationRequest
from app.services.review_findings import review_findings
out={}
for lang in ['en','es']:
 def tr(en,es):return es if lang=='es' else en
 project=dict(id='committee-case',ownerId='fixture',name=tr('Committee case · Migration','Caso de comité · Migración'),sector=tr('Fictional industrial project','Proyecto industrial ficticio'),description=tr('Fictional migration reviewed on 1, 8 and 15 March 2026. Same delivery, EUR and scope throughout.','Migración ficticia revisada el 1, 8 y 15 de marzo de 2026. Misma entrega, EUR y ámbito en todas las revisiones.'),objectives=tr('Validate cutover before authorising delivery.','Validar el cambio antes de autorizar la entrega.'),startDate='2026-03-01',endDate='2026-03-14',status='active',budget=1000,stakeholders='Sponsor; PM',notes=tr('Fictional training data. An active lifecycle does not mean on schedule.','Datos ficticios de práctica. El ciclo de vida activo no significa en plazo.'),aiAccess='offline',createdAt='2026-03-01T12:00:00.000Z',updatedAt='2026-03-15T12:00:00.000Z')
 rows=[];versions=[];recordVersions=[];history=[]
 for n,(day,forecast,cost) in enumerate([('01','2026-03-10',1000),('08','2026-03-12',1200),('15','2026-03-14',1300)],1):
  cutoff=f'2026-03-{day}';stamp=cutoff+'T12:00:00.000Z'
  p={**project,'updatedAt':stamp}
  def control(id,kind,title,data):return dict(id=id,ownerId='fixture',projectId=p['id'],kind=kind,title=title,evidence=tr('Fictional minutes, review ','Acta ficticia, revisión ')+str(n),recordId='',archived=False,revision=n,versionId=f'{id}-v{n}',createdAt=p['createdAt'],updatedAt=stamp,data=data)
  cs=[control('committee-milestone','milestone',tr('Migration delivery','Entrega de migración'),dict(baselineDate='2026-03-10',forecastDate=forecast,actualDate='',dependency=tr('Sponsor must authorise cutover.','El sponsor debe autorizar el cambio.'))),control('committee-cost','cost',tr('Migration cost','Coste de migración'),dict(approved=1000,actual=0,forecast=cost,asOf=cutoff,scope=tr('Complete migration / March 2026 / EUR','Migración completa / marzo 2026 / EUR'))),control('committee-decision','decision',tr('Authorise cutover','Autorizar el cambio'),dict(status='proposed',reason=tr('Approval blocks delivery.','La aprobación bloquea la entrega.'),alternatives=tr('Approve or defer','Aprobar o aplazar'),scopeImpact='',timeImpact='',costImpact='',baseline='',resolution='',decidedOn='',decisionRole='',requiredRole='Sponsor',dueDate='2026-03-09',deliveryId='committee-milestone'))]
  rs=[dict(id='committee-action',ownerId='fixture',projectId=p['id'],kind='action',title=tr('Validate migration checklist','Validar checklist de migración'),status='closed' if n==3 else 'open',dueDate='2026-03-05',severity='unspecified',evidence=tr('Fictional registered commitment','Compromiso ficticio registrado'),ownerRole='PM',closureCriteria=tr('Signed checklist','Checklist firmado'),completionEvidence='',revision=n,versionId=f'committee-action-v{n}',createdAt=p['createdAt'],updatedAt=stamp)]
  refs={}
  def ref(kind,id):
   alias=kind+'-'+hashlib.sha256(json.dumps(id,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()[:24]
   refs[alias]=dict(kind=kind,id=id,**({'view':'governance' if id=='committee-decision' else 'delivery'} if kind=='control' else {}));return alias
  cr=[]
  for c in cs:
   x={k:v for k,v in c.items() if k not in ['ownerId','projectId','versionId']};x['id']=ref('control',c['id']);x['data']=dict(c['data']);
   if x['data'].get('deliveryId'):x['data']['deliveryId']=ref('control',x['data']['deliveryId'])
   cr.append(x)
  rr=[]
  for r in rs:
   x={k:v for k,v in r.items() if k not in ['ownerId','projectId','versionId']};x['id']=ref('record',r['id']);rr.append(x)
  snap=dict(schema=1,cutoff=cutoff,project={k:v for k,v in p.items() if k not in ['id','ownerId']},sources=[],records=rr,controls=cr,history=list(history),coverage=dict(recordsTotal=1,controlsTotal=3,sourcesTotal=0,historyTotal=len(history),partial=False,policy='Fictional complete case: 1 action, 3 controls, 3 explicit review cutoffs.'),references=refs)
  wire=dict(cutoff=cutoff,projectUpdatedAt=stamp,controls=cr,history=list(history),coverage=snap['coverage'])
  req=GenerationRequest(project={k:v for k,v in p.items() if k not in ['id','ownerId','createdAt','updatedAt']},type='executive_brief',language=lang,trackingRecords=rr,reviewContext=wire)
  data=dict(status='active',risks=[],records=[{k:v for k,v in rr[0].items() if k in ['id','kind','title','status','dueDate','severity']}],snapshot=snap,findings=[f.model_dump() for f in review_findings(req)],resolutions=[])
  # This fixture key identifies its immutable content, never used for external requests.
  key=hashlib.sha256(json.dumps(data,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
  rows.append(dict(id=p['id']+'--'+key,ownerId='fixture',projectId=p['id'],language=lang,engine='offline',contextKey=key,payload=json.dumps(data,ensure_ascii=False,separators=(',',':')),createdAt=p['createdAt'],updatedAt=stamp))
  history.append(dict(cutoff=cutoff,records=[dict(id=r['id'],status=r['status']) for r in rr],controls=[dict(id=c['id'],forecastDate=c['data'].get('forecastDate',''),forecast=c['data'].get('forecast')) for c in cr]));versions+=cs;recordVersions+=rs
 out[lang]=dict(project=p,controls=cs,records=rs,reviewHistory=rows,controlVersions=versions,recordVersions=recordVersions)
Path('frontend/src/lib/committee-case.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
