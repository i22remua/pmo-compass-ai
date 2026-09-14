import type { Dictionary } from '@/locales/en';

export class AppError extends Error {
  constructor(
    public code: string,
    message = code,
    public fallbackAvailable = false,
  ) {
    super(message);
  }
}

export function errorMessage(error: unknown, t: Dictionary): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === 'storage') return t.storageError;
  if (code === 'network') return t.networkError;
  if (code === 'provider_unavailable') return t.ai.providerUnavailable;
  if (code === 'ollama_model_unavailable') return t.ai.modelUnavailable;
  if (code === 'invalid_provider_response') return t.ai.invalidResponse;
  if (code === 'incomplete_provider_response') return t.ai.incompleteResponse;
  if (code === 'invalid_token' || code === 'authentication_required') return t.sessionError;
  if (code === 'auth/email-already-in-use') return t.emailInUse;
  if (code === 'auth/weak-password') return t.weakPassword;
  if (code === 'auth/too-many-requests' || code === 'rate_limited') return t.tooManyRequests;
  if (code === 'permission-denied' || code === 'not-found') return t.permissionError;
  if (code.startsWith('auth/')) return t.authError;
  if (code === 'dates') return t.invalidDates;
  if (code === 'validation_error') return t.invalidFields;
  if (code === 'clipboard') return t.clipboardError;
  if (code === 'provider_timeout') return t.providerTimeout;
  if (code === 'external_not_configured') return t.externalNotConfigured;
  return t.genericError;
}

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    throw new AppError('storage');
  }
}
export function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    throw new AppError('storage');
  }
}
