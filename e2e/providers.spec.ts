import { expect, test } from '@playwright/test';
import type { GenerationResult } from '../frontend/src/types';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const response = await route.fetch({ url: `http://127.0.0.1:8002${path}` });
    await route.fulfill({ response });
  });
});

for (const language of ['es', 'en'] as const) {
  test(`Automatic offline fallback preserves input and saved provenance (${language})`, async ({
    page,
  }) => {
    const es = language === 'es';
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    if (!es) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    if (!es) await page.getByRole('button', { name: 'EN', exact: true }).click();
    await page.goto('/start');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page
      .getByRole('button', {
        name: es ? 'Añadir proyectos de ejemplo' : 'Add starter projects',
        exact: true,
      })
      .click();
    await expect(
      page.getByRole('button', {
        name: es ? 'Proyectos de ejemplo añadidos' : 'Starter projects added',
        exact: true,
      }),
    ).toBeDisabled();
    await page.goto('/generator?project=demo-project-2');
    const extraContext = es
      ? 'Ana debe confirmar la recuperación antes del viernes. Cambio de alcance: recordatorios SMS.'
      : 'Ana must confirm recovery by Friday. Scope change: SMS reminders.';
    await page
      .getByRole('button', { name: es ? 'Registro de riesgos' : 'Risk Register', exact: true })
      .click();
    await page.getByLabel(es ? 'Contexto adicional' : 'Additional context').fill(extraContext);
    const generated = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/v1/workspace/generate',
    );
    await page
      .getByRole('button', { name: es ? 'Generar documento' : 'Generate document', exact: true })
      .click();
    const response = await generated;
    expect(response.status()).toBe(200);
    const result = (await response.json()) as GenerationResult;
    expect(result.provider).toBe('offline');
    expect(result.fallbackFrom).toBe('ollama');
    await expect(page.locator('.markdown-content')).toContainText('SMS');
    await expect(page.locator('.output-meta')).toContainText('Offline PMO Engine');
    await expect(page.locator('.output-warnings')).toContainText(
      es ? 'no está disponible temporalmente' : 'temporarily unavailable',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page
      .getByRole('button', { name: es ? 'Guardar documento' : 'Save document', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: es ? 'Guardado' : 'Saved', exact: true }),
    ).toBeDisabled();
    await page.goto(`/documents/${result.id}`);
    await page.reload();
    await expect(page.locator('.markdown-content')).toContainText('SMS');
    await expect(page.locator('.document-detail-toolbar')).toContainText('Offline PMO Engine');
    await expect(page.locator('.output-warnings')).toContainText(
      es ? 'no está disponible temporalmente' : 'temporarily unavailable',
    );
  });
}
