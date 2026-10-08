import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { compareDocumentText, comparisonCandidates } from '../frontend/src/lib/document-comparison';
import type { GeneratedDocument } from '../frontend/src/types';

const stored = (id: string, overrides: Partial<GeneratedDocument> = {}): GeneratedDocument => ({
  id,
  ownerId: 'comparison-user',
  projectId: 'comparison-project',
  type: 'weekly_status',
  language: 'es',
  inputContext: '',
  provider: 'offline',
  risks: [],
  warnings: [],
  createdAt: '2026-10-01T12:00:00Z',
  generatedContent: '# Informe\n\nEstado: en revisión.\n\nDecisión pendiente: validar alcance.',
  ...overrides,
});

test('comparison candidates stay within owner, project, format, language and chronology', () => {
  const current = stored('current');
  const docs = [
    current,
    stored('older', { createdAt: '2026-09-28T12:00:00Z' }),
    stored('previous', { createdAt: '2026-09-30T12:00:00Z' }),
    stored('foreign-owner', { ownerId: 'other' }),
    stored('foreign-project', { projectId: 'other' }),
    stored('other-format', { type: 'risk_register' }),
    stored('other-language', { language: 'en' }),
    stored('future', { createdAt: '2026-10-02T12:00:00Z' }),
    stored('invalid', { createdAt: 'invalid' }),
  ];
  const snapshot = JSON.stringify(docs);
  expect(comparisonCandidates(current, docs).map((item) => item.id)).toEqual(['previous', 'older']);
  expect(comparisonCandidates({ ...current, createdAt: 'invalid' }, docs)).toEqual([]);
  expect(JSON.stringify(docs)).toBe(snapshot);
});

test('text comparison preserves both sources, repeated lines and moved or changed content', () => {
  for (const [before, after] of [
    ['', ''],
    ['', 'Nuevo'],
    ['Anterior', ''],
    ['A\nB\nA\nC', 'A\nA\nB\nD'],
    ['# Estado\n\nRiesgo: alto\nFin', '# Estado\n\nRiesgo: bajo\nFin'],
    ['\nTexto\n', 'Texto\n\n'],
    ['Español: acción ✅\r\nDato', 'Español: acción ✅\nDato'],
  ]) {
    const result = compareDocumentText(before, after);
    const restoredBefore = result.changes
      .filter((part) => part.kind !== 'added')
      .flatMap((part) => part.lines)
      .join('\n');
    const restoredAfter = result.changes
      .filter((part) => part.kind !== 'removed')
      .flatMap((part) => part.lines)
      .join('\n');
    expect(restoredBefore).toBe(before.replace(/\r\n?/g, '\n'));
    expect(restoredAfter).toBe(after.replace(/\r\n?/g, '\n'));
  }
  expect(compareDocumentText('A\nB\nC', 'A\nD\nC').changes).toEqual([
    { kind: 'unchanged', lines: ['A'] },
    { kind: 'removed', lines: ['B'] },
    { kind: 'added', lines: ['D'] },
    { kind: 'unchanged', lines: ['C'] },
  ]);
  expect(compareDocumentText('A\r\nB', 'A\nB').identical).toBe(true);
  expect(compareDocumentText('A ', 'A').identical).toBe(false);
});

test('long comparisons use bounded alignment without dropping either source', () => {
  const before = Array.from({ length: 1000 }, (_, i) => `Anterior ${i}`).join('\n');
  const after = Array.from({ length: 1000 }, (_, i) => `Nuevo ${i}`).join('\n');
  const result = compareDocumentText(before, after);
  expect(result.grouped).toBe(true);
  expect(result.changes).toHaveLength(2);
  expect(result.changes[0].lines.join('\n')).toBe(before);
  expect(result.changes[1].lines.join('\n')).toBe(after);
});

