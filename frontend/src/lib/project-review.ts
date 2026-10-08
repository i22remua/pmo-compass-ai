import type {
  Project,
  ProjectIntelligence,
  ProjectRecord,
  ProjectSource,
  ReviewData,
} from '@/types';

export function reviewData(
  project: Project,
  analysis: ProjectIntelligence,
  records: ProjectRecord[],
): ReviewData {
  return {
    status: project.status,
    risks: analysis.risks.map((risk) => ({
      title: risk.risk,
      source: risk.source === 'provided' ? 'provided' : 'inferred',
    })),
    records: records
      .filter((record) => record.projectId === project.id && record.ownerId === project.ownerId)
      .map(({ id, kind, title, status, dueDate, severity }) => ({
        id,
        kind,
        title,
        status,
        dueDate,
        severity,
      })),
  };
}

export function parseReview(payload: string): ReviewData | null {
  try {
    if (payload.length > 180000) return null;
    const value = JSON.parse(payload);
    if (
      !['planning', 'active', 'at_risk', 'completed'].includes(value.status) ||
      !Array.isArray(value.risks) ||
      value.risks.length > 50 ||
      !Array.isArray(value.records) ||
      value.records.length > 200
    )
      return null;
    if (
      !value.risks.every(
        (risk: ReviewData['risks'][number]) =>
          typeof risk?.title === 'string' &&
          risk.title.length <= 4000 &&
          ['provided', 'inferred'].includes(risk.source),
      )
    )
      return null;
    if (
      !value.records.every(
        (record: ReviewData['records'][number]) =>
          typeof record?.id === 'string' &&
          record.id.length <= 128 &&
          typeof record.title === 'string' &&
          record.title.length <= 300 &&
          ['action', 'decision', 'risk'].includes(record.kind) &&
          ['open', 'closed'].includes(record.status) &&
          typeof record.dueDate === 'string' &&
          record.dueDate.length <= 10 &&
          ['unspecified', 'low', 'medium', 'high'].includes(record.severity),
      )
    )
      return null;
    return value as ReviewData;
  } catch {
    return null;
  }
}

export async function reviewContextKey(
  project: Project,
  sources: ProjectSource[],
  records: ProjectRecord[],
) {
  const byId = <T extends { id: string }>(items: T[]) =>
    [...items].sort((a, b) => a.id.localeCompare(b.id));
  const context = JSON.stringify({
    project,
    sources: byId(sources.filter((item) => item.projectId === project.id)),
    records: byId(records.filter((item) => item.projectId === project.id)),
  });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(context));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function reviewChanges(previous: ReviewData, current: ReviewData, sameLanguage: boolean) {
  const oldRecords = new Map(previous.records.map((record) => [record.id, record]));
  const currentIds = new Set(current.records.map((record) => record.id));
  const added = current.records.filter((record) => !oldRecords.has(record.id));
  const closed = current.records.filter(
    (record) => oldRecords.get(record.id)?.status === 'open' && record.status === 'closed',
  );
  const reopened = current.records.filter(
    (record) => oldRecords.get(record.id)?.status === 'closed' && record.status === 'open',
  );
  const updated = current.records.filter((record) => {
    const old = oldRecords.get(record.id);
    return (
      old &&
      ['title', 'dueDate', 'severity', 'kind'].some(
        (key) => old[key as keyof typeof old] !== record[key as keyof typeof record],
      )
    );
  });
  const removed = previous.records.filter((record) => !currentIds.has(record.id));
  const pending = current.records.filter(
    (record) =>
      record.kind === 'decision' &&
      record.status === 'open' &&
      oldRecords.get(record.id)?.status === 'open' &&
      oldRecords.get(record.id)?.kind === 'decision',
  );
  const riskKey = (risk: ReviewData['risks'][number]) =>
    `${risk.source}:${risk.title.trim().toLowerCase()}`;
  const oldRisks = new Set(previous.risks.map(riskKey));
  const newRisks = new Set(current.risks.map(riskKey));
  const risksAdded = sameLanguage
    ? current.risks.filter((risk) => !oldRisks.has(riskKey(risk)))
    : [];
  const risksAbsent = sameLanguage
    ? previous.risks.filter((risk) => !newRisks.has(riskKey(risk)))
    : [];
  return {
    added,
    closed,
    reopened,
    updated,
    removed,
    pending,
    risksAdded,
    risksAbsent,
    statusChanged: previous.status !== current.status,
  };
}
