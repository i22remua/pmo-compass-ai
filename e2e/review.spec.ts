import committeeCase from '../frontend/src/lib/committee-case.json';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { parseReview, reviewChanges } from '../frontend/src/lib/project-review';
import type { ReviewData } from '../frontend/src/types';

const record = (
  id: string,
  changes: Partial<ReviewData['records'][number]> = {},
): ReviewData['records'][number] => ({
  id,
  kind: 'action',
  title: id,
  status: 'open',
  dueDate: '',
  severity: 'unspecified',
  ...changes,
});
const snapshot = (records: ReviewData['records'], risks: ReviewData['risks'] = []): ReviewData => ({
  status: 'active',
  records,
  risks,
});

test('review changes distinguish closure, deletion, reopening and pending decisions', () => {
  const before = snapshot([
    record('close'),
    record('reopen', { status: 'closed' }),
    record('edit'),
    record('remove'),
    record('pending', { kind: 'decision' }),
  ]);
  const after = snapshot([
    record('close', { status: 'closed' }),
    record('reopen'),
    record('edit', { dueDate: '2026-12-01', severity: 'high' }),
    record('new'),
    record('pending', { kind: 'decision' }),
  ]);
  const result = reviewChanges(before, after, true);
  for (const [key, id] of [
    ['closed', 'close'],
    ['reopened', 'reopen'],
    ['updated', 'edit'],
    ['removed', 'remove'],
    ['added', 'new'],
    ['pending', 'pending'],
  ] as const) {
    expect(result[key].map((item) => item.id)).toEqual([id]);
  }
  expect(result.statusChanged).toBe(false);
  expect(before.records[0].status).toBe('open');
});

test('risk comparison preserves attribution, never treats absence as closure, and respects language', () => {
  const before = snapshot(
    [],
    [
      { title: 'Migration', source: 'inferred' },
      { title: 'Supplier', source: 'provided' },
    ],
  );
  const after = snapshot([], [{ title: 'migration', source: 'provided' }]);
  expect(reviewChanges(before, after, true)).toMatchObject({
    closed: [],
    risksAbsent: before.risks,
    risksAdded: after.risks,
  });
  expect(reviewChanges(before, after, false)).toMatchObject({ risksAbsent: [], risksAdded: [] });
  expect(
    reviewChanges(before, snapshot([], [{ title: ' MIGRATION ', source: 'inferred' }]), true)
      .risksAdded,
  ).toEqual([]);
});

test('invalid and oversized review payloads fail closed', () => {
  const good = snapshot([record('valid')]);
  expect(parseReview(JSON.stringify(good))).toEqual(good);
  for (const value of [
    null,
    {},
    { ...good, status: 'approved' },
    { ...good, records: [null] },
    { ...good, records: [record('bad', { severity: 'invented' as 'high' })] },
    { ...good, records: Array(201).fill(record('many')) },
    { ...good, risks: Array(51).fill({ title: 'risk', source: 'inferred' }) },
  ]) {
    expect(parseReview(JSON.stringify(value))).toBeNull();
  }
  expect(parseReview('not-json')).toBeNull();
  expect(parseReview(' '.repeat(180001))).toBeNull();
});

