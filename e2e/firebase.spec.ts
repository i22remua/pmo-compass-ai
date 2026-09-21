import { expect, test, type Page } from '@playwright/test';
import { es } from '../frontend/src/locales/es';

async function register(page: Page, name: string, email: string) {
  await page.goto('http://127.0.0.1:3001/login');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.getByLabel('Nombre completo').fill(name);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('Compass-test-2026!');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Vista general', exact: true })).toBeVisible();
  await expect(page.locator('.sidebar-user strong')).toHaveText(name);
}

test('Firebase registration, authenticated generation, persistence, two-account isolation and login', async ({
  page,
  browser,
  request,
}) => {
  await request.delete('http://127.0.0.1:9099/emulator/v1/projects/demo-pmo-compass/accounts');
  await request.delete(
    'http://127.0.0.1:8085/emulator/v1/projects/demo-pmo-compass/databases/(default)/documents',
  );
  await register(page, 'Alice', 'alice@pmo-test.example');
  await expect(page.getByRole('heading', { name: es.noProjects })).toBeVisible();
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).first().click();
  await page.getByLabel('Nombre del proyecto').fill('Proyecto privado de Alice');
  await page.getByLabel('Sector', { exact: true }).fill('Tecnología');
  await page
    .getByLabel('Notas del proyecto', { exact: true })
    .fill('La integración tiene un retraso de 5 días. Ana debe confirmar el plan.');
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await page.locator('.project-card').filter({ hasText: 'Proyecto privado de Alice' }).click();
  await expect(page.getByRole('heading', { name: 'Proyecto privado de Alice' })).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  const privateURL = page.url();
  await page.getByRole('button', { name: 'Generar con IA' }).click();
  await page
    .getByRole('combobox', { name: 'Elige un documento', exact: true })
    .selectOption('risk_register');
  const generationRequest = page.waitForRequest(
    (request) => request.url().endsWith('/api/v1/generate') && request.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Generar documento', exact: true }).click();
  expect((await generationRequest).headers().authorization).toMatch(/^Bearer /);
  await expect(
    page.getByRole('heading', { name: 'Registro de riesgos', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Guardar documento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Guardado', exact: true })).toBeDisabled();
  await page.goto('/documents');
  await expect(page.locator('.document-table-row')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.document-table-row')).toHaveCount(1);

  const bob = await browser.newContext();
  const bobPage = await bob.newPage();
  await register(bobPage, 'Bob', 'bob@pmo-test.example');
  await expect(bobPage.locator('.project-card')).toHaveCount(0);
  await bobPage.goto(privateURL);
  await expect(
    bobPage.getByRole('heading', { name: 'Proyecto no disponible', exact: true }),
  ).toBeVisible();
  await bobPage.goto('http://127.0.0.1:3001/documents');
  await expect(bobPage.locator('.document-table-row')).toHaveCount(0);
  await bob.close();

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3001/');
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('alice@pmo-test.example');
  await page.getByLabel('Contraseña', { exact: true }).fill('Compass-test-2026!');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(1);
  await page.goto(privateURL);
  await page.getByRole('button', { name: 'Eliminar proyecto' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.goto('/documents');
  await expect(page.getByRole('heading', { name: es.noDocuments })).toBeVisible();
});

test('public demo still generates local templates when private generation requires Firebase', async ({
  page,
}) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Añadir proyectos de ejemplo', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Proyectos de ejemplo añadidos', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'Vista general' })).toBeVisible();
  await page.goto('/generator');
  await page.getByRole('button', { name: 'Generar documento', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Informe semanal de estado', exact: true }),
  ).toBeVisible();
});

test('entering and restoring the demo leaves the signed-in cloud workspace unchanged', async ({
  page,
}) => {
  await register(page, 'Charlie', 'charlie@pmo-test.example');
  await expect(page.getByRole('button', { name: 'Añadir proyectos de ejemplo' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).first().click();
  await page.getByLabel('Nombre del proyecto').fill('Cloud project to preserve');
  await page.getByLabel('Sector', { exact: true }).fill('Technology');
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(1);
  await page
    .locator('.demo-guide')
    .getByRole('link', { name: 'Explorar espacio de trabajo' })
    .click();
  await expect(page.getByRole('heading', { name: 'Vista general', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Añadir proyectos de ejemplo', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Proyectos de ejemplo añadidos', exact: true }),
  ).toBeDisabled();
  await page.goto('/projects');
  await expect(page.locator('.project-card')).toHaveCount(6);
  await page.goto('/settings');
  await page
    .getByRole('button', { name: 'Reemplazar espacio con proyectos de ejemplo', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Reemplazar espacio con proyectos de ejemplo', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('charlie@pmo-test.example');
  await page.getByLabel('Contraseña', { exact: true }).fill('Compass-test-2026!');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(1);
  await expect(page.locator('.project-card')).toContainText('Cloud project to preserve');
  await page.reload();
  await expect(page.locator('.project-card')).toHaveCount(1);
});
