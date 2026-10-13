import { validateControl, type ControlInput } from './project-controls';

export type CostField = 'actual' | 'forecast' | 'approved';
export type CostLine = { label: string; cents: number };
export type CostParseResult =
  | { ok: true; lines: CostLine[]; total: number; source: string }
  | { ok: false; reason: 'format' | 'currency' | 'limit' | 'duplicateLine' };

/** Deliberately bounded extraction, not a language model. Never accepts a partial list. */
export function parseCostInstruction(source: string): CostParseResult {
  const fail = (reason: Extract<CostParseResult, { ok: false }>['reason']): CostParseResult => ({
    ok: false,
    reason,
  });
  if (!source.trim() || source.length > 2000) return fail('limit');
  if (/[$£¥]|\b(?:USD|GBP|JPY|CAD|AUD|CHF|dollars?|d[oó]lares|libras)\b/i.test(source))
    return fail('currency');
  const body = source
    .trim()
    .replace(
      /^(?:a[nñ][aá]deme estos costes|a[nñ]ade(?: estos)? costes|add(?: these)? costs|costes|costs)\s*:\s*/i,
      '',
    );
  const rows = body.split(/\r?\n|;|,\s+(?=[\p{L}])/u).map((row) => row.trim());
  if (rows.length > 20) return fail('limit');
  const lines: CostLine[] = [];
  for (const row of rows) {
    const match = row.match(
      /^([\p{L}][\p{L}\p{N} ()/&_-]{1,119}?)\s*[:\t ]\s*([0-9][0-9.,]*)\s*(EUR|€)$/iu,
    );
    if (!match) return fail('format');
    const raw = match[2];
    let decimal: string;
    if (/^\d+(?:[.,]\d{1,2})?$/.test(raw)) decimal = raw.replace(',', '.');
    else if (/^\d{1,3}(?:\.\d{3})+,\d{2}$/.test(raw))
      decimal = raw.replaceAll('.', '').replace(',', '.');
    else if (/^\d{1,3}(?:,\d{3})+\.\d{2}$/.test(raw)) decimal = raw.replaceAll(',', '');
    else return fail('format'); // e.g. 1,000 is ambiguous; require 1000 or 1,000.00.
    const cents = Math.round(Number(decimal) * 100);
    if (!Number.isSafeInteger(cents) || cents > 1e14) return fail('limit');
    const label = match[1].trim();
    if (lines.some((line) => line.label.toLocaleLowerCase() === label.toLocaleLowerCase()))
      return fail('duplicateLine');
    lines.push({ label, cents });
  }
  const cents = lines.reduce((sum, line) => sum + line.cents, 0);
  if (!Number.isSafeInteger(cents) || cents > 1e14) return fail('limit');
  return { ok: true, lines, total: cents / 100, source: source.trim() };
}

export function costInstructionDraft(
  source: string,
  title: string,
  field: CostField,
  asOf: string,
): ControlInput {
  const parsed = parseCostInstruction(source);
  if (!parsed.ok || !['actual', 'forecast', 'approved'].includes(field))
    throw new Error('Invalid cost instruction');
  const draft: ControlInput = {
    kind: 'cost',
    title,
    evidence: parsed.source,
    recordId: '',
    archived: false,
    data: { approved: null, actual: null, forecast: null, asOf, [field]: parsed.total },
  };
  validateControl(draft);
  return draft;
}

/** Same project/date/field/breakdown produces one record, even after a retry or reload. */
export async function costInstructionId(
  projectId: string,
  source: string,
  field: CostField,
  asOf: string,
) {
  const parsed = parseCostInstruction(source);
  if (!parsed.ok) throw new Error('Invalid cost instruction');
  const lines = parsed.lines
    .map(({ label, cents }) => [label.toLowerCase().replace(/\s+/g, ' '), cents])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'en'));
  const bytes = new TextEncoder().encode(JSON.stringify([projectId, field, asOf, lines]));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return `cost-${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')}`;
}