for (const theme of ['light', 'dark']) {
  test(`saved deliveries compare privately, render untrusted text safely and handle deleted baselines (${theme})`, async ({
    page,
  }) => {
    const current = stored('current');
    const docs = [
      current,
      stored('older', { createdAt: '2026-09-28T12:00:00Z' }),
      stored('previous', {
        createdAt: '2026-09-30T12:00:00Z',
        provider: 'gemini',
        generatedContent:
          '# Informe\n\nEstado: pendiente de revisar.\n<img src=x onerror="window.__comparisonInjected=true">\n\nDecisión pendiente: validar alcance.',
      }),
      stored('wrong-type', { type: 'risk_register' }),
      stored('wrong-language', { language: 'en' }),
      stored('wrong-project', { projectId: 'other' }),
    ];
    await page.addInitScript(
      ({ docs, theme }) => {
        const uid = 'comparison-user';
        localStorage.setItem('pmo.theme', theme);
        localStorage.setItem('pmo.demo.uid', uid);
        localStorage.setItem('pmo.demo.active', uid);
        localStorage.setItem(
          `pmo.workspace.v1.${uid}`,
          JSON.stringify({
            projects: [
              {
                id: 'comparison-project',
                ownerId: uid,
                name: 'Proyecto de comparación',
                sector: 'Tecnología',
                description: '',
                objectives: '',
                startDate: '',
                endDate: '',
                status: 'planning',
                budget: null,
                stakeholders: '',
                notes: '',
                aiAccess: 'offline',
                createdAt: '2026-09-01T12:00:00Z',
                updatedAt: '2026-09-01T12:00:00Z',
              },
            ],
            documents: docs,
            sources: [],
            records: [],
          }),
        );
      },
      { docs, theme },
    );
    const sent: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/')) sent.push(request.url());
    });
    await page.goto('/documents/current');
    const initial = await page.evaluate(() =>
      localStorage.getItem('pmo.workspace.v1.comparison-user'),
    );
    await page.getByRole('button', { name: 'Comparar entregas', exact: true }).click();
    const comparison = page.getByRole('region', { name: 'Comparar entregas', exact: true });
    const select = page.getByLabel('Entrega anterior', { exact: true });
    await expect(select).toHaveValue('previous');
    await expect(select.locator('option')).toHaveCount(2);
    await expect(comparison.locator('.comparison-removed')).toContainText('pendiente de revisar');
    await expect(comparison.locator('.comparison-added')).toContainText('en revisión');
    await expect(comparison).toContainText('Gemini');
    await expect(comparison).toContainText('Offline PMO Engine');
    await expect(comparison.locator('img,script,iframe')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => (window as Window & { __comparisonInjected?: boolean }).__comparisonInjected,
      ),
    ).toBeUndefined();
    await expect(page.getByRole('button', { name: 'Copiar', exact: true })).toHaveCount(0);
    await expect(comparison.locator('.comparison-unchanged').first()).not.toHaveAttribute(
      'open',
      '',
    );
    await select.selectOption('older');
    await expect(comparison).toContainText('El texto de ambas entregas es idéntico.');
    await expect(comparison.locator('.comparison-change')).toHaveCount(0);
    expect(
      await page.evaluate(() => localStorage.getItem('pmo.workspace.v1.comparison-user')),
    ).toBe(initial);
    expect(sent).toEqual([]);
    await select.selectOption('previous');
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Compare deliveries' })).toBeVisible();
    await expect(page.getByLabel('Previous delivery', { exact: true })).toHaveValue('previous');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.evaluate(() => {
      const key = 'pmo.workspace.v1.comparison-user';
      const data = JSON.parse(localStorage.getItem(key)!);
      data.documents = data.documents.filter((doc: { id: string }) => doc.id !== 'previous');
      localStorage.setItem(key, JSON.stringify(data));
      window.dispatchEvent(new StorageEvent('storage', { key }));
    });
    await expect(
      page.getByText('The selected delivery is no longer available. Choose another to compare.'),
    ).toBeVisible();
    await expect(page.locator('.comparison-change')).toHaveCount(0);
    await page.getByLabel('Previous delivery', { exact: true }).selectOption('older');
    await expect(page.getByText('Both deliveries contain identical text.')).toBeVisible();
    await page.getByRole('button', { name: 'View document', exact: true }).click();
    await expect(page.locator('.markdown-content')).toContainText('Estado: en revisión.');
    await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeVisible();
  });
}
