import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { en } from '../frontend/src/locales/en';
import { es } from '../frontend/src/locales/es';
import {
  benefitResult,
  difference,
  milestoneVariance,
  newControl,
  validateControl,
  validControlDate,
  type ControlInput,
  type ProjectControl,
} from '../frontend/src/lib/project-controls';

test('calendar and cost differences distinguish unknown, zero, early and late delivery', () => {
  expect(
    milestoneVariance({
      baselineDate: '2026-10-30',
      forecastDate: '2026-11-04',
      actualDate: '',
      dependency: '',
    }),
  ).toBe(5);
  expect(
    milestoneVariance({
      baselineDate: '2026-10-30',
      forecastDate: '2026-11-04',
      actualDate: '2026-10-29',
      dependency: '',
    }),
  ).toBe(-1);
  expect(
    milestoneVariance({
      baselineDate: '2026-10-30',
      forecastDate: '',
      actualDate: '',
      dependency: '',
    }),
  ).toBeNull();
  expect(difference(null, 0)).toBeNull();
  expect(difference(0, 0)).toBe(0);
  expect(difference(1.1, 1)).toBe(0.1);
  expect(validControlDate('2025-02-29')).toBe(false);
  expect(validControlDate('2024-02-29')).toBe(true);
});
test('observed benefits require evidence and a measurement; a target alone proves nothing', () => {
  const benefit: ControlInput = {
    ...newControl('benefit'),
    title: 'Faster reporting',
    kind: 'benefit',
    evidence: 'Timed session',
    data: {
      objective: 'Reduce preparation time',
      unit: 'minutes',
      baseline: 60,
      target: 30,
      actual: null,
      measuredOn: '',
      direction: 'decrease',
    },
  };
  validateControl(benefit);
  expect(benefitResult(benefit.data)).toBe('unknown');
  benefit.data.actual = 0;
  expect(() => validateControl(benefit)).toThrow();
  benefit.data.measuredOn = '2026-10-11';
  validateControl(benefit);
  expect(benefitResult(benefit.data)).toBe('achieved');
  expect(() => validateControl({ ...benefit, evidence: '' })).toThrow();
  expect(benefitResult({ ...benefit.data, actual: 40 })).toBe('pending');
  expect(() =>
    validateControl({ ...benefit, data: { ...benefit.data, actual: Infinity } }),
  ).toThrow();
});
test('decision workflow and milestone baseline cannot be silently bypassed', () => {
  const d = newControl('change');
  if (d.kind !== 'change' && d.kind !== 'decision') throw new Error();
  d.title = 'Recover integration';
  d.data.reason = 'Supplier delay';
  validateControl(d);
  expect(() => validateControl({ ...d, data: { ...d.data, status: 'accepted' } })).toThrow();
  const previous = {
    ...d,
    id: 'c',
    ownerId: 'u',
    projectId: 'p',
    revision: 1,
    versionId: 'v',
    createdAt: '',
    updatedAt: '',
  } as ProjectControl;
  expect(() =>
    validateControl({ ...d, data: { ...d.data, status: 'reviewed' } }, previous),
  ).toThrow();
  validateControl(
    { ...d, data: { ...d.data, status: 'reviewed', alternatives: 'Reduce scope or revise date' } },
    previous,
  );
  const m = {
    ...previous,
    kind: 'milestone',
    data: { baselineDate: '2026-10-30', forecastDate: '', actualDate: '', dependency: '' },
  } as ProjectControl;
  expect(() =>
    validateControl(
      {
        ...newControl('milestone'),
        title: 'Go live',
        kind: 'milestone',
        data: { baselineDate: '2026-11-04', forecastDate: '', actualDate: '', dependency: '' },
      },
      m,
    ),
  ).toThrow();
});
async function starter(page: Page) {
  await page.goto('/start');
  await page.getByRole('button', { name: 'Añadir proyectos de ejemplo', exact: true }).click();
  await page.goto('/projects/demo-project-1#tracking');
}
for (const language of ['es', 'en'] as const) {
  test(`governance, baselines and benefits retain versions and export without AI (${language})`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const t = language === 'es' ? es : en,
      l = t.controls;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await starter(page);
    await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click();
    const nav = page.locator('.control-navigation');
    const modal = page.getByRole('dialog');
    const save = async () => {
      await modal.getByRole('button', { name: t.save, exact: true }).click();
      await expect(modal).toHaveCount(0);
    };
    const add = async (kind: string, title: string) => {
      await page.getByRole('button', { name: l.add, exact: true }).click();
      await modal.getByRole('combobox', { name: l.kind, exact: true }).selectOption(kind);
      await modal.getByLabel(l.title, { exact: true }).fill(title);
    };
    let external = 0;
    page.on('request', (request) => {
      if (request.url().endsWith('/generate')) external++;
    });
    await nav.getByRole('button', { name: l.governance, exact: true }).click();
    await add('change', 'Vendor recovery');
    await modal.getByLabel(l.reason, { exact: true }).fill('Supplier integration is late');
    await save();
    const change = page.locator('.control-record').filter({ hasText: 'Vendor recovery' });
    await change.getByRole('button', { name: t.edit, exact: true }).click();
    await modal.getByRole('combobox', { name: l.status, exact: true }).selectOption('reviewed');
    await modal.getByLabel(l.alternatives, { exact: true }).fill('Reduce scope or revise schedule');
    await save();
    await change.getByRole('button', { name: t.edit, exact: true }).click();
    await modal.getByRole('combobox', { name: l.status, exact: true }).selectOption('accepted');
    await modal.getByLabel(l.resolution, { exact: true }).fill('Unconfirmed draft rationale');
    await modal.getByRole('combobox', { name: l.status, exact: true }).selectOption('reviewed');
    await modal.getByRole('combobox', { name: l.status, exact: true }).selectOption('accepted');
    await expect(modal.getByLabel(l.resolution, { exact: true })).toHaveValue('');
    await modal
      .getByLabel(l.resolution, { exact: true })
      .fill('Retain scope to preserve appointment booking');
    await modal.getByLabel(l.decidedOn, { exact: true }).fill('2026-10-11');
    await modal.getByLabel(l.decisionRole, { exact: true }).fill('Project owner');
    await modal.getByLabel(l.evidence, { exact: true }).fill('Recorded steering review');
    await save();
    await expect(change).toContainText(l.accepted);
    await change.locator('details > summary').filter({ hasText: l.history }).click();
    await expect(change.locator('.control-version')).toHaveCount(3);
    await page.reload();
    await expect(change).toContainText(l.accepted);
    await nav.getByRole('button', { name: l.delivery, exact: true }).click();
    await add('milestone', 'Integration complete');
    await modal.getByLabel(l.baselineDate, { exact: true }).fill('2026-10-30');
    await modal.getByLabel(l.forecastDate, { exact: true }).fill('2026-11-04');
    await save();
    const milestone = page.locator('.control-record').filter({ hasText: 'Integration complete' });
    await expect(milestone).toContainText(`5 ${l.days}`);
    await milestone.getByRole('button', { name: t.edit, exact: true }).click();
    await expect(modal.getByLabel(l.baselineDate, { exact: true })).toHaveAttribute('readonly', '');
    await modal.getByLabel(l.actualDate, { exact: true }).fill('2026-11-02');
    await save();
    await expect(milestone).toContainText(`${l.actualVariance}: 3 ${l.days}`);
    await add('cost', 'Implementation costs');
    await modal.getByLabel(l.approved, { exact: true }).fill('1000');
    await modal.getByLabel(l.actual, { exact: true }).fill('0');
    await modal.getByLabel(l.forecast, { exact: true }).fill('1200');
    await modal.getByLabel(l.asOf, { exact: true }).fill('2026-10-11');
    await modal.getByLabel(l.evidence, { exact: true }).fill('Cost register');
    await save();
    await nav.getByRole('button', { name: l.benefits, exact: true }).click();
    await add('benefit', 'Weekly reporting');
    await modal
      .getByLabel(l.objective, { exact: true })
      .fill('Reduce time spent preparing reports');
    await modal.getByLabel(l.unit, { exact: true }).fill('minutes');
    await modal.getByLabel(l.benefitBaseline, { exact: true }).fill('60');
    await modal.getByLabel(l.target, { exact: true }).fill('30');
    await modal.getByRole('combobox', { name: l.direction, exact: true }).selectOption('decrease');
    await save();
    const benefit = page.locator('.control-record').filter({ hasText: 'Weekly reporting' });
    await expect(benefit).toContainText(l.unknown);
    await expect(benefit).not.toContainText(l.achieved);
    await benefit.getByRole('button', { name: t.edit, exact: true }).click();
    await modal.getByLabel(l.measurement, { exact: true }).fill('25');
    await modal.getByLabel(l.measuredOn, { exact: true }).fill('2026-10-11');
    await modal.getByLabel(l.evidence, { exact: true }).fill('Timed session 11 October');
    await save();
    await expect(benefit).toContainText(l.achieved);
    await benefit.getByRole('button', { name: t.edit, exact: true }).click();
    await modal.getByLabel(l.archive, { exact: true }).check();
    await save();
    await expect(page.locator('.control-record')).toHaveCount(0);
    await page.getByLabel(l.showArchived, { exact: true }).check();
    await expect(benefit).toContainText(l.archivedLabel);
    expect(external).toBe(0);
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') await page.getByRole('button', { name: t.visual.toggleTheme }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      for (const width of [375, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), {
            message: `${language}/${theme} at ${width}px`,
          })
          .toBe(0);
        if ([375, 1440].includes(width)) {
          const report = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze();
          expect(report.violations).toEqual([]);
          await page.screenshot({
            path: `test-results/controls-${language}-${theme}-${width}.png`,
            fullPage: true,
          });
        }
      }
    }
    await page.goto('/settings');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: t.exportMyData, exact: true }).click();
    const payload = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
    expect(payload.workspace.controls).toHaveLength(4);
    expect(payload.workspace.controlVersions).toHaveLength(9);
    await page.goto('/projects/demo-project-1');
    await page.getByRole('button', { name: t.deleteProject, exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: t.delete, exact: true }).click();
    await expect(page).toHaveURL(/\/projects$/);
    const remaining = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('pmo.workspace.v1.'))!;
      return JSON.parse(localStorage.getItem(key)!);
    });
    expect(remaining.controls).toHaveLength(0);
    expect(remaining.controlVersions).toHaveLength(0);
  });
  test(`public lifecycle remains fictional, keyboard accessible and stateless (${language})`, async ({
    page,
  }) => {
    const t = language === 'es' ? es : en,
      l = t.controls;
    await page.goto('/case-study');
    await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click();
    // App Check can populate reCAPTCHA storage asynchronously in production.
    // The walkthrough must not create or change any application-owned data.
    const applicationStorage = () =>
      Object.fromEntries(
        Object.entries(localStorage)
          .filter(([key]) => key.startsWith('pmo.'))
          .sort(([left], [right]) => left.localeCompare(right)),
      );
    const before = await page.evaluate(applicationStorage);
    await page.locator('.case-lifecycle > summary').click();
    for (let i = 0; i < 4; i++)
      await page.getByRole('button', { name: l.caseNext, exact: true }).click();
    await expect(page.locator('.case-cycle-step')).toContainText(`5 ${l.days}`);
    await expect(page.locator('.case-lifecycle')).toContainText(l.caseNotice);
    await page.setViewportSize({ width: 375, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await page.evaluate(applicationStorage)).toEqual(before);
    await page.getByRole('combobox').selectOption('weekly_status');
    await expect(page.locator('.case-pending')).toBeVisible();
  });
}

