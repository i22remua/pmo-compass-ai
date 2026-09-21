import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const destination = 'docs/screenshots';
const base = (process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const external = process.env.SCREENSHOT_EXTERNAL_AI === 'true';
const providers = {};
await mkdir(destination, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1160 },
  colorScheme: 'light',
  reducedMotion: 'reduce',
});
const page = await context.newPage();
page.setDefaultTimeout(60000);
const capture = async (name, fullPage = true) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  await page.locator('.toast').waitFor({ state: 'hidden' });
  await page.evaluate(async () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    await new Promise(requestAnimationFrame);
    window.scrollTo({ top: 0, behavior: 'instant' });
    await new Promise(requestAnimationFrame);
  });
  await page.screenshot({ path: `${destination}/${name}.png`, fullPage, animations: 'disabled' });
  console.log(`Saved ${name}.png`);
};
try {
  await page.goto(base);
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Your project,/ })).toBeVisible();
  await capture('landing-en');
  await capture('landing-hero-en', false);
  await page.getByRole('button', { name: 'Switch theme', exact: true }).click();
  await page.reload();
  await capture('landing-dark-en');
  await page.getByRole('button', { name: 'Switch theme', exact: true }).click();
  await page.getByRole('button', { name: 'ES', exact: true }).click();
  await page.goto(`${base}/start`);
  await page.getByRole('button', { name: 'Añadir proyectos de ejemplo', exact: true }).click();
  await page.getByRole('button', { name: 'Proyectos de ejemplo añadidos', exact: true }).waitFor();
  await expect(page.getByRole('heading', { name: 'Vista general' })).toBeVisible();
  await capture('dashboard-es');
  await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click();
  await page.reload();
  await capture('dashboard-dark-es');
  await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click();
  await page.goto(`${base}/generator?project=demo-project-2`);
  await page
    .getByRole('combobox', { name: 'Elige un documento', exact: true })
    .selectOption('risk_register');
  await page.getByLabel('Idioma del documento').selectOption('en');
  await page.locator('.generator-context-options > summary').click();
  await page
    .getByLabel('Contexto adicional')
    .fill(
      'Prepare the sponsor review. Focus on the integration delay and the proposed SMS reminders.',
    );
  if (!external) await page.locator('.generator-more > summary').click();
  await page
    .getByRole('button', {
      name: external ? 'Generar documento' : 'Offline PMO Engine',
      exact: true,
    })
    .click();
  await expect(page.locator('.markdown-content')).toBeVisible({ timeout: 90000 });
  providers.riskRegister = await page.locator('.output-meta').innerText();
  await page.locator('.generator-context-options > summary').click();
  if (!external) await page.locator('.generator-more > summary').click();
  await capture('generator-risk-register', false);
  await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click();
  await capture('generator-dark-risk-register', false);
  await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar documento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Guardado', exact: true })).toBeDisabled();
  await page.goto(`${base}/documents`);
  await page.locator('.document-table-row').first().click();
  await expect(page.locator('.markdown-content')).toBeVisible();
  await capture('saved-document-es', false);
  await page.goto(`${base}/projects/demo-project-2`);
  await page.getByRole('tab', { name: 'AI Project Intelligence', exact: true }).click();
  await expect(page.locator('.intelligence-risks')).toBeVisible();
  await capture('project-intelligence-es', false);
  if (external) {
    await page
      .getByLabel('Tu pregunta sobre el proyecto')
      .fill(
        'Ordena los tres principales riesgos de mayor a menor impacto. Sé breve e indica si el impacto es estimado.',
      );
    await page.getByRole('button', { name: 'Preguntar a PMO Compass', exact: true }).click();
    await expect(page.locator('.copilot-answer')).toBeVisible({ timeout: 90000 });
    providers.copilot = await page.locator('.copilot-answer .provider-badge').innerText();
    await page
      .locator('.copilot-panel')
      .screenshot({ path: `${destination}/copilot-ranked-risks-es.png`, animations: 'disabled' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await capture('landing-mobile');
  await page.goto(`${base}/dashboard`);
  await expect(page.getByRole('heading', { name: 'Vista general' })).toBeVisible();
  await capture('dashboard-mobile');
  await page.goto(`${base}/generator?project=demo-project-1`);
  await page.locator('.generator-more > summary').click();
  await page.getByRole('button', { name: 'Offline PMO Engine', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Informe semanal de estado', exact: true }),
  ).toBeVisible();
  await capture('generator-mobile');
  await writeFile(
    `${destination}/capture-manifest.json`,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        baseURL: base,
        externalAIRequested: external,
        providers,
        storage: 'isolated browser workspace; fictional starter projects; no cloud account',
        mobileGeneration: 'forced offline',
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser.close();
}
