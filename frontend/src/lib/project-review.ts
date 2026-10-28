import { validSnapshot } from './review-context';
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
    snapshot: analysis.snapshot,
    findings: analysis.reviewFindings,
    status: analysis.snapshot?.project.status || project.status,
    risks: analysis.snapshot
      ? analysis.snapshot.records
          .filter((r) => r.kind === 'risk')
          .map((r) => ({ id: r.id, title: r.title, source: 'provided' as const }))
      : analysis.risks.map((risk) => ({
          title: risk.risk,
          source: risk.source === 'provided' ? 'provided' : 'inferred',
        })),
    records: (
      analysis.snapshot?.records ||
      records.filter(
        (record) => record.projectId === project.id && record.ownerId === project.ownerId,
      )
    ).map(({ id, kind, title, status, dueDate, severity }) => ({
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
      (value.snapshot !== undefined && !validSnapshot(value.snapshot)) ||
      (value.findings !== undefined &&
        (!Array.isArray(value.findings) ||
          value.findings.length > 200 ||
          !value.findings.every(
            (f: import('@/types').ReviewFinding) =>
              typeof f.id === 'string' &&
              typeof f.title === 'string' &&
              ['deviation', 'contradiction', 'insufficient', 'hypothesis'].includes(
                f.classification,
              ) &&
              /^[a-f0-9]{64}$/.test(f.fingerprint) &&
              typeof f.rule === 'string' &&
              f.rule.length <= 60 &&
              f.version === 1 &&
              typeof f.question === 'string' &&
              typeof f.cutoff === 'string' &&
              Array.isArray(f.evidence) &&
              f.evidence.length <= 5 &&
              f.evidence.every(
                (e) =>
                  e &&
                  typeof e.reference === 'string' &&
                  typeof e.text === 'string' &&
                  e.text.length <= 4000,
              ),
          ))) ||
      (value.resolutions !== undefined &&
        (!Array.isArray(value.resolutions) ||
          value.resolutions.length > 200 ||
          !value.resolutions.every(
            (r: import('@/types').FindingResolution) =>
              r &&
              typeof r.findingId === 'string' &&
              /^[a-f0-9]{64}$/.test(r.fingerprint) &&
              ['pending', 'confirmed', 'dismissed'].includes(r.status) &&
              typeof r.reason === 'string' &&
              r.reason.length <= 2000,
          ))) ||
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
    risk.id || `${risk.source}:${risk.title.trim().toLowerCase()}`;
  const oldRisks = new Set(previous.risks.map(riskKey));
  const newRisks = new Set(current.risks.map(riskKey));
  const stableRisks = previous.risks.every((r) => r.id) && current.risks.every((r) => r.id);
  const risksAdded =
    sameLanguage || stableRisks ? current.risks.filter((risk) => !oldRisks.has(riskKey(risk))) : [];
  const risksAbsent =
    sameLanguage || stableRisks
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

/** Field comparisons use stable pseudonymous IDs, never translated finding titles. */
export function snapshotChanges(
  previous: import('./review-context').AnalysisSnapshot,
  current: import('./review-context').AnalysisSnapshot,
) {
  const rows: { reference: string; title: string; field: string; before: string; after: string }[] =
    [];
  const render = (v: unknown) => (v === undefined ? '∅' : JSON.stringify(v));
  for (const category of ['records', 'controls'] as const) {
    const old = new Map(previous[category].map((x) => [x.id, x]));
    for (const item of current[category]) {
      const before = old.get(item.id);
      if (!before) {
        rows.push({
          reference: item.id,
          title: item.title,
          field: 'added',
          before: '∅',
          after: item.title,
        });
        continue;
      }
      const flat = (x: typeof item): Record<string, unknown> =>
        'data' in x
          ? { title: x.title, ...x.data, evidence: x.evidence }
          : Object.fromEntries(
              Object.entries(x).filter(
                ([k]) => !['id', 'createdAt', 'updatedAt', 'revision'].includes(k),
              ),
            );
      const a = flat(before),
        b = flat(item);
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)]))
        if (render(a[key]) !== render(b[key]))
          rows.push({
            reference: item.id,
            title: item.title,
            field: key,
            before: render(a[key]),
            after: render(b[key]),
          });
      old.delete(item.id);
    }
    for (const item of old.values())
      rows.push({
        reference: item.id,
        title: item.title,
        field: current.coverage.partial ? 'outside-context' : 'removed',
        before: item.title,
        after: '∅',
      });
  }
  if (previous.project.status !== current.project.status)
    rows.push({
      reference: 'project',
      title: current.project.name,
      field: 'status',
      before: previous.project.status,
      after: current.project.status,
    });
  return rows;
}

