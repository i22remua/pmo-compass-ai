from datetime import date, datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

ProviderName = Literal['offline', 'gemini', 'groq', 'openrouter', 'demo', 'ollama', 'external']
ResultText = Annotated[str, Field(min_length=1, max_length=2000)]


class DocumentType(StrEnum):
    EXECUTIVE_BRIEF = 'executive_brief'
    WEEKLY_STATUS = 'weekly_status'
    RISK_REGISTER = 'risk_register'
    MEETING_MINUTES = 'meeting_minutes'
    ACTION_ITEMS = 'action_items'
    STAKEHOLDER_EMAIL = 'stakeholder_email'
    SCOPE_CHANGE = 'scope_change'
    LESSONS_LEARNED = 'lessons_learned'


class ProjectContext(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    name: str = Field(min_length=2, max_length=120)
    sector: str = Field(min_length=2, max_length=80)
    description: str = Field(default='', max_length=5000)
    objectives: str = Field(default='', max_length=5000)
    startDate: date | None = None
    endDate: date | None = None
    status: Literal['planning', 'active', 'at_risk', 'completed'] = 'planning'
    budget: float | None = Field(default=None, ge=0, le=1_000_000_000_000)
    stakeholders: str = Field(default='', max_length=4000)
    notes: str = Field(default='', max_length=20000)

    @model_validator(mode='after')
    def date_order(self):
        if self.startDate and self.endDate and self.endDate < self.startDate:
            raise ValueError('End date must be on or after start date.')
        return self


class PreviousDocument(BaseModel):
    model_config = ConfigDict(extra='forbid')
    type: DocumentType
    provider: ProviderName
    content: str = Field(max_length=4000)


class GenerationRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    project: ProjectContext
    type: DocumentType
    language: Literal['es', 'en'] = 'es'
    inputContext: str = Field(default='', max_length=12000)
    useDemoFallback: bool = Field(default=False, strict=True)
    useOfflineFallback: bool = Field(default=False, strict=True)
    previousDocuments: list[PreviousDocument] = Field(default_factory=list, max_length=3)
    question: str = Field(default='', max_length=2000)


class Risk(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    risk: ResultText
    evidence: ResultText
    cause: ResultText
    impact: ResultText
    probability: ResultText
    severity: ResultText
    mitigation: ResultText
    signal: ResultText
    suggestedOwner: ResultText
    source: Literal['provided', 'inferred'] = 'provided'
    priority: ResultText = 'Proposed — review'


class RecommendedAction(BaseModel):
    action: ResultText
    ownerRole: ResultText
    priority: ResultText
    deadline: str | None = None
    dependency: ResultText
    successCriteria: ResultText
    status: Literal['proposed'] = 'proposed'


class ProjectIntelligence(BaseModel):
    engine: Literal['offline'] = 'offline'
    confidence: Literal['low', 'moderate']
    confidenceReason: ResultText
    health: Literal['unknown', 'attention', 'review']
    healthReason: ResultText
    providedInformation: list[ResultText]
    risks: list[Risk]
    assumptions: list[ResultText]
    missingInformation: list[ResultText]
    recommendedActions: list[RecommendedAction]
    stakeholders: list[ResultText]
    pendingDecisions: list[ResultText]
    dependencies: list[ResultText]
    questions: list[ResultText]
    scopeChanges: list[ResultText]
    previousDocumentCount: int = 0


class ProviderResult(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    content: str = Field(min_length=100, max_length=100000)
    risks: list[Risk] = Field(default_factory=list, max_length=30)
    warnings: list[ResultText] = Field(default_factory=list, max_length=20)

    @field_validator('content')
    @classmethod
    def require_document_title(cls, value: str) -> str:
        if not value.startswith('# ') or not value.splitlines()[0][2:].strip():
            raise ValueError('The document must start with a Markdown title.')
        return value


class CopilotResult(ProviderResult):
    # A focused answer may be shorter than the minimum for a full PMO document.
    content: str = Field(min_length=1, max_length=100000)


class GenerationResponse(CopilotResult):
    id: str
    type: DocumentType
    language: Literal['es', 'en']
    provider: ProviderName
    fallbackFrom: str | None = None
    intelligence: ProjectIntelligence | None = None
    generatedAt: datetime
