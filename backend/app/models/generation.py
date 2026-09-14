from datetime import date, datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

ProviderName = Literal['demo', 'ollama', 'external']
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


class GenerationRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    project: ProjectContext
    type: DocumentType
    language: Literal['es', 'en'] = 'es'
    inputContext: str = Field(default='', max_length=12000)
    useDemoFallback: bool = Field(default=False, strict=True)


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


class GenerationResponse(ProviderResult):
    id: str
    type: DocumentType
    language: Literal['es', 'en']
    provider: ProviderName
    fallbackFrom: Literal['ollama'] | None = None
    generatedAt: datetime
