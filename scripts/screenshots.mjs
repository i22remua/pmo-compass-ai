import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const destination = 'docs/screenshots';
await mkdir(destination, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1160 },
  colorScheme: 'light',
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const base = 'http://127.0.0.1:3000';
const capture = async (name, fullPage = true) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
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
  await expect(page.getByRole('heading', { name: /Less project noise/ })).toBeVisible();
  await capture('landing-en');
  await capture('landing-hero-en', false);
  await page.getByRole('button', { name: 'Switch theme', exact: true }).click();
  await page.reload();
  await capture('landing-dark-en');
  await page.getByRole('button', { name: 'Switch theme', exact: true }).click();
  await page.getByRole('button', { name: 'ES', exact: true }).click();
  await page.goto(`${base}/demo`);
  await expect(page.getByRole('heading', { name: /Qué bien verte/ })).toBeVisible();
  await capture('dashboard-es');
  await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click();
  await page.reload();
  await capture('dashboard-dark-es');
  await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click();
  await page.goto(`${base}/generator?project=demo-project-2`);
  await page.getByRole('button', { name: 'Registro de riesgos', exact: true }).click();
  await page.getByLabel('Idioma del documento').selectOption('en');
  await page
    .getByLabel('Contexto adicional')
    .fill(
      'Prepare the sponsor review. Focus on the integration delay and the proposed SMS reminders.',
    );
  await page.getByRole('button', { name: 'Generar documento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Risk Register', exact: true })).toBeVisible();
  await capture('generator-risk-register');
  await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click();
  await capture('generator-dark-risk-register');
  await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await capture('landing-mobile');
  await page.goto(`${base}/dashboard`);
  await expect(page.getByRole('heading', { name: /Qué bien verte/ })).toBeVisible();
  await capture('dashboard-mobile');
  await page.goto(`${base}/generator?project=demo-project-1`);
  await page.getByRole('button', { name: 'Generar documento', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Informe semanal de estado', exact: true }),
  ).toBeVisible();
  await capture('generator-mobile');
} finally {
  await browser.close();
}
