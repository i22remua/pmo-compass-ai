import { expect, test } from '@playwright/test';
import type { GenerationResult } from '../frontend/src/types';

test.beforeEach(async ({ page }) => {
  // Keep the existing frontend configuration; forward actual HTTP to the isolated Ollama-mode API.
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const response = await route.fetch({ url: `http://127.0.0.1:8002${path}` });
    await route.fulfill({ response });
  });
});

for (const language of ['es', 'en'] as const) {
  test(`Ollama failure, explicit demo fallback and saved provenance (${language})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    if (language === 'en') await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    if (language === 'en') await page.getByRole('button', { name: 'EN', exact: true }).click();
    await page.goto('/demo');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/generator?project=demo-project-2');
    const es = language === 'es';
    const extraContext = es
      ? 'Ana debe confirmar la recuperación antes del viernes. Cambio de alcance: recordatorios SMS.'
      : 'Ana must confirm recovery by Friday. Scope change: SMS reminders.';
    await page
      .getByRole('button', { name: es ? 'Registro de riesgos' : 'Risk Register', exact: true })
      .click();
    await page.getByLabel(es ? 'Contexto adicional' : 'Additional context').fill(extraContext);
    await expect(page.locator('.provider-badge')).toContainText('Ollama · llama3.1');
    const requests: Record<string, unknown>[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/v1/generate')
        requests.push(request.postDataJSON());
    });
    const failedResponse = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/v1/generate',
    );
    await page
      .getByRole('button', { name: es ? 'Generar documento' : 'Generate document', exact: true })
      .click();
    expect((await failedResponse).status()).toBe(503);
    await expect(page.locator('.error-banner')).toContainText('Ollama');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await expect(page.locator('.markdown-content')).toHaveCount(0);
    await expect(page.getByLabel(es ? 'Contexto adicional' : 'Additional context')).toHaveValue(
      extraContext,
    );
    expect(requests).toHaveLength(1);
    const fallbackResponse = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/v1/generate',
    );
    await page
      .getByRole('button', {
        name: es ? 'Continuar con plantillas demo' : 'Continue with demo templates',
        exact: true,
      })
      .click();
    const result = (await (await fallbackResponse).json()) as GenerationResult;
    expect(result.provider).toBe('demo');
    expect(result.fallbackFrom).toBe('ollama');
    expect(requests).toHaveLength(2);
    expect(requests[1]).toEqual({ ...requests[0], useDemoFallback: true });
    await expect(page.locator('.markdown-content')).toContainText('SMS');
    await expect(page.locator('.output-meta')).toContainText('demo');
    await expect(page.locator('.output-warnings')).toContainText(
      es ? 'alternativa a Ollama' : 'fallback for Ollama',
    );
    await expect(page.locator('.provider-badge')).toContainText('Ollama');
    await page
      .getByRole('button', { name: es ? 'Guardar documento' : 'Save document', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: es ? 'Guardado' : 'Saved', exact: true }),
    ).toBeDisabled();
    await page.goto(`/documents/${result.id}`);
    await page.reload();
    await expect(page.locator('.markdown-content')).toContainText('SMS');
    await expect(page.locator('.document-detail-toolbar')).toContainText(
      es ? 'Plantillas locales' : 'Local templates',
    );
    await expect(page.locator('.output-warnings')).toContainText(
      es ? 'alternativa a Ollama' : 'fallback for Ollama',
    );
  });
}
