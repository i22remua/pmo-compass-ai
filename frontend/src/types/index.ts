export type Language = 'es' | 'en';
export type ProjectStatus = 'planning' | 'active' | 'at_risk' | 'completed';
export const documentTypes = [
  'executive_brief',
  'weekly_status',
  'risk_register',
  'meeting_minutes',
  'action_items',
  'stakeholder_email',
  'scope_change',
  'lessons_learned',
] as const;
export type DocumentType = (typeof documentTypes)[number];
export type DataMode = 'demo' | 'firebase';
export interface User {
  uid: string;
  name: string;
  email: string;
  mode: DataMode;
}
export interface ProjectInput {
  name: string;
  sector: string;
  description: string;
  objectives: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  budget: number | null;
  stakeholders: string;
  notes: string;
  aiAccess?: 'offline' | 'external';
}
export interface Project extends ProjectInput {
  id: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deleting?: boolean;
}
export interface Risk {
  risk: string;
  evidence: string;
  cause: string;
  impact: string;
  probability: string;
  severity: string;
  mitigation: string;
  signal: string;
  suggestedOwner: string;
  source?: 'provided' | 'inferred';
  priority?: string;
}
export interface EvidenceReference {
  origin: string;
  locator: string;
  text: string;
}
export interface Contradiction {
  id: string;
  title: string;
  evidenceA: EvidenceReference;
  evidenceB: EvidenceReference;
  explanation: string;
  suggestedCheck: string;
}
export type DiagnosisClassification = 'provided' | 'inferred' | 'insufficient';
export interface DiagnosisItem {
  text: string;
  classification: DiagnosisClassification;
  evidence: EvidenceReference[];
}
export interface ProjectDiagnosis {
  currentSituation: DiagnosisItem[];
  alerts: DiagnosisItem[];
  causes: DiagnosisItem[];
  potentialImpact: DiagnosisItem[];
  recommendedActions: DiagnosisItem[];
  missingData: DiagnosisItem[];
}
export type ProviderName =
  'offline' | 'gemini' | 'groq' | 'openrouter' | 'demo' | 'ollama' | 'external';
export interface ProjectIntelligence {
  engine: 'offline';
  confidence: 'low' | 'moderate';
  confidenceReason: string;
  health: 'unknown' | 'attention' | 'review';
  healthReason: string;
  providedInformation: string[];
  risks: Risk[];
  assumptions: string[];
  missingInformation: string[];
  recommendedActions: {
    action: string;
    ownerRole: string;
    priority: string;
    deadline: string | null;
    dependency: string;
    successCriteria: string;
    status: 'proposed';
  }[];
  stakeholders: string[];
  pendingDecisions: string[];
  dependencies: string[];
  questions: string[];
  scopeChanges: string[];
  contradictions: Contradiction[];
  diagnosis: ProjectDiagnosis;
  previousDocumentCount: number;
}
export interface PreviousDocument {
  type: DocumentType;
  provider: ProviderName;
  content: string;
}
export interface GeneratedDocument {
  id: string;
  ownerId: string;
  projectId: string;
  type: DocumentType;
  language: Language;
  inputContext: string;
  generatedContent: string;
  createdAt: string;
  provider: ProviderName;
  risks: Risk[];
  warnings: string[];
}
export interface GenerationResult {
  id: string;
  type: DocumentType;
  language: Language;
  provider: GeneratedDocument['provider'];
  fallbackFrom?: string | null;
  intelligence?: ProjectIntelligence | null;
  generatedAt: string;
  content: string;
  risks: Risk[];
  warnings: string[];
}

export interface SourceExcerpt {
  id: string;
  label: string;
  locator: string;
  text: string;
  reviewed: boolean;
}
export interface ProjectSource extends SourceExcerpt {
  ownerId: string;
  projectId: string;
  createdAt: string;
}
export type RecordKind = 'action' | 'decision' | 'risk';
export interface ProjectRecord {
  id: string;
  ownerId: string;
  projectId: string;
  kind: RecordKind;
  title: string;
  status: 'open' | 'closed';
  dueDate: string;
  severity: 'unspecified' | 'low' | 'medium' | 'high';
  evidence: string;
  createdAt: string;
  updatedAt: string;
}
