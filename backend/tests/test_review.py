"""Committee acceptance case and conservative negative cases; no remote provider."""
from copy import deepcopy
import asyncio
import pytest
from pydantic import ValidationError
from app.models.generation import GenerationRequest
from app.services.inference import PMOInferenceService
from app.providers.prompts import minimal_ai_context
from app.providers.service import generate_document
from app.config import Settings

M='control-'+'a'*24
C='control-'+'b'*24
D='control-'+'c'*24
A='record-'+'d'*24

def control(id,kind,data):
    return dict(id=id,kind=kind,title=kind+' review',data=data,evidence='Confirmed minutes',recordId='',archived=False,revision=1,createdAt='2026-03-01T00:00:00Z',updatedAt='2026-03-15T00:00:00Z')

def case(payload):
    p=deepcopy(payload)
    p['project'].update(startDate='2026-03-01',endDate='2026-04-01',status='active',notes='Budget approved. Costs pending. High risk mitigated; delivery remains on schedule.')
    p['trackingRecords']=[dict(id=A,kind='action',title='Approve migration checklist',status='closed',dueDate='2026-03-05',evidence='Registered commitment',ownerRole='PM',closureCriteria='Checklist signed',completionEvidence='',updatedAt='2026-03-15T00:00:00Z')]
    p['reviewContext']=dict(cutoff='2026-03-15',projectUpdatedAt='2026-03-15T00:00:00Z',coverage=dict(recordsTotal=1,controlsTotal=3,sourcesTotal=0,historyTotal=2,partial=False,policy='explicit bounded selection'),controls=[
        control(M,'milestone',dict(baselineDate='2026-03-10',forecastDate='2026-03-14',actualDate='',dependency='')),
        control(C,'cost',dict(approved=1000,forecast=1300,actual=0,asOf='2026-03-15',scope='Migration phase / whole delivery')),
        control(D,'decision',dict(status='proposed',reason='Approve cutover',alternatives='Go or defer',scopeImpact='',timeImpact='',costImpact='',baseline='',resolution='',decidedOn='',decisionRole='',requiredRole='Sponsor',dueDate='2026-03-14',deliveryId=M)),
    ],history=[dict(cutoff=day,records=[dict(id=A,status='open')],controls=[dict(id=M,forecastDate=forecast,forecast=None)]) for day,forecast in [('2026-03-01','2026-03-10'),('2026-03-08','2026-03-12')]])
    return p

def analyze(data):return PMOInferenceService().analyze(GenerationRequest(**data)).reviewFindings

@pytest.mark.parametrize('language',['es','en'])
def test_acceptance_three_reviews_exact_variances_and_links(payload,language):
    data=case(payload);data['language']=language
    found={f.rule:f for f in analyze(data)}
    assert {'repeated-slippage','milestone-overdue','milestone-variance','cost-variance','closure-evidence','delivery-decision'} <= found.keys()
    assert '2026-03-01' in found['repeated-slippage'].evidence[0].text
    assert '2026-03-08' in found['repeated-slippage'].evidence[0].text
    assert '300.0' in found['cost-variance'].evidence[0].text
    assert found['delivery-decision'].evidence[1].reference==M
    assert all(f.cutoff=='2026-03-15' and f.question and f.fingerprint for f in found.values())
    assert not any(f.classification=='contradiction' for f in found.values())

def test_identity_and_evidence_fingerprint_independent_of_language(payload):
    data=case(payload);en=analyze(data);data['language']='es';es=analyze(data)
    assert [(x.id,x.fingerprint) for x in en]==[(x.id,x.fingerprint) for x in es]
    data['reviewContext']['controls'][0]['data']['forecastDate']='2026-03-16'
    old=next(x for x in en if x.rule=='milestone-variance');new=next(x for x in analyze(data) if x.rule=='milestone-variance')
    assert old.id==new.id and old.fingerprint!=new.fingerprint

def test_no_cross_scope_comparisons_and_unknown_is_not_zero(payload):
    data=case(payload);cost=data['reviewContext']['controls'][1]['data'];cost.update(approved=None,forecast=0,scope='scope A')
    assert 'cost-variance' not in [x.rule for x in analyze(data)]
    cost.update(approved=0,forecast=1)
    assert 'cost-variance' in [x.rule for x in analyze(data)]
    cost.update(scope='')
    assert 'cost-variance' not in [x.rule for x in analyze(data)]
    assert 'cost-scope' in [x.rule for x in analyze(data)]
    other=control('control-'+'e'*24,'cost',dict(approved=100000,actual=None,forecast=None,asOf='2026-03-15',scope='scope B'))
    data['reviewContext']['controls'].append(other);data['reviewContext']['coverage']['controlsTotal']=4
    assert 'cost-variance' not in [x.rule for x in analyze(data)]

