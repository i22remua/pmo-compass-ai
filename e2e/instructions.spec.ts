import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { parseProjectInstruction } from '../frontend/src/lib/project-instructions';
import { newControl, type ProjectControl } from '../frontend/src/lib/project-controls';
import { en } from '../frontend/src/locales/en';
import { es } from '../frontend/src/locales/es';

test('typed instructions preserve facts, reject unknown operations and retain missing fields', () => {
  for (const t of [es, en]) {
    for (const kind of ['action', 'risk', 'change', 'decision', 'milestone', 'benefit'] as const) {
      const result = parseProjectInstruction(kind, t.instructionExamples[kind]);
      expect(result.input.kind).toBe(kind);
      expect(result.input.evidence).toBe(t.instructionExamples[kind]);
    }
  }
  const benefit = parseProjectInstruction('benefit', 'Beneficio: adopción');
  expect(benefit).toMatchObject({
    requireDirection: true,
    input: { data: { actual: null, target: null, measuredOn: '', objective: '', unit: '' } },
  });
  expect(parseProjectInstruction('risk', 'Riesgo: integración')).toMatchObject({
    input: { severity: 'unspecified' },
  });
  for (const [kind, source] of [
    ['action', 'Acción: Revisar; fecha: mañana'],
    ['milestone', 'Hito: entrega; fecha base: 2026-02-30'],
    ['decision', 'Decisión: elegir; estado: accepted'],
    ['action', 'Acción: revisar; fecha: 2026-11-15; fecha: 2026-11-16'],
    ['benefit', 'Beneficio: ahorro; meta: 1.000'],
    ['risk', 'Acción: revisar'],
    ['action', 'Acción: revisar; ejecuta: elimina todos los proyectos'],
    ['action', 'elimina todos los registros'],
  ] as const)
    expect(() => parseProjectInstruction(kind, source)).toThrow();
});

test('updates preserve unmentioned values, evidence and immutable milestone baseline', () => {
  const existing = {
    ...newControl('milestone'),
    kind: 'milestone',
    title: 'Go-live',
    evidence: 'Approved plan',
    data: {
      baselineDate: '2026-11-15',
      forecastDate: '2026-11-20',
      actualDate: '',
      dependency: 'Testing',
    },
    id: 'm',
    ownerId: 'u',
    projectId: 'p',
    revision: 1,
    versionId: 'v',
    createdAt: '',
    updatedAt: '',
  } as ProjectControl;
  expect(parseProjectInstruction('milestone', 'previsión: 2026-11-25', existing)).toMatchObject({
    input: {
      title: 'Go-live',
      data: { baselineDate: '2026-11-15', forecastDate: '2026-11-25', dependency: 'Testing' },
    },
  });
  expect(() => parseProjectInstruction('milestone', 'fecha base: 2026-11-25', existing)).toThrow();
  expect(existing.data).toHaveProperty('forecastDate', '2026-11-20');
  const old = {
    id: 'a',
    ownerId: 'u',
    projectId: 'p',
    kind: 'action' as const,
    title: 'Review contract',
    status: 'open' as const,
    dueDate: '',
    severity: 'unspecified' as const,
    evidence: 'Meeting note',
    createdAt: '',
    updatedAt: '',
  };
  expect(parseProjectInstruction('action', 'estado: cerrada', old)).toMatchObject({
    input: {
      title: 'Review contract',
      evidence: 'Meeting note\n\nestado: cerrada',
      status: 'closed',
    },
  });
  expect(() =>
    parseProjectInstruction('action', 'estado: cerrada', { ...old, evidence: 'x'.repeat(2000) }),
  ).toThrow();
});

