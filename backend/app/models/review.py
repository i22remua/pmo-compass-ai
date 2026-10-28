"""Bounded, pseudonymous review context. No account/storage identifiers."""
from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator
import json

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)

class ControlData(Strict):
    status: Literal['proposed','reviewed','accepted','rejected'] | None = None
    reason: str = Field(default='', max_length=2000)
    alternatives: str = Field(default='', max_length=2000)
    scopeImpact: str = Field(default='', max_length=2000)
    timeImpact: str = Field(default='', max_length=2000)
    costImpact: str = Field(default='', max_length=2000)
    baseline: str | float | None = None
    resolution: str = Field(default='', max_length=2000)
    decidedOn: str = Field(default='', max_length=10)
    decisionRole: str = Field(default='', max_length=120)
    requiredRole: str = Field(default='', max_length=120)
    dueDate: str = Field(default='', max_length=10)
    deliveryId: str = Field(default='', max_length=64, pattern=r'^(control-[a-f0-9]{24})?$')
    baselineDate: str = Field(default='', max_length=10)
    forecastDate: str = Field(default='', max_length=10)
    actualDate: str = Field(default='', max_length=10)
    dependency: str = Field(default='', max_length=1000)
    approved: float | None = Field(default=None, ge=0, le=1e12)
    actual: float | None = Field(default=None, ge=-1e12, le=1e12)
    forecast: float | None = Field(default=None, ge=0, le=1e12)
    asOf: str = Field(default='', max_length=10)
    scope: str = Field(default='', max_length=160)
    objective: str = Field(default='', max_length=1000)
    unit: str = Field(default='', max_length=80)
    target: float | None = Field(default=None, ge=-1e12, le=1e12)
    measuredOn: str = Field(default='', max_length=10)
    direction: Literal['increase','decrease'] | None = None

    @model_validator(mode='after')
    def dates(self):
        for name in ['decidedOn','dueDate','baselineDate','forecastDate','actualDate','asOf','measuredOn']:
            if getattr(self,name): date.fromisoformat(getattr(self,name))
        if isinstance(self.baseline,str) and len(self.baseline)>2000: raise ValueError('Baseline too long')
        return self

class AnalysisControl(Strict):
    id: str = Field(pattern=r'^control-[a-f0-9]{24}$')
    kind: Literal['decision','change','milestone','cost','benefit']
    title: str = Field(min_length=2,max_length=160)
    evidence: str = Field(max_length=2000)
    recordId: str = Field(default='',max_length=64,pattern=r'^(record-[a-f0-9]{24})?$')
    archived: bool
    revision: int = Field(ge=1)
    createdAt: datetime
    updatedAt: datetime
    data: ControlData

    @model_validator(mode='after')
    def typed_data(self):
        fields = {
            'decision': {'status','reason','alternatives','scopeImpact','timeImpact','costImpact','baseline','resolution','decidedOn','decisionRole','requiredRole','dueDate','deliveryId'},
            'milestone': {'baselineDate','forecastDate','actualDate','dependency'},
            'cost': {'approved','actual','forecast','asOf','scope'},
            'benefit': {'objective','unit','baseline','target','actual','measuredOn','direction'},
        }
        allowed = fields['decision' if self.kind == 'change' else self.kind]
        if not self.data.model_fields_set <= allowed: raise ValueError('Fields do not match control kind')
        if self.kind in ('decision','change') and (self.data.status is None or not isinstance(self.data.baseline,str)): raise ValueError('Invalid decision')
        if self.kind == 'milestone' and not self.data.baselineDate: raise ValueError('Milestone baseline required')
        if self.kind == 'cost' and (not self.data.asOf or (self.data.actual is not None and self.data.actual<0)): raise ValueError('Invalid cost snapshot')
        if self.kind == 'benefit' and (isinstance(self.data.baseline,str) or self.data.direction is None): raise ValueError('Invalid benefit snapshot')
        if isinstance(self.data.baseline,float) and abs(self.data.baseline)>1e12: raise ValueError('Baseline out of range')
        return self

class HistoryRecord(Strict):
    id: str = Field(pattern=r'^record-[a-f0-9]{24}$')
    status: Literal['open','closed']
class HistoryControl(Strict):
    id: str = Field(pattern=r'^control-[a-f0-9]{24}$')
    forecastDate: str = Field(max_length=10)
    forecast: float | None = Field(ge=0,le=1e12)
    @model_validator(mode='after')
    def valid_date(self):
        if self.forecastDate: date.fromisoformat(self.forecastDate)
        return self
class HistoryPoint(Strict):
    cutoff: date
    records: list[HistoryRecord] = Field(max_length=50)
    controls: list[HistoryControl] = Field(max_length=20)
class Coverage(Strict):
    recordsTotal: int = Field(ge=0,le=100000)
    controlsTotal: int = Field(ge=0,le=100000)
    sourcesTotal: int = Field(ge=0,le=100000)
    historyTotal: int = Field(ge=0,le=100000)
    partial: bool
    policy: str = Field(max_length=250)
class ReviewContext(Strict):
    cutoff: date
    projectUpdatedAt: datetime
    controls: list[AnalysisControl] = Field(default_factory=list,max_length=20)
    history: list[HistoryPoint] = Field(default_factory=list,max_length=2)
    coverage: Coverage

    @model_validator(mode='after')
    def bounded(self):
        if len({x.id for x in self.controls})!=len(self.controls): raise ValueError('Duplicate controls')
        if any(h.cutoff>=self.cutoff for h in self.history): raise ValueError('History must precede cutoff')
        if len(json.dumps(self.model_dump(mode='json')).encode())>120000: raise ValueError('Review context too large')
        return self

class FindingEvidence(Strict):
    reference: str = Field(max_length=80)
    text: str = Field(max_length=4000)
class ReviewFinding(Strict):
    id: str = Field(max_length=100)
    rule: str = Field(max_length=60)
    version: int = 1
    classification: Literal['deviation','contradiction','insufficient','hypothesis']
    title: str = Field(max_length=300)
    explanation: str = Field(max_length=2000)
    evidence: list[FindingEvidence] = Field(max_length=5)
    fingerprint: str = Field(pattern=r'^[a-f0-9]{64}$')
    cutoff: str
    question: str = Field(max_length=1000)
    action: str = Field(default='',max_length=1000)
    dueDate: str = ''
    observedAt: str = ''
