import type { Project, ProjectRecord } from '@/types';
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function pmoMetrics(projects: Project[], records: ProjectRecord[], today = localDate()) {
  const ids = new Set(projects.filter((p) => !p.deleting).map((p) => p.id));
  const open = records.filter((r) => ids.has(r.projectId) && r.status === 'open');
  return {
    riskProjects: projects.filter((p) => !p.deleting && p.status === 'at_risk'),
    overdue: open.filter(
      (r) =>
        r.kind === 'action' &&
        /^\d{4}-\d{2}-\d{2}$/.test(r.dueDate) &&
        Number.isFinite(Date.parse(r.dueDate)) &&
        new Date(r.dueDate).toISOString().slice(0, 10) === r.dueDate &&
        r.dueDate < today,
    ),
    decisions: open.filter((r) => r.kind === 'decision'),
    highRisks: open.filter((r) => r.kind === 'risk' && r.severity === 'high'),
  };
}
