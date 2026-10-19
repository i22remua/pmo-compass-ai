import {
  newControl,
  validControlDate,
  type ControlInput,
  type ProjectControl,
} from './project-controls';
import type { ProjectRecord } from '@/types';

export type InstructionKind =
  'action' | 'risk' | 'change' | 'decision' | 'milestone' | 'cost' | 'benefit';
export type InstructionArea = 'activity' | 'governance' | 'delivery' | 'benefits';
export type TrackingInput = Pick<
  ProjectRecord,
  'kind' | 'title' | 'status' | 'dueDate' | 'severity' | 'evidence'
>;
export type InstructionProposal =
  | { category: 'record'; input: TrackingInput; existing?: ProjectRecord }
  | {
      category: 'control';
      input: ControlInput;
      existing?: ProjectControl;
      requireDirection: boolean;
    };
export const instructionArea = (kind: InstructionKind): InstructionArea =>
  kind === 'action' || kind === 'risk'
    ? 'activity'
    : kind === 'change' || kind === 'decision'
      ? 'governance'
      : kind === 'benefit'
        ? 'benefits'
        : 'delivery';
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
const aliases: Record<string, string> = {
  titulo: 'title',
  title: 'title',
  fecha: 'dueDate',
  vencimiento: 'dueDate',
  due: 'dueDate',
  'due date': 'dueDate',
  severidad: 'severity',
  severity: 'severity',
  estado: 'status',
  status: 'status',
  motivo: 'reason',
  reason: 'reason',
  alternativas: 'alternatives',
  alternatives: 'alternatives',
  alcance: 'scopeImpact',
  'scope impact': 'scopeImpact',
  plazo: 'timeImpact',
  'time impact': 'timeImpact',
  'impacto coste': 'costImpact',
  'cost impact': 'costImpact',
  referencia: 'baseline',
  reference: 'baseline',
  'fecha base': 'baselineDate',
  'baseline date': 'baselineDate',
  prevision: 'forecastDate',
  forecast: 'forecastDate',
  finalizacion: 'actualDate',
  completion: 'actualDate',
  dependencia: 'dependency',
  dependency: 'dependency',
  objetivo: 'objective',
  objective: 'objective',
  unidad: 'unit',
  unit: 'unit',
  base: 'baseline',
  baseline: 'baseline',
  meta: 'target',
  target: 'target',
  medicion: 'actual',
  measurement: 'actual',
  'fecha medicion': 'measuredOn',
  'measurement date': 'measuredOn',
  direccion: 'direction',
  direction: 'direction',
  'coste real': 'actual',
  'actual cost': 'actual',
  presupuesto: 'approved',
  budget: 'approved',
  'prevision coste': 'forecast',
  'cost forecast': 'forecast',
  'fecha costes': 'asOf',
  'as of': 'asOf',
};
const allowed: Record<InstructionKind, string[]> = {
  action: ['title', 'dueDate', 'status'],
  risk: ['title', 'severity', 'status'],
  change: [
    'title',
    'reason',
    'alternatives',
    'scopeImpact',
    'timeImpact',
    'costImpact',
    'baseline',
  ],
  decision: ['title', 'reason', 'alternatives', 'baseline'],
  milestone: ['title', 'baselineDate', 'forecastDate', 'actualDate', 'dependency'],
  cost: ['title', 'approved', 'actual', 'forecast', 'asOf'],
  benefit: [
    'title',
    'objective',
    'unit',
    'baseline',
    'target',
    'actual',
    'measuredOn',
    'direction',
  ],
};
const headers: Record<string, InstructionKind> = {
  accion: 'action',
  action: 'action',
  riesgo: 'risk',
  risk: 'risk',
  cambio: 'change',
  change: 'change',
  decision: 'decision',
  hito: 'milestone',
  milestone: 'milestone',
  coste: 'cost',
  cost: 'cost',
  beneficio: 'benefit',
  benefit: 'benefit',
};
export class InstructionError extends Error {
  constructor(
    public reason:
      | 'instructionFormat'
      | 'instructionLimit'
      | 'instructionDate'
      | 'instructionNumber'
      | 'instructionBaseline',
  ) {
    super(reason);
  }
}

