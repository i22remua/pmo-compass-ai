import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch();

const reports = [];
try {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    });
    await context.addInitScript((value) => localStorage.setItem('pmo.theme', value), theme);
    const page = await context.newPage();
    for (const route of [
      '/',
      '/login',
      '/demo',
      '/projects',
      '/generator',
      '/documents',
      '/settings',
      '/projects/demo-project-1',
      '/documents/demo-document-1',
    ]) {
      await page.goto(`http://127.0.0.1:3000${route}`);
      await page.waitForLoadState('networkidle');
      if (route === '/demo') {
        await page
          .getByRole('button', { name: 'Añadir proyectos de ejemplo', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Proyectos de ejemplo añadidos', exact: true })
          .waitFor();
      }
      if (route === '/projects/demo-project-1') {
        await page.getByRole('tab', { name: 'AI Project Intelligence', exact: true }).click();
        await page.locator('.intelligence-risks').waitFor();
      }
      const report = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      const violations = report.violations.map(({ id, impact, nodes }) => ({
        id,
        impact,
        nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
      }));
      reports.push({ route, theme, violations });
      console.log(
        theme,
        route,
        violations.map((v) => `${v.id}: ${v.nodes.length}`).join(', ') || 'PASS',
      );
    }
    await context.close();
  }
  await mkdir('test-results', { recursive: true });
  await writeFile('test-results/accessibility.json', JSON.stringify(reports, null, 2));
} finally {
  await browser.close();
}
process.exit(reports.some((r) => r.violations.length) ? 1 : 0);
