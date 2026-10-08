import type { Project, ProjectRecord } from '@/types';
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function pmoMetrics(projects: Project[], records: ProjectRecord[], today = localDate()) {
  const ids = new Set(projects.filter((p) => !p.deleting).map((p) => p.id));
  const open = records.filter((r) => ids.has(r.projectId) && r.status === 'open');
  return {
    riskProjects: projects.filter((p) => !p.deleting && p.status === 'at_risk'),
    overdue: open.filter((r) => r.kind === 'action' && validDate(r.dueDate) && r.dueDate < today),
    decisions: open.filter((r) => r.kind === 'decision'),
    highRisks: open.filter((r) => r.kind === 'risk' && r.severity === 'high'),
  };
}

export type AttentionKind = keyof ReturnType<typeof pmoMetrics>;
export type AttentionItem = {
  kind: AttentionKind;
  project: Project;
  record?: ProjectRecord;
};

function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

export function portfolioReview(
  projects: Project[],
  records: ProjectRecord[],
  today = localDate(),
) {
  const available = projects.filter((project) => !project.deleting);
  const byId = new Map(available.map((project) => [project.id, project]));
  const saved = records.filter((record) => byId.has(record.projectId));
  const metrics = pmoMetrics(available, saved, today);
  const chronological = (a: ProjectRecord, b: ProjectRecord) =>
    (a.createdAt || '').localeCompare(b.createdAt || '') || a.id.localeCompare(b.id);
  const queue: AttentionItem[] = [];
  // Explicit review order, not an AI severity score. Oldest overdue deadline first.
  for (const kind of ['overdue', 'highRisks', 'decisions'] as const) {
    const sorted = [...metrics[kind]].sort(
      (a, b) =>
        (kind === 'overdue' ? a.dueDate.localeCompare(b.dueDate) : 0) || chronological(a, b),
    );
    for (const record of sorted) queue.push({ kind, project: byId.get(record.projectId)!, record });
  }
  const represented = new Set(queue.map((item) => item.project.id));
  for (const project of metrics.riskProjects) {
    if (!represented.has(project.id)) queue.push({ kind: 'riskProjects', project });
  }
  const order = new Map<string, number>();
  queue.forEach((item, index) => {
    if (!order.has(item.project.id)) order.set(item.project.id, index);
  });
  const sortedProjects = [...available].sort(
    (a, b) =>
      (order.get(a.id) ?? queue.length) - (order.get(b.id) ?? queue.length) ||
      Number(a.status === 'completed') - Number(b.status === 'completed') ||
      b.updatedAt.localeCompare(a.updatedAt) ||
      a.id.localeCompare(b.id),
  );
  const coverage = {
    riskProjects: available.length,
    overdue: saved.filter((record) => record.kind === 'action').length,
    highRisks: saved.filter((record) => record.kind === 'risk').length,
    decisions: saved.filter((record) => record.kind === 'decision').length,
  };
  return {
    metrics,
    queue,
    sortedProjects,
    coverage,
    missingDates: saved.filter(
      (r) => r.kind === 'action' && r.status === 'open' && !validDate(r.dueDate),
    ).length,
    unassessedRisks: saved.filter(
      (r) => r.kind === 'risk' && r.status === 'open' && r.severity === 'unspecified',
    ).length,
  };
}
