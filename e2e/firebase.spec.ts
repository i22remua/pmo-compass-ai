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
  await page.goto('/case-study');
  const publicGeneration = page.waitForRequest('**/api/v1/workspace/generate');
  await page.getByRole('button', { name: 'Generar ahora con IA', exact: true }).click();
  expect((await publicGeneration).headers().authorization).toBeUndefined();
  await expect(page.locator('.case-provenance')).toContainText('Generado ahora');
  await page.goto('/dashboard');
  await expect(page.locator('.project-card')).toHaveCount(0);
  await expect(page.locator('.mode-cloud')).toBeVisible();

  await expect(page.getByRole('heading', { name: es.noProjects })).toBeVisible();
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).first().click();
  await page.getByLabel('Nombre del proyecto').fill('Proyecto privado de Alice');
  await page.locator('.project-form-details > summary').click();
  await page.getByLabel('Sector', { exact: true }).fill('Tecnología');
  await page
    .getByLabel('Notas del proyecto', { exact: true })
    .fill('La integración tiene un retraso de 5 días. Ana debe confirmar el plan.');
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await page.locator('.project-card').filter({ hasText: 'Proyecto privado de Alice' }).click();
  await expect(page.getByRole('heading', { name: 'Proyecto privado de Alice' })).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  const privateURL = page.url();
  await page.getByRole('tab', { name: 'Fuentes y privacidad' }).click();
  await page.locator('.source-transcript > summary').click();
  await page
    .getByLabel('Transcripción de reunión')
    .fill('La migración tiene un retraso de 8 días.');
  await page.getByRole('button', { name: 'Extraer fragmentos' }).click();
  await page.getByRole('checkbox', { name: /Incluir fragmento/ }).check();
  await page.getByRole('button', { name: 'Guardar selección' }).click();
  await expect(page.locator('.source-record')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Seguimiento PMO' }).click();
  await page.getByRole('button', { name: 'Registrar elemento' }).click();
  await page.getByLabel('Asunto', { exact: true }).fill('Confirmar recuperación privada');
  await page.getByLabel('Vencimiento confirmado').fill('2020-01-01');
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  await expect(page.locator('.tracking-record')).toHaveCount(1);
  await page.reload();
  await page.getByRole('tab', { name: 'Seguimiento PMO' }).click();
  await expect(page.locator('.tracking-record')).toContainText('Confirmar recuperación privada');
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  await page
    .locator('.brief-next')
    .getByRole('button', { name: 'Revisar y registrar acción' })
    .click();
  await expect(page.getByRole('dialog', { name: 'Revisar propuesta' })).toBeVisible();
  const proposalTitle = await page.getByLabel('Asunto', { exact: true }).inputValue();
  await expect(page.getByLabel('Vencimiento confirmado')).toHaveValue('');
  await page.getByRole('button', { name: 'Guardar registro', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page
    .locator('.brief-next')
    .getByRole('button', { name: /Ver registro/ })
    .click();
  await expect(page.locator('.record-targeted')).toContainText(proposalTitle);
  await expect(page.locator('.tracking-record')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.tracking-record')).toHaveCount(2);
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  await expect(
    page.locator('.brief-next').getByRole('button', { name: /Ver registro/ }),
  ).toBeVisible();
  await page.locator('.project-review > summary').click();
  await page.getByRole('button', { name: 'Guardar revisión', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Actualizar referencia', exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.locator('.project-review > summary').click();
  await expect(
    page.getByRole('button', { name: 'Actualizar referencia', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Crear documento' }).click();
  await page
    .getByRole('combobox', { name: 'Elige un documento', exact: true })
    .selectOption('risk_register');
  const generationRequest = page.waitForRequest(
    (request) => request.url().endsWith('/api/v1/generate') && request.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Generar documento', exact: true }).click();
  const sent = await generationRequest;
  expect(sent.headers().authorization).toMatch(/^Bearer /);
  expect(sent.postDataJSON().project.aiAccess).toBe('offline');
  expect(sent.postDataJSON().sourceExcerpts).toHaveLength(1);
  await expect(
    page.getByRole('heading', { name: 'Registro de riesgos', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Guardar documento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Guardado', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Volver a generar', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar documento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Guardado', exact: true })).toBeDisabled();
  await page.goto('/documents');
  await expect(page.locator('.document-table-row')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.document-table-row')).toHaveCount(2);
  await page.locator('.document-table-row').first().click();
  await page.getByRole('button', { name: 'Comparar entregas', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Comparar entregas' })).toBeVisible();
  await expect(page.getByLabel('Entrega anterior', { exact: true }).locator('option')).toHaveCount(
    1,
  );
  await page.getByRole('button', { name: 'Ver documento', exact: true }).click();
  await expect(page.locator('.markdown-content')).toBeVisible();

  const bob = await browser.newContext();
  const bobPage = await bob.newPage();
  await register(bobPage, 'Bob', 'bob@pmo-test.example');
  await expect(bobPage.locator('.project-card')).toHaveCount(0);
  await expect(
    bobPage.getByRole('button', { name: /Sin registros Acciones vencidas/ }),
  ).toBeVisible();
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
  await page.getByRole('tab', { name: 'Fuentes y privacidad' }).click();
  await expect(page.locator('.source-record')).toHaveCount(1);
  await page.getByRole('button', { name: 'Eliminar proyecto' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.goto('/documents');
  await expect(page.getByRole('heading', { name: es.noDocuments })).toBeVisible();
  for (const collection of ['sources', 'records', 'reviews']) {
    const remaining = await request.get(
      `http://127.0.0.1:8085/v1/projects/demo-pmo-compass/databases/(default)/documents/${collection}`,
      { headers: { Authorization: 'Bearer owner' } },
    );
    expect(remaining.ok()).toBe(true);
    expect((await remaining.json()).documents || []).toHaveLength(0);
  }
});

test('public demo still generates local templates when private generation requires Firebase', async ({
  page,
}) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Añadir proyectos de ejemplo', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(4);
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
  await page.locator('.project-form-details > summary').click();
  await page.getByLabel('Sector', { exact: true }).fill('Technology');
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click();
  await page.locator('.starter-options > summary').click();
  await page.getByRole('link', { name: 'Explorar espacio de trabajo' }).click();
  await expect(page.getByRole('heading', { name: 'Vista general', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Añadir proyectos de ejemplo', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(4);
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

test('account deletion requires reauthentication and removes owned cloud data', async ({
  page,
  request,
}) => {
  await request.delete('http://127.0.0.1:9099/emulator/v1/projects/demo-pmo-compass/accounts');
  await request.delete(
    'http://127.0.0.1:8085/emulator/v1/projects/demo-pmo-compass/databases/(default)/documents',
  );
  const email = 'delete-me@pmo-test.example';
  await register(page, 'Delete me', email);
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).first().click();
  await page.getByLabel('Nombre del proyecto').fill('Account deletion project');
  await page.locator('.project-form-details > summary').click();
  await page.getByLabel('Sector', { exact: true }).fill('Technology');
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(1);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Eliminar cuenta y datos', exact: true }).click();
  await page.getByLabel('Contraseña', { exact: true }).fill('Compass-test-2026!');
  await page.getByLabel('Escribe tu email para confirmar').fill(email);
  await page.getByRole('button', { name: 'Eliminar permanentemente', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('Compass-test-2026!');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.locator('.error-banner')).toBeVisible();
  for (const collection of ['projects', 'documents', 'sources', 'records', 'reviews', 'users']) {
    const remaining = await request.get(
      `http://127.0.0.1:8085/v1/projects/demo-pmo-compass/databases/(default)/documents/${collection}`,
      { headers: { Authorization: 'Bearer owner' } },
    );
    expect((await remaining.json()).documents || []).toHaveLength(0);
  }
});
