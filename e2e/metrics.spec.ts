import { test, expect } from '@playwright/test';
import { localDate, pmoMetrics, portfolioReview } from '../frontend/src/lib/pmo-metrics';
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

test('attention is ordered by real deadlines, preserves coverage and never counts an AI proposal', () => {
  const projects = [
    { id: 'quiet', status: 'active', updatedAt: '2026-09-28' },
    { id: 'done', status: 'completed', updatedAt: '2026-09-29' },
    { id: 'flagged', status: 'at_risk', updatedAt: '2026-09-25' },
    {
      id: 'work',
      status: 'at_risk',
      updatedAt: '2026-09-24',
      notes: 'Proposed high risk and urgent action',
    },
    { id: 'deleting', status: 'at_risk', deleting: true, updatedAt: '2026-09-30' },
  ] as Project[];
  const record = (id: string, overrides = {}) =>
    ({
      id,
      projectId: 'work',
      kind: 'action',
      status: 'open',
      dueDate: '',
      severity: 'unspecified',
      createdAt: '2026-09-25',
      ...overrides,
    }) as ProjectRecord;
  const records = [
    record('recent-deadline', { dueDate: '2026-09-27' }),
    record('oldest-deadline', { dueDate: '2026-09-20' }),
    record('decision-new', { kind: 'decision', createdAt: '2026-09-27' }),
    record('decision-old', { kind: 'decision', createdAt: '2026-09-21' }),
    record('risk', { kind: 'risk', severity: 'high' }),
    record('invalid-date', { dueDate: '2026-02-30' }),
    record('unknown-date'),
    record('unknown-risk', { kind: 'risk' }),
    record('closed', { kind: 'decision', status: 'closed' }),
    record('orphan', { projectId: 'missing', kind: 'decision' }),
    record('deleted', { projectId: 'deleting', dueDate: '2020-01-01' }),
    record('today', { dueDate: '2026-09-28' }),
  ];
  const before = JSON.stringify({ projects, records });
  const result = portfolioReview(projects, records, '2026-09-28');
  expect(result.queue.map((item) => item.record?.id || item.project.id)).toEqual([
    'oldest-deadline',
    'recent-deadline',
    'risk',
    'decision-old',
    'decision-new',
    'flagged',
  ]);
  expect(result.sortedProjects.map((p) => p.id)).toEqual(['work', 'flagged', 'quiet', 'done']);
  expect(result.metrics.riskProjects).toHaveLength(2);
  expect(result.coverage).toEqual({ riskProjects: 4, overdue: 5, highRisks: 2, decisions: 3 });
  expect(result.missingDates).toBe(2);
  expect(result.unassessedRisks).toBe(1);
  expect(JSON.stringify({ projects, records })).toBe(before);
  const noRecords = portfolioReview(projects, [], '2026-09-28');
  expect(noRecords.metrics.highRisks).toHaveLength(0);
  expect(noRecords.coverage.highRisks).toBe(0);
  const closedOnly = portfolioReview(projects, [
    record('closed-risk', { kind: 'risk', status: 'closed', severity: 'high' }),
  ]);
  expect(closedOnly.metrics.highRisks).toHaveLength(0);
  expect(closedOnly.coverage.highRisks).toBe(1);
});
