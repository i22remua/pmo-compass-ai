'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth, useLocale } from './providers';
import { loadWorkspace, type WorkspaceData } from '@/lib/repository';

const Context = createContext<
  (WorkspaceData & { loading: boolean; error: unknown; refresh: () => Promise<void> }) | null
>(null);
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error('WorkspaceProvider missing');
  return value;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { language } = useLocale();
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  const [data, setData] = useState<WorkspaceData>({ projects: [], documents: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!user) return;
    const current = ++sequence.current;
    try {
      const next = await loadWorkspace(user, languageRef.current);
      if (sequence.current === current) {
        next.projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        next.documents.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setData(next);
        setError(null);
      }
    } catch (issue) {
      if (sequence.current === current) setError(issue);
    } finally {
      if (sequence.current === current) setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    const pending = sequence;
    void refresh();
    const onStorage = () => {
      void refresh();
    };
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      pending.current++;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);
  return (
    <Context.Provider value={{ ...data, loading, error, refresh }}>{children}</Context.Provider>
  );
}
