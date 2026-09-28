import { test, expect } from '@playwright/test';
import { localDate, pmoMetrics } from '../frontend/src/lib/pmo-metrics';
import type { Project, ProjectRecord } from '../frontend/src/types';

test('PMO counts exclude proposals, closed records, invalid dates and deleted parents', () => {
  const projects = [
    { id: 'p', status: 'at_risk' },
    { id: 'deleted', status: 'at_risk', deleting: true },
  ] as Project[];
  const record = (id: string, overrides = {}) =>
    ({
      id,
      projectId: 'p',
      status: 'open',
      kind: 'action',
      dueDate: '',
      severity: 'unspecified',
      ...overrides,
    }) as ProjectRecord;
  const records = [
    record('overdue', { dueDate: '2026-09-27' }),
    record('today', { dueDate: '2026-09-28' }),
    record('future', { dueDate: '2026-09-29' }),
    record('closed', { dueDate: '2026-09-27', status: 'closed' }),
    record('invalid', { dueDate: '2026-02-30' }),
    record('missing'),
    record('deleted', { projectId: 'deleted', dueDate: '2026-01-01' }),
    record('orphan', { projectId: 'absent', kind: 'decision' }),
    record('decision', { kind: 'decision' }),
    record('high', { kind: 'risk', severity: 'high' }),
    record('unevaluated', { kind: 'risk' }),
    record('resolved', { kind: 'risk', severity: 'high', status: 'closed' }),
  ];
  const metrics = pmoMetrics(projects, records, '2026-09-28');
  expect(metrics.riskProjects.map((p) => p.id)).toEqual(['p']);
  expect(metrics.overdue.map((r) => r.id)).toEqual(['overdue']);
  expect(metrics.decisions.map((r) => r.id)).toEqual(['decision']);
  expect(metrics.highRisks.map((r) => r.id)).toEqual(['high']);
  expect(pmoMetrics(projects, [], '2026-09-28').highRisks).toEqual([]);
  expect(localDate(new Date(2026, 8, 28, 0, 1))).toBe('2026-09-28');
});