/** Bounded, bilingual key/value instructions. Unknown fields reject the entire proposal. */
export function parseProjectInstruction(
  kind: InstructionKind,
  source: string,
  existing?: ProjectRecord | ProjectControl,
): InstructionProposal {
  const fail = (reason: InstructionError['reason'] = 'instructionFormat'): never => {
    throw new InstructionError(reason);
  };
  if (!source.trim() || source.length > 2000) fail('instructionLimit');
  if (existing && existing.kind !== kind) fail();
  const tracking = kind === 'action' || kind === 'risk';
  const input: TrackingInput | ControlInput = tracking
    ? {
        kind,
        title: '',
        status: 'open',
        dueDate: '',
        severity: 'unspecified',
        evidence: '',
        ...(existing as ProjectRecord | undefined),
      }
    : ({
        ...newControl(kind),
        ...(existing as ProjectControl | undefined),
        data: { ...(existing && 'data' in existing ? existing.data : newControl(kind).data) },
      } as ControlInput);
  const parts = source
    .trim()
    .split(/[;\n]/)
    .map((part) => part.trim());
  if (parts.length > 20 || parts.some((part) => !part)) fail();
  const seen = new Set<string>();
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    const colon = part.indexOf(':');
    let key = '',
      value = '';
    if (colon >= 0) {
      const raw = normalize(part.slice(0, colon));
      const header = raw.replace(
        /^(?:anade(?:me)?|crea|registra|actualiza|add|create|update)(?: (?:un|una|el|la|a|an|the))? /,
        '',
      );
      if (index === 0 && headers[header]) {
        if (headers[header] !== kind) fail();
        key = 'title';
      } else key = aliases[raw] || '';
      value = part.slice(colon + 1).trim();
    } else if (
      index === 0 &&
      !existing &&
      !/^(?:borra|elimina|delete|remove|aprueba|approve)\b/i.test(part)
    ) {
      key = 'title';
      value = part;
    }
    if (!key || !value || !allowed[kind].includes(key) || seen.has(key)) fail();
    seen.add(key);
    let result: string | number = value;
    if (
      ['dueDate', 'baselineDate', 'forecastDate', 'actualDate', 'measuredOn', 'asOf'].includes(key)
    ) {
      if (!validControlDate(value, true)) fail('instructionDate');
      if (
        existing?.kind === 'milestone' &&
        key === 'baselineDate' &&
        existing.data.baselineDate !== value
      )
        fail('instructionBaseline');
    } else if (key === 'severity') {
      result =
        (
          {
            alta: 'high',
            high: 'high',
            media: 'medium',
            medium: 'medium',
            baja: 'low',
            low: 'low',
            unspecified: 'unspecified',
            'sin evaluar': 'unspecified',
          } as Record<string, string>
        )[normalize(value)] || fail();
    } else if (key === 'status') {
      result =
        (
          {
            abierta: 'open',
            abierto: 'open',
            open: 'open',
            cerrada: 'closed',
            cerrado: 'closed',
            closed: 'closed',
          } as Record<string, string>
        )[normalize(value)] || fail();
    } else if (key === 'direction') {
      result =
        (
          {
            aumentar: 'increase',
            increase: 'increase',
            disminuir: 'decrease',
            decrease: 'decrease',
            reducir: 'decrease',
          } as Record<string, string>
        )[normalize(value)] || fail();
    } else if (
      (kind === 'benefit' && ['baseline', 'target', 'actual'].includes(key)) ||
      (kind === 'cost' && ['approved', 'actual', 'forecast'].includes(key))
    ) {
      const number = kind === 'cost' ? value.replace(/\s*(EUR|€)$/i, '') : value;
      if (kind === 'cost' && !/(EUR|€)$/i.test(value)) fail('instructionNumber');
      if (!/^-?\d+(?:[.,]\d{1,2})?$/.test(number)) fail('instructionNumber');
      result = Number(number.replace(',', '.'));
      if (!Number.isFinite(result) || Math.abs(result) > 1e12 || (kind === 'cost' && result < 0))
        fail('instructionNumber');
    }
    if (key === 'title' || tracking) (input as unknown as Record<string, unknown>)[key] = result;
    else
      (input as ControlInput).data = {
        ...(input as ControlInput).data,
        [key]: result,
      } as ControlInput['data'];
  }
  if (input.title.length < 2 || input.title.length > (tracking ? 300 : 160)) fail();
  // Tracking has no version archive: retain its earlier evidence. Controls retain it in history.
  input.evidence =
    tracking && existing?.evidence ? `${existing.evidence}\n\n${source.trim()}` : source.trim();
  if (input.evidence.length > 2000) fail('instructionLimit');
  return tracking
    ? {
        category: 'record',
        input: input as TrackingInput,
        existing: existing as ProjectRecord | undefined,
      }
    : {
        category: 'control',
        input: input as ControlInput,
        existing: existing as ProjectControl | undefined,
        requireDirection: kind === 'benefit' && !existing && !seen.has('direction'),
      };
}
