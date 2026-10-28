import type { Project, ProjectRecord, ProjectSource, ProjectReview } from '@/types';
import type { ProjectControl } from './project-controls';
import { validateControl } from './project-controls';
import { AppError } from './errors';
import { parseReview } from './project-review';

type ProjectControlSnapshot = ProjectControl extends infer T
  ? T extends ProjectControl
    ? Omit<T, 'ownerId' | 'projectId' | 'versionId'>
    : never
  : never;
export interface AnalysisSnapshot {
  schema: 1;
  cutoff: string;
  project: Omit<Project, 'ownerId' | 'id'>;
  sources: {
    id: string;
    label: string;
    locator: string;
    text: string;
    reviewed: boolean;
    createdAt: string;
  }[];
  records: Omit<ProjectRecord, 'ownerId' | 'projectId'>[];
  controls: ProjectControlSnapshot[];
  history: {
    cutoff: string;
    records: { id: string; status: string }[];
    controls: { id: string; forecastDate: string; forecast: number | null }[];
  }[];
  coverage: {
    recordsTotal: number;
    controlsTotal: number;
    sourcesTotal: number;
    historyTotal: number;
    partial: boolean;
    policy: string;
  };
  // Kept in owner-scoped storage only. Never part of provider/backend context.
  references: Record<string, { kind: 'record' | 'control' | 'source'; id: string; view?: string }>;
}
export async function digest(value: unknown) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}
export async function buildAnalysisSnapshot(
  project: Project,
  sources: ProjectSource[],
  records: ProjectRecord[],
  controls: ProjectControl[],
  history: ProjectReview[],
  cutoff: string,
  historyIncomplete = false,
): Promise<AnalysisSnapshot> {
  const references: AnalysisSnapshot['references'] = {};
  const ref = async (kind: 'record' | 'control' | 'source', id: string) => {
    const alias = `${kind}-${(await digest(id)).slice(0, 24)}`;
    references[alias] = {
      kind,
      id,
      ...(kind === 'control'
        ? {
            view: ['decision', 'change'].includes(controls.find((c) => c.id === id)?.kind || '')
              ? 'governance'
              : controls.find((c) => c.id === id)?.kind === 'benefit'
                ? 'benefits'
                : 'delivery',
          }
        : {}),
    };
    return alias;
  };
  const owned = <T extends { ownerId: string; projectId: string; id: string; view?: string }>(
    items: T[],
  ) =>
    items
      .filter((x) => x.ownerId === project.ownerId && x.projectId === project.id)
      .sort((a, b) => a.id.localeCompare(b.id));
  const rs = owned(records),
    cs = owned(controls).filter((c) => !c.archived),
    ss = owned(sources);
  const allHistory = owned(history)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((x) => parseReview(x.payload)?.snapshot)
    .filter((x): x is AnalysisSnapshot => !!x && x.cutoff < cutoff)
    .sort((a, b) => b.cutoff.localeCompare(a.cutoff));
  const hs = allHistory.filter(
    (x, index) => allHistory.findIndex((y) => y.cutoff === x.cutoff) === index,
  );
  const { id: _id, ownerId: _owner, ...p } = project;
  void _id;
  void _owner;
  const result: AnalysisSnapshot = {
    schema: 1,
    cutoff,
    project: p,
    references,
    sources: await Promise.all(
      ss.map(async ({ id, label, locator, text, reviewed, createdAt }) => ({
        id: await ref('source', id),
        label,
        locator,
        text,
        reviewed,
        createdAt,
      })),
    ),
    records: await Promise.all(
      rs.slice(0, 50).map(async ({ ownerId, projectId, versionId, ...record }) => {
        void ownerId;
        void projectId;
        void versionId;
        return { ...record, id: await ref('record', record.id) };
      }),
    ),
    controls: await Promise.all(
      cs.slice(0, 20).map(async ({ ownerId, projectId, versionId, ...control }) => {
        void ownerId;
        void projectId;
        void versionId;
        const data = { ...control.data };
        if ('deliveryId' in data && data.deliveryId)
          data.deliveryId = await ref('control', data.deliveryId);
        return {
          ...control,
          id: await ref('control', control.id),
          recordId: control.recordId ? await ref('record', control.recordId) : '',
          data,
        } as ProjectControlSnapshot;
      }),
    ),
    history: hs.slice(0, 2).map((h) => ({
      cutoff: h.cutoff,
      records: h.records.map((x) => ({ id: x.id, status: x.status })),
      controls: h.controls.map((x) => ({
        id: x.id,
        forecastDate: x.kind === 'milestone' ? x.data.forecastDate : '',
        forecast: x.kind === 'cost' ? x.data.forecast : null,
      })),
    })),
    coverage: {
      recordsTotal: rs.length,
      controlsTotal: cs.length,
      sourcesTotal: ss.length,
      historyTotal: hs.length,
      partial: false,
      policy: `stable-id; max 50 records, 20 controls, 2 prior cutoffs; 100 KB selected context; history after cutoff excluded${historyIncomplete ? '; history count is a lower bound (first 100 loaded)' : ''}`,
    },
  };
  // Preserve entire entries, not misleading excerpts of fields. Report every exclusion.
  while (
    new TextEncoder().encode(JSON.stringify(result)).length > 100000 &&
    (result.records.length || result.controls.length)
  ) {
    if (result.controls.length) result.controls.pop();
    else result.records.pop();
  }
  result.coverage.partial =
    result.records.length < rs.length ||
    result.controls.length < cs.length ||
    hs.length > 2 ||
    historyIncomplete;
  if (new TextEncoder().encode(JSON.stringify(result)).length > 100000)
    throw new AppError('context_limit');
  return result;
}
export function wireReviewContext(s: AnalysisSnapshot) {
  return {
    cutoff: s.cutoff,
    projectUpdatedAt: s.project.updatedAt,
    controls: s.controls,
    history: s.history,
    coverage: s.coverage,
  };
}

