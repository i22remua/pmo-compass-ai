import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { es } from '../frontend/src/locales/es';
import { en } from '../frontend/src/locales/en';
import { documentTypes } from '../frontend/src/types';

function keys(value: object, prefix = ''): string[] {
  return Object.entries(value)
    .flatMap(([key, item]) => {
      const path = `${prefix}${key}`;
      return typeof item === 'object' && item !== null ? keys(item, `${path}.`) : [path];
    })
    .sort();
}

test('both interface dictionaries have complete matching keys', () => {
  expect(keys(en)).toEqual(keys(es));
});

for (const language of ['es', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`readable layouts and accessible controls (${language}, ${theme})`, async ({ page }) => {
      test.setTimeout(180000);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(
        ({ language, theme }) => {
          localStorage.setItem('pmo.language', language);
          localStorage.setItem('pmo.theme', theme);
        },
        { language, theme },
      );
      await page.goto('/start');
      await page
        .getByRole('button', {
          name: language === 'es' ? 'Añadir proyectos de ejemplo' : 'Add starter projects',
          exact: true,
        })
        .click();
      await expect(page.locator('.project-card')).toHaveCount(4);
      for (const width of [375, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const route of [
          '/',
          '/dashboard',
          '/projects/demo-project-1#diagnosis',
          '/projects/demo-project-1#tracking',
          '/projects/demo-project-1#notes',
          '/documents/demo-document-1',
          '/generator',
          '/settings',
          '/case-study',
        ]) {
          await page.goto(route);
          await expect(page.locator('html')).toHaveAttribute('lang', language);
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
          if (route.includes('#diagnosis'))
            await expect(page.locator('.executive-diagnosis')).toBeVisible();
          await expect(page.locator('main')).toBeVisible();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            `${route} at ${width}`,
          ).toBe(true);
          if (
            [375, 1440].includes(width) &&
            ['/dashboard', '/projects/demo-project-1#diagnosis', '/case-study'].includes(route)
          ) {
            const report = await new AxeBuilder({ page })
              .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
              .analyze();
            expect(report.violations, `${route} at ${width}`).toEqual([]);
          }
        }
        await page.goto('/dashboard');
        await page
          .getByRole('button', {
            name: language === 'es' ? 'Nuevo proyecto' : 'New project',
            exact: true,
          })
          .first()
          .click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page
          .getByLabel(language === 'es' ? 'Nombre del proyecto' : 'Project name', { exact: true })
          .fill('LongProjectName'.repeat(12));
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.keyboard.press('Escape');
      }
    });
  }
  test(`public case generates and exports every document format (${language})`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.goto('/case-study');
    await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click();
    const t = language === 'es' ? es : en;
    for (const type of documentTypes) {
      await page.getByRole('combobox').selectOption(type);
      const response = page.waitForResponse('**/api/v1/workspace/generate');
      await page.getByRole('button', { name: t.presentation.run, exact: true }).click();
      const result = await response;
      expect(result.ok()).toBe(true);
      expect(result.request().postDataJSON()).toMatchObject({ type, language });
      await expect(page.locator('.case-provenance')).toContainText(t.presentation.liveResult);
      await expect(page.locator('.case-result > h3')).toHaveText(t.documentTypes[type]);
      await page.locator('.case-full-document > summary').click();
      await expect(page.locator('.case-document')).toContainText('Atlas');
      const download = page.waitForEvent('download');
      await page
        .getByRole('button', {
          name: language === 'es' ? 'Exportar .md' : 'Export .md',
          exact: true,
        })
        .click();
      expect((await download).suggestedFilename()).toContain(`${type}-${language}.md`);
    }
  });
}
