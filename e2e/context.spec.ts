import { expect, test, type Page } from '@playwright/test';
import { zipSync, strToU8 } from 'fflate';
import AxeBuilder from '@axe-core/playwright';

async function project(page: Page) {
  await page.goto('/start');
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click();
  await page.getByLabel('Nombre del proyecto', { exact: true }).fill('Contexto verificable');
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await page.locator('.project-card').filter({ hasText: 'Contexto verificable' }).click();
  await page.getByRole('tab', { name: 'Fuentes y privacidad' }).click();
}

function pdf() {
  const stream = 'BT /F1 12 Tf 40 720 Td (Vendor delayed by 12 days.) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(body));
    body += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const start = Buffer.byteLength(body);
  body += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => `${String(n).padStart(10, '0')} 00000 n \n`)
    .join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(body);
}

test('real PDF, DOCX and TXT extraction stays local and retains locators', async ({ page }) => {
  await project(page);
  const sent: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST') sent.push(r.postData() || '');
  });
  const xml =
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Vendor delayed by 12 days.</w:t></w:r></w:p></w:body></w:document>';
  const fixtures = [
    { name: 'brief.pdf', mimeType: 'application/pdf', buffer: pdf() },
    {
      name: 'minutes.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from(zipSync({ 'word/document.xml': strToU8(xml) })),
    },
    {
      name: 'meeting.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Vendor delayed by 12 days.\nPrivate unrelated payroll detail.'),
    },
  ];
  for (const file of fixtures) {
    await page.locator('#context-upload').setInputFiles(file);
    await expect(page.getByRole('textbox', { name: 'Fragmento', exact: true }).first()).toHaveValue(
      /Vendor delayed/,
    );
    await expect(page.locator('.source-review')).toContainText(
      file.name.endsWith('.pdf') ? 'p. 1' : '¶ 1',
    );
  }
  expect(sent).toEqual([]);
  await page
    .getByRole('checkbox', { name: /Incluir fragmento/ })
    .first()
    .check();
  await page
    .getByRole('textbox', { name: 'Fragmento', exact: true })
    .first()
    .fill('Vendor delayed by 8 days.');
  await page.getByRole('button', { name: 'Guardar selección' }).click();
  await expect(page.locator('.source-record')).toHaveCount(1);
  await page.reload();
  await page.getByRole('tab', { name: 'Fuentes y privacidad' }).click();
  await page.locator('.source-record summary').click();
  await expect(page.locator('.source-record')).toContainText('Vendor delayed by 8 days.');
  await expect(page.locator('.source-record')).toContainText('Texto revisado');
  await expect(page.locator('.source-record')).not.toContainText('payroll');
  const request = page.waitForRequest('**/api/v1/workspace/generate');
  await page.getByRole('button', { name: 'Generar con IA' }).click();
  await page.getByRole('button', { name: 'Generar documento', exact: true }).click();
  const body = (await request).postDataJSON();
  expect(body.project.aiAccess).toBe('offline');
  expect(body.externalContextConsent).toBe(false);
  expect(body.sourceExcerpts).toHaveLength(1);
  expect(JSON.stringify(body)).not.toContain('payroll');
  await expect(page.locator('.markdown-content')).toContainText('Fuentes del contexto');
  await expect(page.locator('.markdown-content')).toContainText('Vendor delayed by 8 days.');
  await page.getByRole('button', { name: 'Guardar documento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Guardado', exact: true })).toBeDisabled();
});