export function validSnapshot(value: unknown): value is AnalysisSnapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as AnalysisSnapshot;
  if (
    s.schema !== 1 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(s.cutoff) ||
    !s.project ||
    typeof s.project.name !== 'string' ||
    !s.coverage ||
    typeof s.coverage.partial !== 'boolean' ||
    !s.references ||
    !Array.isArray(s.history) ||
    s.history.length > 2
  )
    return false;
  const date = new Date(s.cutoff);
  if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== s.cutoff) return false;
  if (
    !Array.isArray(s.records) ||
    s.records.length > 50 ||
    !Array.isArray(s.controls) ||
    s.controls.length > 20 ||
    !Array.isArray(s.sources) ||
    s.sources.length > 20
  )
    return false;
  if (
    !s.records.every(
      (r) =>
        typeof r.id === 'string' &&
        typeof r.title === 'string' &&
        ['open', 'closed'].includes(r.status) &&
        ['action', 'decision', 'risk'].includes(r.kind),
    )
  )
    return false;
  if (
    !s.controls.every(
      (c) =>
        typeof c.id === 'string' &&
        typeof c.title === 'string' &&
        ['decision', 'change', 'milestone', 'cost', 'benefit'].includes(c.kind) &&
        c.data &&
        typeof c.data === 'object',
    )
  )
    return false;
  if (
    !s.sources.every(
      (x) => typeof x.text === 'string' && x.text.length <= 2000 && typeof x.label === 'string',
    )
  )
    return false;
  if (
    !['recordsTotal', 'controlsTotal', 'sourcesTotal', 'historyTotal'].every(
      (k) =>
        Number.isInteger(s.coverage[k as keyof typeof s.coverage]) &&
        Number(s.coverage[k as keyof typeof s.coverage]) >= 0,
    ) ||
    typeof s.coverage.policy !== 'string' ||
    s.coverage.policy.length > 250
  )
    return false;
  if (
    s.coverage.recordsTotal < s.records.length ||
    s.coverage.controlsTotal < s.controls.length ||
    s.coverage.sourcesTotal < s.sources.length ||
    s.coverage.historyTotal < s.history.length
  )
    return false;
  if (
    !s.history.every(
      (h) =>
        h &&
        typeof h.cutoff === 'string' &&
        h.cutoff < s.cutoff &&
        Array.isArray(h.records) &&
        h.records.length <= 50 &&
        h.records.every(
          (r) => r && /^record-[a-f0-9]{24}$/.test(r.id) && ['open', 'closed'].includes(r.status),
        ) &&
        Array.isArray(h.controls) &&
        h.controls.length <= 20 &&
        h.controls.every(
          (c) =>
            c &&
            /^control-[a-f0-9]{24}$/.test(c.id) &&
            typeof c.forecastDate === 'string' &&
            (c.forecast === null ||
              (typeof c.forecast === 'number' && Number.isFinite(c.forecast))),
        ),
    )
  )
    return false;
  if (
    !s.records.every((r) => /^record-[a-f0-9]{24}$/.test(r.id)) ||
    !s.controls.every((c) => /^control-[a-f0-9]{24}$/.test(c.id))
  )
    return false;
  try {
    for (const c of s.controls) validateControl(c);
  } catch {
    return false;
  }
  return Object.values(s.references).every(
    (x) =>
      x &&
      ['record', 'control', 'source'].includes(x.kind) &&
      typeof x.id === 'string' &&
      x.id.length <= 128,
  );
}