def test_reopening_and_partial_context_are_explicit(payload):
    data=case(payload);data['trackingRecords'][0]['status']='open';data['reviewContext']['history'][-1]['records'][0]['status']='closed'
    data['reviewContext']['coverage'].update(recordsTotal=70,partial=True)
    rules=[f.rule for f in analyze(data)];assert 'reopened' in rules and 'action-overdue' in rules and 'coverage' in rules
    data['reviewContext']['coverage']['partial']=False
    with pytest.raises(ValidationError):GenerationRequest(**data)

def test_after_cutoff_and_old_sources_are_not_comparable_facts(payload):
    data=case(payload);data['reviewContext']['controls'][0]['updatedAt']='2026-03-16T00:00:00Z'
    found=analyze(data);assert not any(f.rule=='repeated-slippage' for f in found)
    assert any(f.rule=='after-cutoff' for f in found)
    for note in ['If dependency finishes 2026-05-01, review plan.','The dependency does not finish 2026-05-01.','Si la dependencia termina 2026-05-01, revisar.']:
        data['project']['notes']=note
        assert not PMOInferenceService().analyze(GenerationRequest(**data)).contradictions

def test_no_recent_information_and_completed_residual_question(payload):
    data=case(payload);data['reviewContext']['cutoff']='2026-05-01';data['project']['status']='completed';data['trackingRecords'][0]['status']='open'
    found={x.rule:x for x in analyze(data)}
    assert found['stale-context'].classification=='insufficient'
    assert found['completed-open'].classification=='hypothesis'

def test_context_rejects_account_metadata_and_history_after_cutoff(payload):
    data=case(payload);data['reviewContext']['controls'][0]['ownerId']='private-account'
    with pytest.raises(ValidationError):GenerationRequest(**data)
    del data['reviewContext']['controls'][0]['ownerId'];data['reviewContext']['history'][0]['cutoff']='2026-04-01'
    with pytest.raises(ValidationError):GenerationRequest(**data)

@pytest.mark.parametrize('mode',['document','question','scenario'])
def test_same_context_reaches_all_outputs_without_external_ai(payload,mode):
    data=case(payload)
    if mode!='document': data['question']='What needs a decision?'
    if mode=='scenario':data['analysisMode']='scenario'
    req=GenerationRequest(**data)
    assert minimal_ai_context(req)['reviewContext']['controls'][1]['data']['scope']=='Migration phase / whole delivery'
    result=asyncio.run(generate_document(req,Settings(_env_file=None,ai_provider='offline')))
    assert result.provider=='offline' and result.intelligence.reviewFindings
    if mode=='document': assert M in result.content and '2026-03-15' in result.content
    else: assert result.intelligence.reviewFindings[0].cutoff=='2026-03-15'


def test_typed_context_rejects_mixed_kind_fields_and_oversized_facts_stay_bounded(payload):
    data=case(payload);data['reviewContext']['controls'][0]['data']['approved']=1000
    with pytest.raises(ValidationError): GenerationRequest(**data)
    del data['reviewContext']['controls'][0]['data']['approved']
    data['reviewContext']['controls'][2]['data'].update(reason='x'*2000,alternatives='y'*2000,baseline='z'*2000)
    data['trackingRecords'][0].update(evidence='e'*2000,closureCriteria='c'*1000,completionEvidence='f'*2000)
    assert analyze(data)

def test_possible_date_claim_retains_both_sides_and_language_stable_identity(payload):
    data=case(payload);data['project']['notes']='Dependency delivery ends 2026-05-01.'
    en=next(f for f in analyze(data) if f.rule=='date-claim')
    data['language']='es';es=next(f for f in analyze(data) if f.rule=='date-claim')
    assert en.id==es.id and en.fingerprint==es.fingerprint
    assert en.classification=='contradiction' and len(en.evidence)==2
    assert '2026-04-01' in en.evidence[0].text and '2026-05-01' in en.evidence[1].text


def test_control_variances_reach_the_executive_diagnosis_without_calling_active_green(payload):
    result=PMOInferenceService().analyze(GenerationRequest(**case(payload)))
    assert result.health=='attention'
    assert any('cost' in item.text and item.classification=='provided' for item in result.diagnosis.alerts)
    supplied=[item for item in result.diagnosis.alerts if item.classification=='provided']
    assert supplied and all(item.evidence for item in supplied)