test('invalid, empty and oversized files are rejected without storing them', async ({ page }) => {
  await project(page);
  for (const file of [
    { name: 'fake.pdf', buffer: Buffer.from('not a PDF') },
    { name: 'empty.txt', buffer: Buffer.from('   ') },
    { name: 'large.txt', buffer: Buffer.alloc(5_000_001, 'x') },
    {
      name: 'broken.docx',
      buffer: Buffer.from(zipSync({ 'word/document.xml': strToU8('<!DOCTYPE foo><foo/>') })),
    },
    {
      name: 'bomb.docx',
      buffer: Buffer.from(zipSync({ 'word/document.xml': strToU8('x'.repeat(2_000_001)) })),
    },
  ]) {
    await page
      .locator('#context-upload')
      .setInputFiles({ ...file, mimeType: 'application/octet-stream' });
    await expect(page.locator('.source-workspace').getByRole('alert')).toBeVisible();
    await expect(page.locator('.source-review')).toHaveCount(0);
    await expect(page.locator('.source-record')).toHaveCount(0);
  }
});

test('new sources revoke consent and a stale generator re-reads the privacy choice', async ({
  page,
}) => {
  await project(page);
  const allow = async () => {
    await page.getByRole('button', { name: 'Autorizar IA externa', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Autorizar IA externa', exact: true })
      .click();
    await expect(page.locator('.privacy-setting')).toContainText('IA externa autorizada');
  };
  await allow();
  await page.locator('.source-transcript > summary').click();
  await page
    .getByLabel('Transcripción de reunión')
    .fill('El proveedor tiene un retraso confirmado.');
  await page.getByRole('button', { name: 'Extraer fragmentos' }).click();
  await page.getByRole('checkbox', { name: /Incluir fragmento/ }).check();
  await page.getByRole('button', { name: 'Guardar selección' }).click();
  await expect(page.locator('.privacy-setting')).toContainText('Privado · motor interno');
  await allow();
  await page.getByRole('button', { name: 'Generar con IA' }).click();
  // Simulate privacy being revoked in another tab while this generator remains open.
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) => key.startsWith('pmo.workspace.v1.'))!;
    const data = JSON.parse(localStorage.getItem(key)!);
    data.projects[0].aiAccess = 'offline';
    localStorage.setItem(key, JSON.stringify(data));
  });
  const outgoing = page.waitForRequest('**/api/v1/workspace/generate');
  await page.getByRole('button', { name: 'Generar documento', exact: true }).click();
  const body = (await outgoing).postDataJSON();
  expect(body.project.aiAccess).toBe('offline');
  expect(body.externalContextConsent).toBe(false);
  await expect(page.locator('.markdown-content')).toContainText('Fuentes del contexto');
});

test('confirmed tracking records drive filters, closure updates counts, mobile is usable', async ({
  page,
}) => {
  await project(page);
  await page.getByRole('tab', { name: 'Seguimiento PMO' }).click();
  for (const [kind, title] of [
    ['action', 'Confirmar integración'],
    ['decision', 'Decidir alcance'],
    ['risk', 'Migración incompleta'],
  ]) {
    await page.getByRole('button', { name: 'Registrar elemento' }).click();
    await page.getByLabel('Tipo de registro').selectOption(kind);
    await page.getByLabel('Asunto', { exact: true }).fill(title);
    if (kind === 'action') await page.getByLabel('Vencimiento confirmado').fill('2020-01-01');
    if (kind === 'risk') await page.getByLabel('Nivel de riesgo confirmado').selectOption('high');
    await page.getByRole('button', { name: 'Guardar registro' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: /01 Acciones vencidas/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /01 Riesgos altos/ })).toBeVisible();
  await page.getByRole('button', { name: /Decisiones pendientes/ }).click();
  await expect(page.locator('#portfolio-results')).toContainText('Decidir alcance');
  await expect(page.locator('#portfolio-results')).not.toContainText('Confirmar integración');
  await page.getByRole('link', { name: /Decidir alcance/ }).click();
  await expect(page.getByRole('tab', { name: 'Seguimiento PMO' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page
    .locator('.tracking-record')
    .filter({ hasText: 'Decidir alcance' })
    .getByRole('button', { name: 'Cerrar elemento' })
    .click();
  await expect(page.locator('.record-closed')).toContainText('Decidir alcance');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Seguimiento PMO', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('tab', { name: 'Fuentes y privacidad' }).click();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: /00 Decisiones pendientes/ })).toBeVisible();
});
