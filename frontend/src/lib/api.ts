import type {
  DocumentType,
  GenerationResult,
  Language,
  Project,
  ProjectInput,
  User,
  ProjectIntelligence,
  PreviousDocument,
  ProjectRecord,
} from '@/types';
import { AppError } from './errors';
import { appCheckHeader, getFirebase } from './firebase';
import { wireReviewContext } from './review-context';
import { projectContext as readContext } from './project-context';

const baseURL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export async function healthCheck() {
  const response = await fetch(`${baseURL}/api/v1/health`, {
    signal: AbortSignal.timeout(5000),
    cache: 'no-store',
  });
  if (!response.ok) throw new AppError('network');
  return response.json() as Promise<{
    status: string;
    provider: string;
    authMode: string;
    model: string | null;
  }>;
}

async function requestPMO<T>(
  user: User | null,
  project: ProjectInput,
  type: DocumentType,
  language: Language,
  inputContext: string,
  signal?: AbortSignal,
  useDemoFallback = false,
  options: {
    previousDocuments?: PreviousDocument[];
    question?: string;
    analysisMode?: 'standard' | 'scenario';
    trackingRecords?: ProjectRecord[];
    endpoint?: 'generate' | 'intelligence';
    cutoff?: string;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  Object.assign(headers, await appCheckHeader());
  if (user?.mode === 'firebase') {
    const account = getFirebase().auth.currentUser;
    if (!account || account.uid !== user.uid) throw new AppError('authentication_required');
    headers.Authorization = `Bearer ${await account.getIdToken()}`;
  }
  const context = await readContext(user, project, options.cutoff);
  const provided = context.snapshot?.project || project;
  const projectContext = {
    aiAccess: context.access,
    name: provided.name,
    sector: provided.sector,
    description: provided.description,
    objectives: provided.objectives,
    startDate: provided.startDate || null,
    endDate: provided.endDate || null,
    status: provided.status,
    budget: provided.budget,
    stakeholders: provided.stakeholders,
    notes: provided.notes,
  };
  try {
    const endpoint = `${user?.mode === 'firebase' ? '' : 'workspace/'}${options.endpoint || 'generate'}`;
    const body = JSON.stringify({
      project: projectContext,
      type,
      language,
      inputContext,
      useOfflineFallback: useDemoFallback,
      previousDocuments: options.previousDocuments || [],
      question: options.question || '',
      analysisMode: options.analysisMode || 'standard',
      reviewContext: context.snapshot ? wireReviewContext(context.snapshot) : undefined,
      trackingRecords: context.snapshot
        ? context.snapshot.records.map(({ dueDate, ...r }) => ({
            ...r,
            dueDate: dueDate || null,
          }))
        : (options.trackingRecords || []).map((r, index) => ({
            id: `record-${index + 1}`,
            kind: r.kind,
            title: r.title,
            status: r.status,
            dueDate: r.dueDate || null,
            severity: r.severity,
            evidence: r.evidence,
          })),
      sourceExcerpts: context.sources,
      externalContextConsent: context.access === 'external',
    });
    if (new TextEncoder().encode(body).length > 240000) throw new AppError('context_limit');

    const response = await fetch(`${baseURL}/api/v1/${endpoint}`, {
      method: 'POST',
      headers,
      body,
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(315000)])
        : AbortSignal.timeout(315000),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new AppError(
        error.detail?.code || (response.status === 401 ? 'invalid_token' : 'network'),
        error.detail?.message,
        error.detail?.provider === 'ollama' && error.detail?.fallbackAvailable === true,
      );
    }
    const result = await response.json();
    if (context.snapshot) {
      if (options.endpoint === 'intelligence') result.snapshot = context.snapshot;
      else if (result.intelligence) result.intelligence.snapshot = context.snapshot;
    }
    return result;
  } catch (error) {
    if (error instanceof AppError || (error instanceof DOMException && error.name === 'AbortError'))
      throw error;
    throw new AppError(
      error instanceof DOMException && error.name === 'TimeoutError'
        ? 'provider_timeout'
        : 'network',
    );
  }
}

export function generateDocument(...args: Parameters<typeof requestPMO<GenerationResult>>) {
  return requestPMO<GenerationResult>(...args);
}

export function analyzeProject(
  user: User,
  project: Project,
  language: Language,
  records: ProjectRecord[],
  signal?: AbortSignal,
  cutoff?: string,
) {
  return requestPMO<ProjectIntelligence>(
    user,
    project,
    'risk_register',
    language,
    '',
    signal,
    true,
    { endpoint: 'intelligence', trackingRecords: records, cutoff },
  );
}

export function simulateScenario(
  user: User,
  project: Project,
  language: Language,
  scenario: string,
  records: ProjectRecord[],
  signal?: AbortSignal,
  cutoff?: string,
) {
  return requestPMO<GenerationResult>(
    user,
    project,
    'executive_brief',
    language,
    '',
    signal,
    false,
    { question: scenario, analysisMode: 'scenario', trackingRecords: records, cutoff },
  );
}

// Read-only public generation: no sign-in, account switch or repository writes.
export function generateExample(
  project: ProjectInput,
  type: DocumentType,
  language: Language,
  signal?: AbortSignal,
) {
  return requestPMO<GenerationResult>(null, project, type, language, '', signal);
}
