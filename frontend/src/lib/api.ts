import type { DocumentType, GenerationResult, Language, Project, User } from '@/types';
import { AppError } from './errors';
import { cloudEnabled, getFirebase } from './firebase';

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

export async function generateDocument(
  user: User,
  project: Project,
  type: DocumentType,
  language: Language,
  inputContext: string,
  signal?: AbortSignal,
  useDemoFallback = false,
): Promise<GenerationResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user.mode === 'firebase') {
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
    const endpoint = user.mode === 'demo' && cloudEnabled ? 'demo/generate' : 'generate';
    const response = await fetch(`${baseURL}/api/v1/${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        project: projectContext,
        type,
        language,
        inputContext,
        useDemoFallback,
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