test('local control edits preserve drafts on cancel and reject stale writes from another tab', async ({
  page,
  context,
}) => {
  const l = es.controls;
  await starter(page);
  await page
    .locator('.control-navigation')
    .getByRole('button', { name: l.delivery, exact: true })
    .click();
  await page.getByRole('button', { name: l.add, exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel(l.title, { exact: true }).fill('Unsaved milestone');
  page.once('dialog', (dialog) => dialog.dismiss());
  await modal.getByRole('button', { name: es.cancel, exact: true }).click();
  await expect(modal.getByLabel(l.title, { exact: true })).toHaveValue('Unsaved milestone');
  page.once('dialog', (dialog) => dialog.accept());
  await modal.getByRole('button', { name: es.cancel, exact: true }).click();
  await expect(modal).toHaveCount(0);
  await page.getByRole('button', { name: l.add, exact: true }).click();
  await modal.getByRole('combobox', { name: l.kind, exact: true }).selectOption('cost');
  await modal.getByLabel(l.title, { exact: true }).fill('Concurrent cost');
  await modal.getByLabel(l.asOf, { exact: true }).fill('2026-10-12');
  await modal.getByRole('button', { name: es.save, exact: true }).click();
  await expect(modal).toHaveCount(0);
  const other = await context.newPage();
  await other.goto(page.url());
  for (const tab of [page, other]) {
    await tab
      .locator('.control-record')
      .getByRole('button', { name: es.edit, exact: true })
      .click();
  }
  await page.getByLabel(l.forecast, { exact: true }).fill('200');
  await page.getByRole('dialog').getByRole('button', { name: es.save, exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await other.getByLabel(l.forecast, { exact: true }).fill('300');
  await other.getByRole('dialog').getByRole('button', { name: es.save, exact: true }).click();
  await expect(other.getByRole('dialog').getByRole('alert')).toContainText(l.conflict);
  await expect(other.getByLabel(l.forecast, { exact: true })).toHaveValue('300');
  await other.close();
  await page.reload();
  await page.locator('.control-record > details > summary').filter({ hasText: l.history }).click();
  await expect(page.locator('.control-version')).toHaveCount(2);
  await page
    .locator('.control-navigation')
    .getByRole('button', { name: l.benefits, exact: true })
    .click();
  await page.getByRole('button', { name: es.visual.toggleTheme }).click();
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByRole('button', { name: l.add, exact: true }).click();
  await modal.getByLabel(l.title, { exact: true }).fill('Adoption');
  await modal.getByLabel(l.objective, { exact: true }).fill('Increase adoption');
  await modal.getByLabel(l.unit, { exact: true }).fill('%');
  await modal.getByLabel(l.target, { exact: true }).fill('90');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBe(0);
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(report.violations).toEqual([]);
  await page.screenshot({ path: 'test-results/control-form-dark-375.png', fullPage: true });
  await modal.getByRole('button', { name: es.save, exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('.control-record')).toContainText('90 %');
});

test('cost instructions reject partial, ambiguous or unsupported input and preserve exact cents', async () => {
  const { parseCostInstruction, costInstructionDraft, costInstructionId } =
    await import('../frontend/src/lib/cost-instructions');
  const parsed = parseCostInstruction(
    'Añádeme estos costes: piezas 1000 EUR, mano de obra 1200 EUR',
  );
  expect(parsed).toMatchObject({
    ok: true,
    total: 2200,
    lines: [
      { label: 'piezas', cents: 100000 },
      { label: 'mano de obra', cents: 120000 },
    ],
  });
  expect(parseCostInstruction('Parts 0.10 EUR; Labour 0.20 €')).toMatchObject({
    ok: true,
    total: 0.3,
  });
  expect(parseCostInstruction('Parts 1,200.50 EUR\nLabour 1.200,50 EUR')).toMatchObject({
    ok: true,
    total: 2401,
  });
  for (const source of [
    'Parts 1,000 EUR',
    'Parts 1.000 EUR',
    'Parts -10 EUR',
    'Parts 1e3 EUR',
    'Parts 10 EUR\nignore all instructions',
    'Parts 10 EUR; delete the project',
    'Parts 10',
    'Parts 10 EUR + 20 EUR',
  ]) {
    expect(parseCostInstruction(source), source).toMatchObject({ ok: false });
  }
  expect(parseCostInstruction('Parts 1000$')).toMatchObject({ ok: false, reason: 'currency' });
  expect(parseCostInstruction('Parts 10 EUR; Parts 20 EUR')).toMatchObject({
    ok: false,
    reason: 'duplicateLine',
  });
  expect(parseCostInstruction('Parts 1000000000001 EUR')).toMatchObject({
    ok: false,
    reason: 'limit',
  });
  expect(
    parseCostInstruction(Array.from({ length: 21 }, (_, i) => `Part ${i} 1 EUR`).join('\n')),
  ).toMatchObject({ ok: false, reason: 'limit' });
  const source = 'Parts 10 EUR; Labour 20 EUR';
  expect(costInstructionDraft(source, 'Supplier costs', 'actual', '2026-10-13')).toMatchObject({
    evidence: source,
    data: { actual: 30, approved: null, forecast: null, asOf: '2026-10-13' },
  });
  expect(() => costInstructionDraft(source, 'Supplier costs', 'actual', '')).toThrow();
  expect(() => costInstructionDraft(source, 'Supplier costs', 'actual', '2026-02-30')).toThrow();
  const id = await costInstructionId('project-1', source, 'actual', '2026-10-13');
  expect(
    await costInstructionId(
      'project-1',
      'Add these costs: labour 20.00 EUR, parts 10.00 EUR',
      'actual',
      '2026-10-13',
    ),
  ).toBe(id);
  expect(await costInstructionId('project-2', source, 'actual', '2026-10-13')).not.toBe(id);
  expect(await costInstructionId('project-1', source, 'forecast', '2026-10-13')).not.toBe(id);
});

for (const language of ['es', 'en'] as const) {
  test(`instructions require review, preserve evidence and reject repeat saves (${language})`, async ({
    page,
  }) => {
    const t = language === 'es' ? es : en,
      l = t.projectUpdate;
    await starter(page);
    await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click();
    if (language === 'en') await page.getByRole('button', { name: t.visual.toggleTheme }).click();
    const before = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('pmo.workspace.v1.'))!;
      return JSON.parse(localStorage.getItem(key)!).controls?.length || 0;
    });
    let generations = 0;
    page.on('request', (request) => {
      if (request.url().includes('/generate')) generations++;
    });
    await page.getByRole('button', { name: l.title, exact: true }).click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel(l.instruction, { exact: true }).fill('Parts 1000$');
    await modal.getByRole('button', { name: l.prepare, exact: true }).click();
    await expect(modal.getByRole('alert')).toContainText(l.currency);
    const source =
      language === 'es'
        ? 'Añádeme estos costes: piezas 1000 EUR, mano de obra 1200 EUR'
        : 'Add these costs: parts 1000 EUR, labour 1200 EUR';
    await modal.getByLabel(l.instruction, { exact: true }).fill(source);
    await modal.getByRole('button', { name: l.prepare, exact: true }).click();
    await expect(modal.locator('.instruction-breakdown > div')).toHaveCount(3);
    await modal.getByRole('button', { name: l.confirm, exact: true }).click();
    await expect(modal).toBeVisible(); // Required metadata cannot be invented.
    await modal.getByLabel(t.controls.title, { exact: true }).fill('Assembly review');
    await modal.getByRole('combobox', { name: l.costType, exact: true }).selectOption('actual');
    await modal.getByLabel(t.controls.asOf, { exact: true }).fill('2026-10-13');
    for (const width of [375, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (width === 375 || width === 1440)
        await page.screenshot({
          path: `test-results/instructions-${language}-${width}.png`,
          fullPage: true,
        });
    }
    const report = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(report.violations).toEqual([]);
    const countBeforeSave = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('pmo.workspace.v1.'))!;
      return JSON.parse(localStorage.getItem(key)!).controls?.length || 0;
    });
    expect(countBeforeSave).toBe(before);
    if (language === 'es') {
      await page.evaluate(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key: string, value: string) {
          if (key.startsWith('pmo.workspace.v1.')) {
            Storage.prototype.setItem = original;
            throw new DOMException('Simulated full storage', 'QuotaExceededError');
          }
          return original.call(this, key, value);
        };
      });
      await modal.getByRole('button', { name: l.confirm, exact: true }).click();
      await expect(modal.getByRole('alert')).toBeVisible();
      await expect(modal.getByLabel(t.controls.title, { exact: true })).toHaveValue(
        'Assembly review',
      );
    }
    await modal.getByRole('button', { name: l.confirm, exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(
      page.locator('.control-record').filter({ hasText: 'Assembly review' }),
    ).toBeVisible();
    await page.reload();
    const snapshot = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('pmo.workspace.v1.'))!;
      return JSON.parse(localStorage.getItem(key)!);
    });
    expect(snapshot.controls).toHaveLength(before + 1);
    const value = snapshot.controls.find((c: { title: string }) => c.title === 'Assembly review');
    expect(value.data).toEqual({
      actual: 2200,
      forecast: null,
      approved: null,
      asOf: '2026-10-13',
    });
    expect(value.evidence).toBe(source);
    expect(snapshot.controlVersions.filter((c: { id: string }) => c.id === value.id)).toHaveLength(
      1,
    );
    await page.getByRole('button', { name: l.title, exact: true }).click();
    await modal.getByLabel(l.instruction, { exact: true }).fill(source);
    await modal.getByRole('button', { name: l.prepare, exact: true }).click();
    await modal.getByLabel(t.controls.title, { exact: true }).fill('Duplicate');
    await modal.getByRole('combobox', { name: l.costType, exact: true }).selectOption('actual');
    await modal.getByLabel(t.controls.asOf, { exact: true }).fill('2026-10-13');
    await modal.getByRole('button', { name: l.confirm, exact: true }).click();
    await expect(modal.getByRole('alert')).toContainText(l.duplicate);
    page.once('dialog', (dialog) => dialog.dismiss());
    await modal.getByRole('button', { name: t.cancel, exact: true }).click();
    await expect(modal).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await modal.getByRole('button', { name: t.cancel, exact: true }).click();
    await expect(modal).toHaveCount(0);
    expect(generations).toBe(0);
  });
}
