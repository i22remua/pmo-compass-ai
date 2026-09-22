import type {
  DocumentType,
  GenerationResult,
  Language,
  Project,
  ProjectInput,
  User,
  ProjectIntelligence,
  PreviousDocument,
} from '@/types';
import { AppError } from './errors';
import { getFirebase } from './firebase';

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
    endpoint?: 'generate' | 'intelligence';
  } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user?.mode === 'firebase') {
    const account = getFirebase().auth.currentUser;
    if (!account || account.uid !== user.uid) throw new AppError('authentication_required');
    headers.Authorization = `Bearer ${await account.getIdToken()}`;
  }
  const projectContext = {
    name: project.name,
    sector: project.sector,
    description: project.description,
    objectives: project.objectives,
    startDate: project.startDate || null,
    endDate: project.endDate || null,
    status: project.status,
    budget: project.budget,
    stakeholders: project.stakeholders,
    notes: project.notes,
  };
  try {
    const endpoint = `${user?.mode === 'firebase' ? '' : 'workspace/'}${options.endpoint || 'generate'}`;
    const response = await fetch(`${baseURL}/api/v1/${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        project: projectContext,
        type,
        language,
        inputContext,
        useOfflineFallback: useDemoFallback,
        previousDocuments: options.previousDocuments || [],
        question: options.question || '',
      }),
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
    return await response.json();
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
  signal?: AbortSignal,
) {
  return requestPMO<ProjectIntelligence>(
    user,
    project,
    'risk_register',
    language,
    '',
    signal,
    true,
    { endpoint: 'intelligence' },
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