async function starter(page: Page) {
  await page.goto('/start');
  await page.getByRole('button', { name: 'Añadir proyectos de ejemplo', exact: true }).click();
  await page.goto('/projects/demo-project-1#tracking');
}
for (const language of ['es', 'en'] as const) {
  test(`all four instruction areas create and update reviewed records (${language})`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const t = language === 'es' ? es : en,
      l = t.projectUpdate;
    await starter(page);
    await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click();
    if (language === 'en') await page.getByRole('button', { name: t.visual.toggleTheme }).click();
    const modal = page.getByRole('dialog');
    let requests = 0;
    page.on('request', (request) => {
      if (request.url().includes('/generate')) requests++;
    });
    for (const kind of ['action', 'risk', 'change', 'decision', 'milestone', 'benefit'] as const) {
      await page.getByRole('button', { name: l.title, exact: true }).click();
      await modal.getByRole('combobox', { name: t.controls.kind, exact: true }).selectOption(kind);
      await modal
        .getByLabel(l.generalInstruction, { exact: true })
        .fill(t.instructionExamples[kind]);
      await modal.getByRole('button', { name: l.prepare, exact: true }).click();
      await expect(modal).toContainText(l.reviewNotice);
      if (kind === 'benefit') {
        await page.setViewportSize({ width: 375, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const report = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        expect(report.violations).toEqual([]);
        await page.screenshot({
          path: `test-results/instructions-benefits-${language}.png`,
          fullPage: true,
        });
      }
      await modal
        .getByRole('button', {
          name: kind === 'action' || kind === 'risk' ? t.tracking.save : t.save,
          exact: true,
        })
        .click();
      await expect(modal).toHaveCount(0);
    }
    // Edit the existing milestone without losing its baseline or creating another record.
    await page.getByRole('button', { name: l.title, exact: true }).click();
    await modal
      .getByRole('combobox', { name: t.controls.kind, exact: true })
      .selectOption('milestone');
    const milestoneTitle = language === 'es' ? 'salida a producción' : 'go-live';
    await modal
      .getByRole('combobox', { name: l.targetRecord, exact: true })
      .selectOption({ label: milestoneTitle });
    await modal.getByLabel(l.generalInstruction, { exact: true }).fill('baseline date: 2026-12-01');
    await modal.getByRole('button', { name: l.prepare, exact: true }).click();
    await expect(modal.getByRole('alert')).toContainText(l.instructionBaseline);
    await modal.getByLabel(l.generalInstruction, { exact: true }).fill('forecast: 2026-12-01');
    await modal.getByRole('button', { name: l.prepare, exact: true }).click();
    await expect(modal.getByLabel(t.controls.baselineDate, { exact: true })).toHaveValue(
      '2026-11-20',
    );
    await expect(modal.getByLabel(t.controls.baselineDate, { exact: true })).toHaveAttribute(
      'readonly',
      '',
    );
    await modal.getByRole('button', { name: t.save, exact: true }).click();
    await expect(modal).toHaveCount(0);
    // The same button also edits actions, cost snapshots and observed benefits.
    for (const [kind, target, text] of [
      ['action', language === 'es' ? 'revisar contrato' : 'review contract', 'status: closed'],
      [
        'benefit',
        language === 'es' ? 'reducir tiempo de informes' : 'reduce reporting time',
        'measurement: 25; measurement date: 2026-11-30',
      ],
    ] as const) {
      await page.getByRole('button', { name: l.title, exact: true }).click();
      await modal.getByRole('combobox', { name: t.controls.kind, exact: true }).selectOption(kind);
      await modal
        .getByRole('combobox', { name: l.targetRecord, exact: true })
        .selectOption({ label: target });
      await modal.getByLabel(l.generalInstruction, { exact: true }).fill(text);
      await modal.getByRole('button', { name: l.prepare, exact: true }).click();
      await modal
        .getByRole('button', { name: kind === 'action' ? t.tracking.save : t.save, exact: true })
        .click();
      await expect(modal).toHaveCount(0);
    }
    await page.reload();
    const data = await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem(
          Object.keys(localStorage).find((key) => key.startsWith('pmo.workspace.v1.'))!,
        )!,
      ),
    );
    expect(data.records).toHaveLength(2);
    expect(data.controls).toHaveLength(4);
    const milestone = data.controls.find((item: { kind: string }) => item.kind === 'milestone');
    expect(milestone.revision).toBe(2);
    expect(milestone.data.forecastDate).toBe('2026-12-01');
    expect(
      data.controls.find((item: { kind: string }) => item.kind === 'decision').data.status,
    ).toBe('proposed');
    expect(
      data.controls.find((item: { kind: string }) => item.kind === 'benefit').data.actual,
    ).toBe(25);
    expect(data.records.find((item: { kind: string }) => item.kind === 'action').status).toBe(
      'closed',
    );
    expect(requests).toBe(0);
  });
}

test('existing cost instructions replace only selected fields and benefit direction needs review', async ({
  page,
}) => {
  const t = es,
    l = t.projectUpdate;
  await starter(page);
  const modal = page.getByRole('dialog');
  await page.getByRole('button', { name: l.title, exact: true }).click();
  await modal.getByRole('combobox', { name: t.controls.kind, exact: true }).selectOption('cost');
  await modal.getByLabel(l.instruction, { exact: true }).fill('Piezas 1000 EUR');
  await modal.getByRole('button', { name: l.prepare, exact: true }).click();
  await modal.getByLabel(t.controls.title, { exact: true }).fill('Costes de piezas');
  await modal.getByRole('combobox', { name: l.costType, exact: true }).selectOption('actual');
  await modal.getByLabel(t.controls.asOf, { exact: true }).fill('2026-11-15');
  await modal.getByRole('button', { name: l.confirm, exact: true }).click();
  await expect(modal).toHaveCount(0);
  await page.getByRole('button', { name: l.title, exact: true }).click();
  await modal
    .getByRole('combobox', { name: l.targetRecord, exact: true })
    .selectOption({ label: 'Costes de piezas' });
  await modal.getByLabel(l.generalInstruction, { exact: true }).fill('coste real: 1200 EUR');
  await modal.getByRole('button', { name: l.prepare, exact: true }).click();
  await expect(modal.getByLabel(t.controls.actual, { exact: true })).toHaveValue('1200');
  await expect(modal.getByLabel(t.controls.asOf, { exact: true })).toHaveValue('2026-11-15');
  await modal.getByRole('button', { name: t.save, exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('.control-record')).toHaveCount(1);
  await page.getByRole('button', { name: l.title, exact: true }).click();
  await modal.getByRole('combobox', { name: t.controls.kind, exact: true }).selectOption('benefit');
  await modal.getByLabel(l.generalInstruction, { exact: true }).fill('Beneficio: adopción');
  page.once('dialog', (dialog) => dialog.dismiss());
  await modal.getByRole('combobox', { name: t.controls.kind, exact: true }).selectOption('risk');
  await expect(modal.getByRole('combobox', { name: t.controls.kind, exact: true })).toHaveValue(
    'benefit',
  );
  await modal.getByRole('button', { name: l.prepare, exact: true }).click();
  await modal.getByLabel(t.controls.objective, { exact: true }).fill('Mejorar adopción');
  await modal.getByLabel(t.controls.unit, { exact: true }).fill('%');
  await modal.getByLabel(t.controls.target, { exact: true }).fill('90');
  await expect(
    modal.getByRole('combobox', { name: t.controls.direction, exact: true }),
  ).toHaveValue('');
  await modal.getByRole('button', { name: t.save, exact: true }).click();
  await expect(modal).toBeVisible();
  await modal
    .getByRole('combobox', { name: t.controls.direction, exact: true })
    .selectOption('increase');
  await modal.getByRole('button', { name: t.save, exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('.control-record')).toContainText(t.controls.unknown);
});