test('saved reviews preserve snapshots, closures, conflict protection, export and deletion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/start');
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click();
  await page.getByLabel('Nombre del proyecto', { exact: true }).fill('Revisión industrial');
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await page.locator('.project-card').filter({ hasText: 'Revisión industrial' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  const projectURL = page.url();
  const stored = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem(`pmo.workspace.v1.${localStorage.getItem('pmo.demo.uid')}`)!),
    );
  await page.getByRole('tab', { name: 'Seguimiento', exact: true }).click();
  for (const [kind, title] of [
    ['action', 'Validar migración'],
    ['decision', 'Aprobar alcance'],
  ]) {
    await page.getByRole('button', { name: 'Registrar elemento' }).click();
    await page.getByLabel('Tipo de registro').selectOption(kind);
    await page.getByLabel('Asunto', { exact: true }).fill(title);
    await page.getByRole('button', { name: 'Guardar registro' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  const review = page.locator('.committee-review');
  await review.getByRole('button', { name: 'Guardar revisión', exact: true }).click();
  await expect(review.getByRole('button', { name: 'Descargar agenda' })).toBeVisible();
  const baseline = (await stored()).reviewHistory[0];
  await review.getByLabel('Revisión guardada').selectOption('');
  await review.getByRole('button', { name: 'Guardar revisión', exact: true }).click();
  await expect(review.getByRole('button', { name: 'Descargar agenda' })).toBeVisible();
  expect((await stored()).reviewHistory).toHaveLength(1);
  expect(JSON.parse(baseline.payload).snapshot.records).toHaveLength(2);
  await page.getByRole('tab', { name: 'Seguimiento', exact: true }).click();
  await page
    .locator('.tracking-record')
    .filter({ hasText: 'Validar migración' })
    .getByRole('button', { name: 'Cerrar elemento' })
    .click();
  await page.reload();
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  await review.getByLabel('Comparar con').selectOption(baseline.id);
  await expect(review).toContainText('open');
  await expect(review).toContainText('closed');
  await review.getByRole('button', { name: 'Guardar revisión', exact: true }).click();
  await expect.poll(async () => (await stored()).reviewHistory.length).toBe(2);
  expect((await stored()).reviewHistory.find((x: { id: string }) => x.id === baseline.id)).toEqual(
    baseline,
  );
  expect((await stored()).recordVersions).toHaveLength(3);
  await review.getByLabel('Revisión guardada').selectOption('');
  // Different context and stale head simulate another writer without making a valid idempotent retry fail.
  await review.getByLabel('Fecha de corte').fill('2099-01-01');
  await expect(review.getByRole('button', { name: 'Guardar revisión', exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const key = `pmo.workspace.v1.${localStorage.getItem('pmo.demo.uid')}`;
    const data = JSON.parse(localStorage.getItem(key)!);
    data.reviews[0].updatedAt = '2098-01-01T00:00:00.000Z';
    localStorage.setItem(key, JSON.stringify(data));
  });
  await review.getByRole('button', { name: 'Guardar revisión', exact: true }).click();
  await expect(review).toContainText('La referencia cambió en otra sesión');
  expect((await stored()).reviewHistory).toHaveLength(2);
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ['light', 'dark']) {
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem('pmo.theme', theme);
    }, theme);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
  }
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(
    review.getByRole('heading', { name: 'Committee review', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'ES', exact: true }).click();
  await page.goto('/settings');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar mis datos', exact: true }).click();
  const exported = JSON.parse(await readFile((await (await downloading).path())!, 'utf8'));
  expect((exported.workspace || exported).reviewHistory).toHaveLength(2);
  await page.goto(projectURL);
  await page.getByRole('button', { name: 'Eliminar proyecto', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  for (const key of [
    'reviews',
    'reviewHistory',
    'recordVersions',
    'findingStates',
    'findingVersions',
  ])
    expect((await stored())[key]).toEqual([]);
});

test('fictional three-review case shows dated deterioration, resolutions, reappearance and reproducible committee agenda', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/start');
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click();
  await page.locator('.starter-options > summary').click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Caso de comité · 3 revisiones ficticias', exact: true })
    .click();
  await expect(page).toHaveURL(/projects\/committee-case\?review=latest/);
  const panel = page.locator('.committee-review');
  const stored = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem(`pmo.workspace.v1.${localStorage.getItem('pmo.demo.uid')}`)!),
    );
  await expect(panel.getByLabel('Revisión guardada').locator('option')).toHaveCount(4);
  const history = (await stored()).reviewHistory;
  await panel.getByLabel('Comparar con').selectOption(history[0].id);
  await expect(panel).toContainText('2026-03-10');
  await expect(panel).toContainText('2026-03-14');
  if (await panel.getByRole('button', { name: /Ver todos los hallazgos/ }).isVisible())
    await panel.getByRole('button', { name: /Ver todos los hallazgos/ }).click();
  const slips = panel
    .locator('.committee-finding')
    .filter({ hasText: 'Dos desplazamientos consecutivos' });
  await slips.getByText('Ver evidencia', { exact: true }).click();
  await expect(slips).toContainText('2026-03-01');
  await expect(slips).toContainText('2026-03-08');
  const cost = panel
    .locator('.committee-finding')
    .filter({ hasText: 'Previsión superior al presupuesto comparable' });
  await cost.getByText('Ver evidencia', { exact: true }).click();
  await expect(cost).toContainText('300');
  await expect(panel).toContainText('Cierre declarado sin evidencia');
  const downloadPromise = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Descargar agenda', exact: true }).click();
  const text = await readFile((await (await downloadPromise).path())!, 'utf8');
  expect(text).toContain('2026-03-15');
  expect(text).toContain(history[2].id);
  expect(text).toContain('Sponsor');
  expect(text).toContain('300');
  await panel.getByLabel('Revisión guardada').selectOption('');
  await panel.getByLabel('Fecha de corte').fill('2026-03-15');
  await expect(panel.getByRole('button', { name: 'Guardar revisión', exact: true })).toBeEnabled();
  if (await panel.getByRole('button', { name: /Ver todos los hallazgos/ }).isVisible())
    await panel.getByRole('button', { name: /Ver todos los hallazgos/ }).click();
  await cost.locator('summary').filter({ hasText: 'Guardar resolución' }).click();
  await cost.getByLabel('Guardar resolución', { exact: true }).selectOption('dismissed');
  await cost
    .getByLabel('Justificación', { exact: true })
    .fill('La partida adicional se revisará por separado en comité.');
  await cost.getByRole('button', { name: 'Guardar resolución', exact: true }).click();
  await expect.poll(async () => (await stored()).findingStates.length).toBe(1);
  const original = (await stored()).findingStates[0];
  await page.goto(new URL('/projects/committee-case', page.url()).href);
  await panel.getByLabel('Fecha de corte').fill('2026-03-15');
  if (await panel.getByRole('button', { name: /Ver todos los hallazgos/ }).isVisible())
    await panel.getByRole('button', { name: /Ver todos los hallazgos/ }).click();
  await expect(cost).toContainText('Descartado');
  await page.evaluate(() => {
    const key = `pmo.workspace.v1.${localStorage.getItem('pmo.demo.uid')}`;
    const data = JSON.parse(localStorage.getItem(key)!);
    const c = data.controls.find((x: { id: string }) => x.id === 'committee-cost');
    c.data.forecast = 1400;
    c.revision++;
    c.versionId = 'case-cost-v4';
    c.updatedAt = '2026-03-15T13:00:00.000Z';
    data.controlVersions.push(c);
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload();
  await panel.getByLabel('Fecha de corte').fill('2026-03-15');
  if (await panel.getByRole('button', { name: /Ver todos los hallazgos/ }).isVisible())
    await panel.getByRole('button', { name: /Ver todos los hallazgos/ }).click();
  await expect(cost).toContainText('La evidencia cambió: revisar de nuevo');
  await cost.getByText('Historial de resoluciones', { exact: true }).click();
  await expect(cost).toContainText(original.reason);
  expect((await stored()).reviewHistory).toEqual(history);
  await panel.getByLabel('Revisión guardada').selectOption(history[2].id);
  const same = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Descargar agenda', exact: true }).click();
  // The baseline is explicit and persisted separately from the snapshot selection.
  const later = await readFile((await (await same).path())!, 'utf8');
  expect(later).toContain('300');
  expect(later).not.toContain('"differenceEUR": 400');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(panel.getByRole('heading', { name: 'Committee review', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
});

test('bounded analysis context reports exclusions, uses stable aliases and validates saved controls', async () => {
  const { buildAnalysisSnapshot, wireReviewContext } =
    await import('../frontend/src/lib/review-context');
  const fixture = committeeCase.en;
  const project = fixture.project as import('../frontend/src/types').Project;
  const records = Array.from({ length: 65 }, (_, i) => ({
    ...fixture.records[0],
    id: `action-${i}`,
  })) as import('../frontend/src/types').ProjectRecord[];
  const controls =
    fixture.controls as import('../frontend/src/lib/project-controls').ProjectControl[];
  const s = await buildAnalysisSnapshot(
    project,
    [],
    [...records, { ...records[0], ownerId: 'foreign', id: 'foreign' }],
    controls,
    fixture.reviewHistory as import('../frontend/src/types').ProjectReview[],
    '2026-03-15',
  );
  expect(s.coverage).toMatchObject({ recordsTotal: 65, controlsTotal: 3, partial: true });
  expect(s.records).toHaveLength(50);
  expect(s.history).toHaveLength(2);
  const wire = JSON.stringify(wireReviewContext(s));
  for (const privateValue of [
    'ownerId',
    'projectId',
    'versionId',
    'committee-milestone',
    'committee-cost',
    'committee-decision',
  ])
    expect(wire).not.toContain(privateValue);
  expect(s.references[s.controls[0].id].id).toBe(
    s.controls[0].kind === 'cost' ? 'committee-cost' : 'committee-decision',
  );
  const malformed = JSON.parse(fixture.reviewHistory[2].payload);
  malformed.snapshot.controls[0].data.baselineDate = '2026-02-30';
  expect(parseReview(JSON.stringify(malformed))).toBeNull();
  expect(parseReview(fixture.reviewHistory[2].payload)).not.toBeNull();
});

test('legacy reference migrates once with its original dates and retained limited information', async ({
  page,
}) => {
  await page.goto('/start');
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click();
  await page.getByLabel('Nombre del proyecto', { exact: true }).fill('Referencia anterior');
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await page.locator('.project-card').filter({ hasText: 'Referencia anterior' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  const legacy = await page.evaluate(() => {
    const key = `pmo.workspace.v1.${localStorage.getItem('pmo.demo.uid')}`;
    const data = JSON.parse(localStorage.getItem(key)!);
    const project = data.projects[0];
    const r = {
      id: project.id,
      projectId: project.id,
      ownerId: project.ownerId,
      language: 'es',
      engine: 'offline',
      contextKey: 'e'.repeat(64),
      createdAt: '2026-01-02T12:00:00Z',
      updatedAt: '2026-01-02T12:00:00Z',
      payload: JSON.stringify({
        status: 'active',
        risks: [],
        records: [
          {
            id: 'old-record',
            kind: 'action',
            title: 'Compromiso anterior',
            status: 'open',
            dueDate: '',
            severity: 'unspecified',
          },
        ],
      }),
    };
    data.reviews = [r];
    localStorage.setItem(key, JSON.stringify(data));
    return r;
  });
  await page.reload();
  const panel = page.locator('.committee-review');
  await panel.getByLabel('Revisión guardada').selectOption(legacy.id);
  await panel.locator('summary').filter({ hasText: 'Referencia histórica anterior' }).click();
  await expect(panel).toContainText('Compromiso anterior');
  await panel.getByLabel('Revisión guardada').selectOption('');
  await panel.getByRole('button', { name: 'Guardar revisión', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Descargar agenda', exact: true })).toBeVisible();
  const history = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem(`pmo.workspace.v1.${localStorage.getItem('pmo.demo.uid')}`)!)
        .reviewHistory,
  );
  expect(history).toHaveLength(2);
  expect(history.find((r: { contextKey: string }) => r.contextKey === legacy.contextKey)).toEqual({
    ...legacy,
    id: `${legacy.projectId}--${legacy.contextKey}`,
  });
});