export function committeeReport(
  review: import('@/types').ProjectReview,
  baseline: import('@/types').ProjectReview | undefined,
  selected: string[],
  language: import('@/types').Language,
) {
  const data = parseReview(review.payload),
    prior = baseline && parseReview(baseline.payload);
  if (!data?.snapshot) throw new Error('A complete saved review is required');
  const s = data.snapshot,
    es = language === 'es',
    say = (a: string, b: string) => (es ? a : b);
  const lines = [
    `# ${say('Revisión para comité', 'Committee review')}: ${s.project.name}`,
    `${say('Revisión', 'Review')}: ${review.id}`,
    `${say('Fecha de corte', 'Cutoff')}: ${s.cutoff}`,
    `${say('Motor: reglas deterministas; revisión humana necesaria.', 'Engine: deterministic rules; human review required.')}`,
    `\n## ${say('Cambios entre revisiones', 'Changes between reviews')}`,
  ];
  if (prior?.snapshot) {
    lines.push(`${say('Referencia', 'Baseline')}: ${baseline!.id}`);
    const changes = snapshotChanges(prior.snapshot, s);
    lines.push(
      ...changes.map((x) => `- ${x.title} · ${x.field}: ${x.before} → ${x.after} [${x.reference}]`),
    );
    if (!changes.length)
      lines.push(say('Sin diferencias registradas.', 'No recorded differences.'));
  } else
    lines.push(say('Sin referencia comparable seleccionada.', 'No comparable baseline selected.'));
  lines.push(`\n## ${say('Asuntos y preguntas seleccionados', 'Selected issues and questions')}`);
  for (const f of data.findings || [])
    if (selected.includes(f.id)) {
      const resolution = data.resolutions?.find(
        (r) => r.findingId === f.id && r.fingerprint === f.fingerprint,
      );
      lines.push(
        `\n### ${f.title}`,
        `${f.classification} · ${f.rule} v${f.version}`,
        f.explanation,
        `${say('Pregunta', 'Question')}: ${f.question}`,
        `${say('Resolución', 'Resolution')}: ${resolution?.status || 'pending'}${resolution ? ` — ${resolution.reason}` : ''}`,
        ...f.evidence.map((e) => `- [${e.reference}] ${e.text}`),
      );
      if (f.action) lines.push(f.action);
    }
  lines.push(`\n## ${say('Compromisos y decisiones', 'Commitments and decisions')}`);
  const linked = new Set(s.controls.filter((c) => c.kind === 'decision').map((c) => c.recordId));
  for (const r of s.records.filter((r) => r.kind !== 'risk' && !linked.has(r.id)))
    lines.push(
      `- [${r.id}] ${r.title} · ${r.status} · ${r.ownerRole || say('Responsable sin confirmar', 'Owner unconfirmed')} · ${r.dueDate || say('Sin fecha', 'No date')} · ${say('Criterio', 'Criterion')}: ${r.closureCriteria || '∅'} · ${say('Evidencia de cierre', 'Completion evidence')}: ${r.completionEvidence || '∅'}`,
    );
  for (const c of s.controls)
    if (c.kind === 'decision' || c.kind === 'change')
      lines.push(
        `- [${c.id}] ${c.title} · ${c.data.status} · ${c.data.requiredRole || '∅'} · ${c.data.dueDate || '∅'} · ${say('Entrega vinculada', 'Linked delivery')}: ${c.data.deliveryId || '∅'} · ${c.evidence}`,
      );
  lines.push(
    `\n## ${say('Cobertura y límites', 'Coverage and limits')}`,
    JSON.stringify(s.coverage),
    `${s.records.length}/${s.coverage.recordsTotal} records; ${s.controls.length}/${s.coverage.controlsTotal} controls; ${s.sources.length}/${s.coverage.sourcesTotal} sources; ${s.history.length}/${s.coverage.historyTotal} prior reviews.`,
    say(
      'Datos declarados por el usuario; no auditoría certificada. Ausencia no equivale a cierre. Un documento generado no acredita por sí solo un hecho.',
      'User-reported data; not a certified audit. Absence is not closure. A generated document does not itself establish a fact.',
    ),
  );
  lines.push(
    `\n## ${say('Fuentes conservadas', 'Retained sources')}`,
    ...s.sources.map((x) => `- [${x.id}] ${x.label} · ${x.locator}: ${x.text}`),
  );
  return lines.join('\n');
}
