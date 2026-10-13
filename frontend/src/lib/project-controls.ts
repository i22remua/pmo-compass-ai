import { AppError } from './errors';

export type ControlKind = 'change' | 'decision' | 'milestone' | 'cost' | 'benefit';
export type DecisionStatus = 'proposed' | 'reviewed' | 'accepted' | 'rejected';
export interface DecisionData {
  status: DecisionStatus;
  reason: string;
  alternatives: string;
  scopeImpact: string;
  timeImpact: string;
  costImpact: string;
  baseline: string;
  resolution: string;
  decidedOn: string;
  decisionRole: string;
}
export interface MilestoneData {
  baselineDate: string;
  forecastDate: string;
  actualDate: string;
  dependency: string;
}
export interface CostData {
  approved: number | null;
  actual: number | null;
  forecast: number | null;
  asOf: string;
}
export interface BenefitData {
  objective: string;
  unit: string;
  baseline: number | null;
  target: number | null;
  actual: number | null;
  measuredOn: string;
  direction: 'increase' | 'decrease';
}
export type ControlInput = {
  title: string;
  evidence: string;
  recordId: string;
  archived: boolean;
} & (
  | { kind: 'change' | 'decision'; data: DecisionData }
  | { kind: 'milestone'; data: MilestoneData }
  | { kind: 'cost'; data: CostData }
  | { kind: 'benefit'; data: BenefitData }
);
export type ProjectControl = ControlInput & {
  id: string;
  ownerId: string;
  projectId: string;
  revision: number;
  versionId: string;
  createdAt: string;
  updatedAt: string;
};
export function newControl(kind: ControlKind): ControlInput {
  const base = { title: '', evidence: '', recordId: '', archived: false };
  if (kind === 'milestone')
    return {
      ...base,
      kind,
      data: { baselineDate: '', forecastDate: '', actualDate: '', dependency: '' },
    };
  if (kind === 'cost')
    return { ...base, kind, data: { approved: null, actual: null, forecast: null, asOf: '' } };
  if (kind === 'benefit')
    return {
      ...base,
      kind,
      data: {
        objective: '',
        unit: '',
        baseline: null,
        target: null,
        actual: null,
        measuredOn: '',
        direction: 'increase',
      },
    };
  return {
    ...base,
    kind,
    data: {
      status: 'proposed',
      reason: '',
      alternatives: '',
      scopeImpact: '',
      timeImpact: '',
      costImpact: '',
      baseline: '',
      resolution: '',
      decidedOn: '',
      decisionRole: '',
    },
  };
}
const text = (v: unknown, max: number, min = 0): v is string =>
  typeof v === 'string' && v.trim().length >= min && v.length <= max;
export function validControlDate(value: unknown, required = false): value is string {
  return (
    typeof value === 'string' &&
    ((!required && value === '') ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value))
  );
}
const amount = (v: unknown, signed = false) =>
  v === null ||
  (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e12 && (signed || v >= 0));
export function validateControl(input: ControlInput, previous?: ProjectControl) {
  const expected = newControl(input.kind);
  if (
    !['change', 'decision', 'milestone', 'cost', 'benefit'].includes(input.kind) ||
    !text(input.title, 160, 2) ||
    !text(input.evidence, 2000) ||
    !text(input.recordId, 128) ||
    typeof input.archived !== 'boolean' ||
    !input.data ||
    Object.keys(input.data).sort().join() !== Object.keys(expected.data).sort().join()
  )
    throw new AppError('validation_error');
  if (previous && previous.kind !== input.kind) throw new AppError('validation_error');
  const invalid = () => {
    throw new AppError('validation_error');
  };
  if (input.kind === 'milestone') {
    const d = input.data;
    if (
      !validControlDate(d.baselineDate, true) ||
      !validControlDate(d.forecastDate) ||
      !validControlDate(d.actualDate) ||
      !text(d.dependency, 1000)
    )
      invalid();
    // A baseline is retained. Forecast changes and actual completion have separate fields.
    if (previous?.kind === 'milestone' && previous.data.baselineDate !== d.baselineDate) invalid();
  } else if (input.kind === 'cost') {
    const d = input.data;
    if (
      ![d.approved, d.actual, d.forecast].every((v) => amount(v)) ||
      !validControlDate(d.asOf, true) ||
      (d.actual !== null && !text(input.evidence, 2000, 1))
    )
      invalid();
  } else if (input.kind === 'benefit') {
    const d = input.data;
    if (
      !text(d.objective, 1000, 2) ||
      !text(d.unit, 80, 1) ||
      ![d.baseline, d.target, d.actual].every((v) => amount(v, true)) ||
      !['increase', 'decrease'].includes(d.direction) ||
      !validControlDate(d.measuredOn, d.actual !== null) ||
      (d.actual === null && d.measuredOn !== '') ||
      (d.actual !== null && !text(input.evidence, 2000, 1))
    )
      invalid();
  } else {
    const d = input.data;
    if (
      !['proposed', 'reviewed', 'accepted', 'rejected'].includes(d.status) ||
      ![
        'reason',
        'alternatives',
        'scopeImpact',
        'timeImpact',
        'costImpact',
        'baseline',
        'resolution',
        'decisionRole',
      ].every((key) => text(d[key as keyof DecisionData], key === 'decisionRole' ? 120 : 2000)) ||
      !text(d.reason, 2000, 2) ||
      !validControlDate(d.decidedOn)
    )
      invalid();
    if (d.status !== 'proposed' && !text(d.alternatives, 2000, 2)) invalid();
    const resolved = ['accepted', 'rejected'].includes(d.status);
    if (
      resolved &&
      (!validControlDate(d.decidedOn, true) ||
        !text(d.resolution, 2000, 2) ||
        !text(d.decisionRole, 120, 2) ||
        !text(input.evidence, 2000, 1))
    )
      invalid();
    if (!resolved && (d.decidedOn || d.resolution || d.decisionRole)) invalid();
    const old =
      previous && (previous.kind === 'change' || previous.kind === 'decision')
        ? previous.data.status
        : undefined;
    if (
      (!old && d.status !== 'proposed') ||
      (old === 'proposed' && !['proposed', 'reviewed'].includes(d.status)) ||
      (old === 'reviewed' && !['reviewed', 'accepted', 'rejected'].includes(d.status)) ||
      (old && ['accepted', 'rejected'].includes(old) && d.status !== old)
    )
      invalid();
  }
}
/** Whole calendar days in UTC; positive means later than baseline. No inferred dates. */
export function milestoneVariance(data: MilestoneData): number | null {
  const date = data.actualDate || data.forecastDate;
  return validControlDate(date, true) && validControlDate(data.baselineDate, true)
    ? Math.round((Date.parse(date) - Date.parse(data.baselineDate)) / 86400000)
    : null;
}
export function difference(value: number | null, baseline: number | null): number | null {
  return value === null || baseline === null ? null : Math.round((value - baseline) * 1e6) / 1e6;
}
export function benefitResult(data: BenefitData): 'unknown' | 'achieved' | 'pending' {
  if (data.actual === null || data.target === null || !validControlDate(data.measuredOn, true))
    return 'unknown';
  return (data.direction === 'increase' ? data.actual >= data.target : data.actual <= data.target)
    ? 'achieved'
    : 'pending';
}
