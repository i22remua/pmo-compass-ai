import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function demo(page: Page) {
  await page.goto('/start');
  await expect(page.getByRole('heading', { name: 'Vista general' })).toBeVisible();
  await page.getByRole('button', { name: 'Añadir proyectos de ejemplo', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Proyectos de ejemplo añadidos', exact: true }),
  ).toBeDisabled();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
}

test('public landing, real language switch and honest demo login', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Tu proyecto,/ })).toBeVisible();
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Your project,/ })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeDisabled();
  await page.getByRole('link', { name: 'Start now' }).click();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect(page.locator('.project-card')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/\bdemo\b/i);
  await page.getByRole('button', { name: 'Add starter projects', exact: true }).click();
  await expect(
    page.locator('.project-card').filter({ hasText: 'Horizon · Digital transformation' }),
  ).toBeVisible();
  await noOverflow(page);
});

test('project CRUD, saved notes, AI generation, copy, export and cascade deletion', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await demo(page);
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).first().click();
  await page.getByLabel('Nombre del proyecto', { exact: true }).fill('Proyecto de prueba E2E');
  await page.getByLabel('Sector', { exact: true }).fill('Logística');
  await page
    .getByLabel('Descripción', { exact: true })
    .fill('Modernizar el seguimiento de entregas.');
  await page.getByLabel('Objetivos', { exact: true }).fill('Conectar 3 almacenes al portal.');
  await page.getByLabel('Fecha de inicio', { exact: true }).fill('2026-09-01');
  await page.getByLabel('Fecha objetivo', { exact: true }).fill('2026-12-01');
  await page
    .getByLabel('Notas del proyecto', { exact: true })
    .fill('El proveedor tiene un retraso de 5 días.');
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page
    .getByRole('link', { name: /Proyecto de prueba E2E/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Proyecto de prueba E2E' })).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  const projectUrl = page.url();
  await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
  await page.getByLabel('Nombre del proyecto', { exact: true }).fill('Proyecto E2E actualizado');
  await page.getByRole('button', { name: 'Guardar proyecto', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Proyecto E2E actualizado' })).toBeVisible();
  await page.getByRole('tab', { name: 'Notas del proyecto' }).click();
  await page
    .getByLabel('Notas del proyecto', { exact: true })
    .fill('Vendor integration delayed by 5 days.\nAna must confirm the recovery plan.');
  await page.getByRole('button', { name: 'Generar con IA' }).click();
  await expect(page).toHaveURL(/\/generator\?project=/);
  await page
    .getByRole('combobox', { name: 'Elige un documento', exact: true })
    .selectOption('risk_register');
  await page.getByLabel('Idioma del documento').selectOption('en');
  await page.locator('.generator-context-options > summary').click();
  await page
    .getByLabel('Contexto adicional')
    .fill('Sponsor requested a scope change: add live tracking.');
  await page.getByRole('button', { name: 'Generar documento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Risk Register', exact: true })).toBeVisible();
  await expect(page.locator('.markdown-content')).toContainText(
    'Vendor integration delayed by 5 days',
  );
  await page.getByRole('button', { name: 'Copiar', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('# Risk Register');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar .md', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toContain('risk_register-en.md');
  expect(await readFile((await download.path())!, 'utf8')).toContain(
    'scope change: add live tracking',
  );
  await page.getByRole('button', { name: 'Guardar documento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Guardado', exact: true })).toBeDisabled();
  await page.goto('/documents');
  await page.getByPlaceholder('Buscar documentos…').fill('Proyecto E2E actualizado');
  await expect(page.locator('.document-table-row')).toHaveCount(1);
  await page.locator('.document-table-row').click();
  await expect(page).toHaveURL(/\/documents\/[^/]+$/);
  await page.reload();
  await expect(page.locator('.markdown-content')).toContainText(
    'Vendor integration delayed by 5 days',
  );
  await page.goto(projectUrl);
  await page.getByRole('tab', { name: 'Notas del proyecto' }).click();
  await expect(page.getByLabel('Notas del proyecto', { exact: true })).toHaveValue(
    /Ana must confirm/,
  );
  await page.getByRole('button', { name: 'Eliminar proyecto' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('link', { name: /Proyecto E2E actualizado/ })).toHaveCount(0);
  await page.goto('/documents');
  await page.getByPlaceholder('Buscar documentos…').fill('Proyecto E2E actualizado');
  await expect(page.getByRole('heading', { name: 'Sin resultados' })).toBeVisible();
});

test('document filters, detail deletion and backend failure feedback', async ({ page }) => {
  await demo(page);
  await page.goto('/documents');
  await expect(page.locator('.document-table-row').first()).toBeVisible();
  const initialCount = await page.locator('.document-table-row').count();
  await page.getByLabel('Documento', { exact: true }).selectOption('risk_register');
  await expect(page.locator('.document-table-row')).toHaveCount(1);
  await page.locator('.document-table-row').click();
  await page.getByRole('button', { name: 'Eliminar documento' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page).toHaveURL(/\/documents$/);
  await expect(page.locator('.document-table-row')).toHaveCount(initialCount - 1);
  await page.goto('/generator');
  await page.route('**/api/v1/workspace/generate', (route) => route.abort('failed'));
  await page.getByRole('button', { name: 'Generar documento', exact: true }).click();
  await expect(page.locator('.error-banner')).toContainText('No se puede conectar');
  await expect(page.getByRole('button', { name: 'Generar documento', exact: true })).toBeEnabled();
});

test('demo examples cover the requested sectors and loading additions preserves existing work', async ({
  page,
}) => {
  await demo(page);
  await page.goto('/projects');
  await expect(page.locator('.project-card')).toHaveCount(6);
  for (const sector of ['Tecnología', 'Construcción', 'Eventos', 'Logística']) {
    await expect(page.locator('.project-card').filter({ hasText: sector })).toHaveCount(1);
  }
  // Model a returning visitor with the previous four examples and their own saved work.
  const previous = await page.evaluate(() => {
    const uid = localStorage.getItem('pmo.demo.active')!;
    const key = `pmo.workspace.v1.${uid}`;
    const data = JSON.parse(localStorage.getItem(key)!);
    data.projects = data.projects.slice(0, 4);
    data.documents = data.documents.filter((d: { projectId: string }) =>
      data.projects.some((p: { id: string }) => p.id === d.projectId),
    );
    data.projects[0].notes = 'Custom notes: keep the revised sponsor decision.';
    data.projects.push({ ...data.projects[0], id: 'visitor-project', name: 'Visitor project' });
    data.documents.push({
      ...data.documents[0],
      id: 'visitor-document',
      projectId: 'visitor-project',
      generatedContent: '# Visitor draft\nKeep my reviewed content.',
    });
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  });
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.goto('/dashboard');
  await expect(
    page.getByRole('heading', { name: 'Starter Projects · optional', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add starter projects', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Starter projects added', exact: true }),
  ).toBeDisabled();
  await page.reload();
  const current = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem(`pmo.workspace.v1.${localStorage.getItem('pmo.demo.active')}`)!,
    ),
  );
  expect(current.projects).toHaveLength(7);
  expect(current.documents).toHaveLength(7);
  for (const project of previous.projects) expect(current.projects).toContainEqual(project);
  for (const document of previous.documents) expect(current.documents).toContainEqual(document);
  expect(current.projects.find((p: { id: string }) => p.id === 'demo-project-5').sector).toBe(
    'Event',
  );
  expect(current.projects.find((p: { id: string }) => p.id === 'demo-project-6').sector).toBe(
    'Logistics',
  );
  await page.goto('/generator?project=demo-project-6');
  await page.getByText('Review the source notes', { exact: true }).click();
  await expect(page.locator('.generator-source-preview')).toContainText('delayed by 4 days');
  await page
    .getByRole('combobox', { name: 'Choose a document', exact: true })
    .selectOption('risk_register');
  await page.getByRole('button', { name: 'Generate document', exact: true }).click();
  await expect(page.locator('.markdown-content')).toContainText(
    'carrier onboarding is delayed by 4 days',
  );
});

test('mobile navigation and generator fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await noOverflow(page);
  await demo(page);
  await noOverflow(page);
  await page.getByRole('button', { name: 'Workspace', exact: true }).click();
  await page.locator('.sidebar').getByRole('link', { name: 'Generador IA' }).click();
  await expect(page.getByRole('heading', { name: 'Generar un documento' })).toBeVisible();
  await noOverflow(page);
  await page.getByRole('button', { name: 'Generar documento', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Informe semanal de estado', exact: true }),
  ).toBeVisible();
  await noOverflow(page);
});

test('logout protects workspace and a separate browser has no session', async ({
  page,
  browser,
}) => {
  await demo(page);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  const another = await browser.newContext();
  const otherPage = await another.newPage();
  await otherPage.goto('http://127.0.0.1:3000/projects/demo-project-1');
  await expect(otherPage).toHaveURL(/\/login$/);
  await another.close();
});

test('appearance follows the system and preserves explicit choices across reloads and routes', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await demo(page);
  await page.goto('/settings');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Sistema', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Oscuro', exact: true }).click();
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('public and private pages fit small phones, tablets and desktop in both themes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await demo(page);
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/dashboard', '/generator', '/documents', '/settings']) {
      await page.goto(route);
      await expect(page.getByRole('button', { name: 'Cambiar tema', exact: true })).toBeVisible();
      await noOverflow(page);
      await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click();
      await noOverflow(page);
    }
  }
});

