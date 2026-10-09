import { expect, test, type Page } from '@playwright/test';
import { projectTitle } from '../frontend/src/lib/format';

async function createProject(
  page: Page,
  description = 'Estamos implantando un portal de clientes y tenemos retrasos en las pruebas',
) {
  await page.goto('/start');
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click();
  await page.getByLabel('Descripción', { exact: true }).fill(description);
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.project-card').first().click();
  await expect(page).toHaveURL(/\/projects\/[^/#?]+$/);
}

test('description-only title ends at a readable clause and stays editable', async ({ page }) => {
  await createProject(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Estamos implantando un portal de clientes',
  );
  await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
  await page.getByLabel('Nombre del proyecto', { exact: true }).fill('Portal de clientes');
  await page.getByRole('button', { name: 'Guardar proyecto', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Portal de clientes');
});

test('manual registration blocks an identical record while similar titles remain distinct', async ({
  page,
}) => {
  await createProject(page);
  await page.getByRole('tab', { name: 'Seguimiento PMO', exact: true }).click();
  await page.getByRole('button', { name: 'Registrar elemento', exact: true }).click();
  await page.getByLabel('Asunto', { exact: true }).fill('Revisar pruebas del portal');
  await page.getByRole('button', { name: 'Guardar registro', exact: true }).click();
  await expect(page.locator('.tracking-record')).toHaveCount(1);
  await page.getByRole('button', { name: 'Registrar elemento', exact: true }).click();
  await page.getByLabel('Asunto', { exact: true }).fill('  REVISAR   PRUEBAS DEL PORTAL ');
  await expect(page.getByRole('button', { name: 'Guardar registro', exact: true })).toBeDisabled();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: /Ver registro/ }),
  ).toBeVisible();
  await page.getByLabel('Asunto', { exact: true }).fill('Revisar pruebas del portal móvil');
  await expect(page.getByRole('button', { name: 'Guardar registro', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Guardar registro', exact: true }).click();
  await expect(page.locator('.tracking-record')).toHaveCount(2);
});

test('unsaved notes require a choice before leaving their section', async ({ page }) => {
  await createProject(page);
  await page.getByRole('tab', { name: 'Notas del proyecto', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Notas del proyecto', exact: true })
    .fill('Borrador ficticio sin guardar.');
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Notas sin guardar' })).toBeVisible();
});

async function storedWorkspace(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem(`pmo.workspace.v1.${localStorage.getItem('pmo.demo.uid')}`)!),
  );
}

test('notes can be kept, saved before navigating, or discarded without changing stored data', async ({
  page,
}) => {
  await createProject(page);
  const projectURL = page.url();
  await page.getByRole('tab', { name: 'Notas del proyecto', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Notas del proyecto', exact: true });
  await editor.fill('Notas ficticias por revisar.');
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar editando', exact: true }).click();
  await expect(editor).toHaveValue('Notas ficticias por revisar.');
  expect((await storedWorkspace(page)).projects[0].notes).toBe('');
  await page.locator('.sidebar').getByRole('link', { name: 'Proyectos', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Notas sin guardar' })).toBeVisible();
  await page.getByRole('button', { name: 'Guardar y continuar', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.locator('.project-card').first().click();
  await page.getByRole('tab', { name: 'Notas del proyecto', exact: true }).click();
  await expect(editor).toHaveValue('Notas ficticias por revisar.');
  await editor.fill('Este borrador debe descartarse.');
  await page.getByRole('button', { name: 'Crear documento', exact: true }).click();
  await page.getByRole('button', { name: 'Descartar y continuar', exact: true }).click();
  await expect(page).toHaveURL(/\/generator\?project=/);
  await page.goto(projectURL + '#notes');
  await expect(editor).toHaveValue('Notas ficticias por revisar.');
  await page.reload();
  await expect(editor).toHaveValue('Notas ficticias por revisar.');
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('failed note save retains the draft, stored data and pending navigation', async ({ page }) => {
  await createProject(page);
  await page.getByRole('tab', { name: 'Notas del proyecto', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Notas del proyecto', exact: true })
    .fill('Borrador que no cabe en almacenamiento.');
  const before = await storedWorkspace(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('pmo.workspace.v1.')) throw new DOMException('Full', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar y continuar', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  expect(await storedWorkspace(page)).toEqual(before);
  await page.getByRole('button', { name: 'Continuar editando', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Notas del proyecto', exact: true })).toHaveValue(
    'Borrador que no cabe en almacenamiento.',
  );
});

test('browser back and reload warn only while notes are dirty', async ({ page }) => {
  await createProject(page);
  await page.getByRole('tab', { name: 'Notas del proyecto', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Notas del proyecto', exact: true })
    .fill('Borrador protegido al volver.');
  await page.evaluate(() => history.back());
  await page.getByRole('button', { name: 'Continuar editando', exact: true }).click();
  await expect(page).toHaveURL(/#notes$/);
  const unload = page.waitForEvent('dialog');
  await page.evaluate(() => {
    setTimeout(() => window.location.reload(), 0);
  });
  const dialog = await unload;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  await expect(page.getByRole('textbox', { name: 'Notas del proyecto', exact: true })).toHaveValue(
    'Borrador protegido al volver.',
  );
  await page.evaluate(() => history.back());
  await page.getByRole('button', { name: 'Descartar y continuar', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Resumen', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const width of [375, 390, 768]) {
  test(`mobile sections and bilingual note confirmation remain accessible at ${width}px`, async ({
    page,
  }) => {
    await createProject(page);
    await page.setViewportSize({ width, height: 900 });
    for (const language of ['ES', 'EN']) {
      await page.getByRole('button', { name: language, exact: true }).click();
      const es = language === 'ES';
      const more = page.getByRole('combobox', {
        name: es ? 'Más secciones' : 'More sections',
      });
      await more.selectOption('intelligence');
      await expect(
        page.getByRole('tab', { name: es ? 'Diagnóstico' : 'Diagnosis', exact: true }),
      ).toBeVisible();
      await page
        .getByRole('tab', { name: es ? 'Seguimiento PMO' : 'PMO tracking', exact: true })
        .click();
      await expect(
        page.getByRole('button', {
          name: es ? 'Registrar elemento' : 'Add record',
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByRole('tab', { name: es ? 'Fuentes y privacidad' : 'Sources & privacy', exact: true })
        .click();
      await expect(page.locator('#context-upload')).toBeAttached();
      await more.selectOption('documents');
      await expect(page.getByRole('tabpanel')).toContainText(
        es ? 'Tus documentos, organizados aquí' : 'Your documents, organised here',
      );
      await more.selectOption('notes');
      await page
        .getByRole('textbox', { name: es ? 'Notas del proyecto' : 'Project notes', exact: true })
        .fill('Fictional draft');
      await more.selectOption('documents');
      await expect(
        page.getByRole('dialog', { name: es ? 'Notas sin guardar' : 'Unsaved notes' }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page
        .getByRole('button', {
          name: es ? 'Descartar y continuar' : 'Discard and continue',
          exact: true,
        })
        .click();
    }
  });
}

test('minimal valid context shows insufficient information and missing facts, not a generic risk', async ({
  page,
}) => {
  await createProject(page, 'Prueba');
  await expect(page.locator('.brief-assessment')).toContainText('Sin evaluar');
  await expect(page.locator('.project-brief')).not.toContainText(
    'Criterios de aceptación incompletos',
  );
  await page.getByRole('tab', { name: 'Análisis', exact: true }).click();
  const causes = page.locator('.diagnosis-grid > details').filter({ hasText: 'Causas posibles' });
  await causes.locator('summary').click();
  await expect(causes).toContainText('Información insuficiente para identificar causas.');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('.diagnosis-grid')).toContainText(
    'Insufficient information to identify causes.',
  );
});

test('automatic titles stay valid for abbreviated and long descriptions', () => {
  expect(projectTitle('A. Portal de clientes y revisión de pruebas')).toBe('Portal de clientes');
  const title = projectTitle(
    'Customer portal implementation with revised acceptance tests '.repeat(20),
  );
  expect(title.length).toBeLessThanOrEqual(80);
  expect(title).toMatch(/…$/);
  expect(projectTitle('Implantar un ERP')).toBe('Implantar un ERP');
});
