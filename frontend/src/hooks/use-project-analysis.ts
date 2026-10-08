'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth, useLocale } from '@/components/providers';
import { useWorkspace } from '@/components/workspace-provider';
import { analyzeProject } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import type { Project, ProjectIntelligence, ProjectRecord } from '@/types';

// Page-scoped only: analysis never survives an account or project change in storage.
export function useProjectAnalysis(project: Project | undefined) {
  const { user } = useAuth();
  const { language, t } = useLocale();
  const { records, sources } = useWorkspace();
  const identity = `${user?.mode}:${user?.uid}:${project?.id}:${language}`;
  const serialized = JSON.stringify({
    project,
    records: records.filter((record) => record.projectId === project?.id),
    sources: sources.filter((source) => source.projectId === project?.id),
  });
  // Workspace refreshes also happen on window focus. Equal content must not request
  // another analysis, while a changed reviewed source must invalidate the result.
  const input = useMemo(
    () => JSON.parse(serialized) as { project?: Project; records: ProjectRecord[] },
    [serialized],
  );
  const [result, setResult] = useState<{
    identity: string;
    serialized: string;
    analysis: ProjectIntelligence;
    at: string;
  } | null>(null);
  const [request, setRequest] = useState({ identity: '', busy: false, error: '' });
  const controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    controller.current?.abort();
    if (!user || !input.project || input.project.deleting) return;
    const pending = new AbortController();
    controller.current = pending;
    setRequest({ identity, busy: true, error: '' });
    try {
      const analysis = await analyzeProject(
        user,
        input.project,
        language,
        input.records,
        AbortSignal.any([pending.signal, AbortSignal.timeout(20000)]),
      );
      if (!pending.signal.aborted) {
        setResult({ identity, serialized, analysis, at: new Date().toISOString() });
        setRequest({ identity, busy: false, error: '' });
      }
    } catch (issue) {
      if (!pending.signal.aborted) {
        setRequest({ identity, busy: false, error: errorMessage(issue, t) });
      }
    }
  }, [user, input, identity, language, serialized, t]);
  useEffect(() => {
    void refresh();
    return () => controller.current?.abort();
  }, [refresh]);

  const current = result?.identity === identity ? result : null;
  return {
    analysis: current?.analysis ?? null,
    analyzedAt: current?.at ?? null,
    stale: !!current && current.serialized !== serialized,
    busy: request.identity === identity ? request.busy : !!project && !project.deleting,
    error: request.identity === identity ? request.error : '',
    refresh,
  };
}

export type ProjectAnalysisState = ReturnType<typeof useProjectAnalysis>;
