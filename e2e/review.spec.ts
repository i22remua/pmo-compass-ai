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

test('review baseline persists explicitly, compares records, exports and cascades on deletion', async ({
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
  expect((await stored()).reviews).toEqual([]);
  await page.getByRole('tab', { name: 'Seguimiento PMO' }).click();
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
  await page.locator('.project-review > summary').click();
  await page.getByRole('button', { name: 'Guardar revisión', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Actualizar referencia', exact: true }),
  ).toBeEnabled();
  const baseline = (await stored()).reviews[0];
  expect(baseline.engine).toBe('offline');
  expect(JSON.parse(baseline.payload).records).toHaveLength(2);
  await page.getByRole('tab', { name: 'Seguimiento PMO' }).click();
  await page
    .locator('.tracking-record')
    .filter({ hasText: 'Validar migración' })
    .getByRole('button', { name: 'Cerrar elemento' })
    .click();
  await page.reload();
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  await page.locator('.project-review > summary').click();
  const review = page.locator('.project-review');
  await expect(review.getByRole('heading', { name: 'Registros cerrados (1)' })).toBeVisible();
  await expect(
    review.getByRole('heading', { name: 'Decisiones que siguen pendientes (1)' }),
  ).toBeVisible();
  expect((await stored()).reviews[0]).toEqual(baseline);
  await review.getByRole('button', { name: 'Validar migración', exact: true }).click();
  await expect(page.locator('.record-targeted')).toContainText('Validar migración');
  await expect(page.locator('.record-targeted')).toBeFocused();
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  await page.locator('.project-review > summary').click();
  await review.getByRole('button', { name: 'Actualizar referencia', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect((await stored()).reviews[0]).toEqual(baseline);
  await review.getByRole('button', { name: 'Actualizar referencia', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Actualizar referencia', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(review.getByRole('heading', { name: 'Registros cerrados (1)' })).toHaveCount(0);
  expect((await stored()).reviews).toHaveLength(1);
  // A second tab saved a newer baseline after this page loaded it.
  await page.evaluate(() => {
    const key = `pmo.workspace.v1.${localStorage.getItem('pmo.demo.uid')}`;
    const data = JSON.parse(localStorage.getItem(key)!);
    data.reviews[0].updatedAt = '2099-01-01T00:00:00.000Z';
    localStorage.setItem(key, JSON.stringify(data));
  });
  await review.getByRole('button', { name: 'Actualizar referencia', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Actualizar referencia', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('La referencia cambió en otra sesión');
  expect((await stored()).reviews[0].updatedAt).toBe('2099-01-01T00:00:00.000Z');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.reload();
  await page.locator('.project-review > summary').click();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ['light', 'dark']) {
    await page.evaluate((theme) => {
      localStorage.setItem('pmo.theme', theme);
      document.documentElement.dataset.theme = theme;
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
  await expect(review).toContainText('Risks are compared only in the saved review');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'ES', exact: true }).click();
  await page.goto('/settings');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar mis datos', exact: true }).click();
  const download = await downloading;
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(exported.reviews || exported.workspace?.reviews).toHaveLength(1);
  await page.goto(projectURL);
  await page.getByRole('button', { name: 'Eliminar proyecto', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  expect((await stored()).reviews).toEqual([]);
});