test('a description creates a real project and supports inference and Copilot', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/start');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('.project-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).first().click();
  await page
    .getByLabel('Descripción', { exact: true })
    .fill('Proyecto para implantar un ERP en una empresa industrial durante cuatro meses.');
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.project-card').first().click();
  await page.getByRole('tab', { name: 'AI Project Intelligence', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'AI Project Intelligence', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.intelligence-risks')).toContainText('Resistencia al cambio');
  await expect(page.locator('.intelligence-risks')).toContainText('Migración de datos incompleta');
  await page
    .getByLabel('Tu pregunta sobre el proyecto')
    .fill('¿Qué podría retrasar este proyecto?');
  await page.getByRole('button', { name: 'Preguntar a PMO Compass', exact: true }).click();
  await expect(page.locator('.copilot-answer')).toContainText('Offline PMO Engine');
  const answer = page.locator('.copilot-answer');
  await expect(answer.locator('.markdown-content')).not.toContainText('Información faltante');
  await expect(answer.locator('.copilot-context')).not.toHaveAttribute('open', '');
  await answer.getByText('Ver supuestos, información faltante y avisos', { exact: true }).click();
  await expect(answer.locator('.copilot-context')).toContainText('Información faltante');
  await page
    .locator('.copilot-answer')
    .getByRole('button', { name: 'Copiar', exact: true })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('PMO Copilot');
  expect(await page.evaluate(() => navigator.clipboard.readText())).not.toContain(
    'Información faltante',
  );
  await page.reload();
  await page.getByRole('tab', { name: 'AI Project Intelligence', exact: true }).click();
  await expect(page.locator('.intelligence-risks')).toContainText('Resistencia al cambio');
});
