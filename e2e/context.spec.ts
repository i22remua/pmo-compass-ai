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
  await page.getByRole('button', { name: 'Crear documento' }).click();
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
  await page.getByRole('button', { name: 'Crear documento' }).click();
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
  await expect(page.getByRole('button', { name: /1 Acciones vencidas/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /1 Riesgos altos/ })).toBeVisible();
  await expect(page.locator('.attention-item-main strong')).toHaveText([
    'Confirmar integración',
    'Migración incompleta',
    'Decidir alcance',
  ]);
  await page.getByRole('button', { name: /Decisiones pendientes/ }).click();
  await expect(page.locator('#portfolio-results')).toContainText('Decidir alcance');
  await expect(page.locator('#portfolio-results')).not.toContainText('Confirmar integración');
  await page.getByRole('link', { name: /Decidir alcance/ }).click();
  await expect(page.locator('.record-targeted')).toContainText('Decidir alcance');
  await expect(page.locator('.record-targeted')).toBeFocused();
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
  await expect(page.getByRole('button', { name: /0 Decisiones pendientes/ })).toBeVisible();
});

test('diagnosis labels its basis, contradictions show both sides and scenarios are not predictions', async ({
  page,
}) => {
  await project(page);
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Fecha objetivo', { exact: true }).fill('2026-03-31');
  await page.getByRole('button', { name: 'Guardar proyecto', exact: true }).click();
  await page.getByRole('tab', { name: 'Notas del proyecto' }).click();
  await page
    .getByRole('textbox', { name: 'Notas del proyecto', exact: true })
    .fill(
      'El presupuesto está aprobado. Los costes están pendientes. El proyecto está en plazo. La dependencia de integración termina el 2026-04-15.',
    );
  await page.getByRole('button', { name: 'Guardar notas', exact: true }).click();
  await page.getByRole('tab', { name: 'Seguimiento PMO' }).click();
  await page.getByRole('button', { name: 'Registrar elemento' }).click();
  await page.getByLabel('Asunto', { exact: true }).fill('Resolver bloqueo crítico');
  await page.getByLabel('Vencimiento confirmado').fill('2020-01-01');
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  await page.getByRole('tab', { name: 'Análisis' }).click();
  await expect(page.getByRole('heading', { name: 'Diagnóstico' })).toBeVisible();
  await expect(page.locator('.diagnosis-block')).toContainText('Dato aportado');
  await expect(page.locator('.diagnosis-block')).toContainText('Inferencia IA');
  await expect(page.locator('.diagnosis-block')).toContainText('Información insuficiente');
  await expect(page.getByRole('heading', { name: 'Detector de contradicciones' })).toBeVisible();
  expect(await page.locator('.contradiction-item').count()).toBeGreaterThanOrEqual(3);
  await page.locator('.contradiction-item').first().locator('summary').click();
  await expect(page.locator('.contradiction-item').first()).toContainText('Evidencia A');
  await expect(page.locator('.contradiction-item').first()).toContainText('Evidencia B');
  await page.getByRole('tab', { name: 'Escenarios', exact: true }).click();
  await page
    .getByRole('button', {
      name: '¿Qué ocurre si retrasamos el go-live tres semanas?',
      exact: true,
    })
    .click();
  const scenario = page.waitForRequest('**/api/v1/workspace/generate');
  await page.getByRole('button', { name: 'Explorar escenario', exact: true }).click();
  const body = (await scenario).postDataJSON();
  expect(body.analysisMode).toBe('scenario');
  expect(body.trackingRecords).toHaveLength(1);
  await expect(
    page.getByRole('heading', { name: 'Escenario · no es una predicción', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.scenario-result')).toContainText('Consecuencias plausibles');
  await expect(page.locator('.scenario-result')).toContainText(
    'Datos para una evaluación más fiable',
  );
  const scenarioContent = await page.locator('.scenario-result').innerText();
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  await page.getByRole('tab', { name: 'Análisis', exact: true }).click();
  await page.getByRole('tab', { name: 'Escenarios', exact: true }).click();
  await expect(page.locator('.scenario-result')).toHaveText(scenarioContent, {
    useInnerText: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});

test('analysis tasks retain drafts, prefill a risk without sending and invalidate changed context', async ({
  page,
}) => {
  await page.goto('/start');
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click();
  await page
    .getByLabel('Descripción', { exact: true })
    .fill('Implantar un ERP industrial en cuatro meses.');
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await page.locator('.project-card').first().click();
  const generationRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/v1/workspace/generate'))
      generationRequests.push(request.url());
  });
  await page.getByRole('tab', { name: 'Análisis', exact: true }).click();
  await expect(page.locator('#analysis-panel-diagnosis')).toBeVisible();
  await expect(page.locator('.scenario-panel')).toBeHidden();
  await expect(page.locator('.copilot-panel')).toBeHidden();
  await page.getByRole('tab', { name: 'Diagnóstico', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Riesgos y acciones', exact: true })).toBeFocused();
  await expect(page).toHaveURL(/#risks$/);
  const risk = page
    .locator('#analysis-panel-risks .intelligence-risk')
    .filter({ hasText: 'Resistencia al cambio' })
    .first();
  await risk.locator('summary').click();
  await risk.getByRole('button', { name: 'Consultar este riesgo' }).click();
  const question = page.getByLabel('Tu pregunta sobre el proyecto');
  await expect(question).toBeFocused();
  await expect(question).toHaveValue(/Resistencia al cambio/);
  expect(generationRequests).toHaveLength(0);
  const draft = await question.inputValue();
  await page.getByRole('tab', { name: 'Escenarios', exact: true }).click();
  await page.getByRole('tab', { name: 'Consulta', exact: true }).click();
  await page.goBack();
  await expect(page.locator('.scenario-panel')).toBeVisible();
  await page.goForward();
  await expect(page.locator('.copilot-panel')).toBeVisible();
  await expect(question).toHaveValue(draft);
  await page.getByRole('button', { name: 'Preguntar a PMO Compass', exact: true }).click();
  await expect(page.locator('.copilot-answer')).toBeVisible();
  const answer = await page.locator('.copilot-answer').innerText();
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  await page.getByRole('tab', { name: 'Análisis', exact: true }).click();
  await page.getByRole('tab', { name: 'Consulta', exact: true }).click();
  await expect(question).toHaveValue(draft);
  await expect(page.locator('.copilot-answer')).toHaveText(answer, { useInnerText: true });
  expect(generationRequests).toHaveLength(1);
  await page.getByRole('tab', { name: 'Notas del proyecto', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Notas del proyecto', exact: true })
    .fill('El proveedor ha confirmado un retraso de dos semanas.');
  await page.getByRole('button', { name: 'Guardar notas', exact: true }).click();
  await page.getByRole('tab', { name: 'Análisis', exact: true }).click();
  await page.getByRole('tab', { name: 'Consulta', exact: true }).click();
  await expect(page.locator('.copilot-answer')).toHaveCount(0);
  await expect(
    page.getByText(
      'El contexto ha cambiado. Genera una nueva respuesta con los datos actualizados.',
    ),
  ).toBeVisible();
  await expect(question).toHaveValue(draft);
  await expect(
    page.getByRole('button', { name: 'Preguntar a PMO Compass', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('tablist', { name: 'Analysis views' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Ask', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Ask', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.copilot-panel')).toBeVisible();
});

test('project opens with a grounded brief, shares analysis across tabs and reviews actions before saving', async ({
  page,
}) => {
  const requests: Record<string, unknown>[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/workspace/intelligence')) requests.push(request.postDataJSON());
  });
  await page.goto('/start');
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click();
  await page
    .getByLabel('Descripción', { exact: true })
    .fill('Implantar un ERP en una empresa industrial durante cuatro meses.');
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await page.locator('.project-card').first().click();
  const brief = page.locator('.project-brief');
  await expect(brief).toContainText('Resistencia al cambio');
  await expect(brief).toContainText('Inferencia IA');
  await expect(brief).toContainText('Motor PMO · sin IA externa');
  await expect(brief).toContainText('Sin alertas confirmadas');
  await expect(brief).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.project-context-details')).not.toHaveAttribute('open', '');
  await expect(brief.locator('.brief-columns > section:first-child .diagnosis-line')).toHaveCount(
    3,
  );
  expect(requests).toHaveLength(1);
  expect(requests[0].useOfflineFallback).toBe(true);
  await brief.getByRole('button', { name: /Ver análisis completo/ }).click();
  await page.getByRole('tab', { name: 'Riesgos y acciones', exact: true }).click();
  await expect(page.locator('.intelligence-risks')).toContainText('Resistencia al cambio');
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  expect(requests).toHaveLength(1);
  await brief.getByRole('button', { name: 'Revisar y registrar acción' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Vencimiento confirmado')).toHaveValue('');
  await page.getByRole('button', { name: 'Guardar registro', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(brief).toHaveAttribute('aria-busy', 'false');
  await page.getByRole('tab', { name: 'Seguimiento PMO', exact: true }).click();
  await expect(page.locator('.tracking-record')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(brief).toContainText('Change resistance');
  await expect(brief).toContainText('Suggested next action');
  await expect(brief).not.toContainText('Resistencia al cambio');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const assessment = await brief.locator('.brief-assessment').boundingBox();
  expect(assessment!.y).toBeLessThan(844);
});

test('brief marks changed context as stale on failure and replaces it after a successful retry', async ({
  page,
}) => {
  await project(page);
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  const brief = page.locator('.project-brief');
  await expect(brief).toHaveAttribute('aria-busy', 'false');
  await expect(brief.locator('.brief-assessment')).toBeVisible();
  await page.route('**/api/v1/workspace/intelligence', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ detail: { code: 'network' } }),
    }),
  );
  await page.getByRole('tab', { name: 'Notas del proyecto', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Notas del proyecto', exact: true })
    .fill('El presupuesto está aprobado. Los costes están pendientes.');
  await page.getByRole('button', { name: 'Guardar notas', exact: true }).click();
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  await expect(brief).toContainText('Este análisis está pendiente de actualizar');
  await expect(brief.getByRole('alert')).toBeVisible();
  await expect(brief.locator('.brief-assessment')).toBeVisible();
  await expect(brief.getByRole('button', { name: 'Revisar y registrar acción' })).toBeDisabled();
  await page.unroute('**/api/v1/workspace/intelligence');
  await brief.getByRole('button', { name: 'Actualizar análisis', exact: true }).click();
  await expect(brief).toHaveAttribute('aria-busy', 'false');
  await expect(brief).not.toContainText('Este análisis está pendiente de actualizar');
  await expect(brief.getByRole('alert')).toHaveCount(0);
  await expect(brief.locator('.brief-columns > section:first-child')).toContainText(
    'Inferencia IA',
  );
  await brief.locator('.brief-columns > section:first-child summary').first().click();
  await expect(
    brief
      .locator('.brief-columns > section:first-child .analysis-evidence')
      .filter({ hasText: 'aprobado' }),
  ).toBeVisible();
  await expect(
    brief
      .locator('.brief-columns > section:first-child .analysis-evidence')
      .filter({ hasText: 'pendientes' }),
  ).toBeVisible();
});

test('dashboard distinguishes missing tracking from zero and explains unassessed records in both languages', async ({
  page,
}) => {
  await project(page);
  const projectUrl = page.url().split('#')[0];
  await page.goto('/dashboard');
  const overdue = page.getByRole('button', {
    name: 'Sin registros Acciones vencidas',
    exact: true,
  });
  await expect(overdue).toBeVisible();
  await expect(page.locator('.attention-empty')).toContainText('Aún no hay seguimiento registrado');
  await overdue.click();
  await expect(page.locator('#portfolio-results')).toContainText(
    'Aún no hay registros de este tipo',
  );
  await page.getByRole('button', { name: 'Quitar filtro' }).click();
  await page.goto(`${projectUrl}#tracking`);
  await page.getByRole('button', { name: 'Registrar elemento' }).click();
  await page.getByLabel('Asunto', { exact: true }).fill('Preparar revisión sin fecha comprometida');
  await page.getByRole('button', { name: 'Guardar registro', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Registrar elemento' }).click();
  await page.getByLabel('Tipo de registro').selectOption('risk');
  await page.getByLabel('Asunto', { exact: true }).fill('Riesgo pendiente de evaluar');
  await page.getByRole('button', { name: 'Guardar registro', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/dashboard');
  await expect(
    page.getByRole('button', { name: '0 Acciones vencidas', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '0 Riesgos altos', exact: true })).toBeVisible();
  await expect(page.locator('.attention-gaps')).toContainText(
    'Acciones abiertas sin fecha válida: 1',
  );
  await expect(page.locator('.attention-gaps')).toContainText('Riesgos abiertos sin evaluar: 1');
  await expect(page.locator('.attention-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('button', { name: '0 Overdue actions', exact: true })).toBeVisible();
  await expect(page.locator('.attention-gaps')).toContainText('Open risks not assessed');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});

for (const task of ['copilot', 'scenario'] as const) {
  test(`changing project context cancels an in-flight ${task} and allows retry`, async ({
    page,
  }) => {
    await project(page);
    await page.getByRole('tab', { name: 'Análisis', exact: true }).click();
    const view = task === 'copilot' ? 'Consulta' : 'Escenarios';
    const submit = task === 'copilot' ? 'Preguntar a PMO Compass' : 'Explorar escenario';
    const panel = page.locator(`#analysis-panel-${task}`);
    const result = panel.locator(task === 'copilot' ? '.copilot-answer' : '.scenario-result');
    await page.getByRole('tab', { name: view, exact: true }).click();
    await panel.getByRole('textbox').fill('¿Qué ocurre si perdemos al proveedor?');
    // Hold a real response to reproduce a slow provider without an external model call.
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    let received!: () => void;
    const ready = new Promise<void>((resolve) => {
      received = resolve;
    });
    let finished!: () => void;
    const settled = new Promise<void>((resolve) => {
      finished = resolve;
    });
    await page.route(
      '**/api/v1/workspace/generate',
      async (route) => {
        const response = await route.fetch();
        received();
        await hold;
        try {
          await route.fulfill({ response });
        } finally {
          finished();
        }
      },
      { times: 1 },
    );
    try {
      await panel.getByRole('button', { name: submit, exact: true }).click();
      await ready;
      await expect(panel).toHaveAttribute('aria-busy', 'true');
      const canceled = page.waitForEvent('requestfailed', (request) =>
        request.url().endsWith('/workspace/generate'),
      );
      await page.getByRole('tab', { name: 'Notas del proyecto', exact: true }).click();
      await page
        .getByRole('textbox', { name: 'Notas del proyecto', exact: true })
        .fill('Se ha confirmado una nueva dependencia.');
      await page.getByRole('button', { name: 'Guardar notas', exact: true }).click();
      await canceled;
      release();
      await settled;
      await page.getByRole('tab', { name: 'Análisis', exact: true }).click();
      await page.getByRole('tab', { name: view, exact: true }).click();
      await expect(panel).toHaveAttribute('aria-busy', 'false');
      await expect(result).toHaveCount(0);
      await expect(panel.getByRole('textbox')).toHaveValue('¿Qué ocurre si perdemos al proveedor?');
      await panel.getByRole('button', { name: submit, exact: true }).click();
      await expect(result).toBeVisible();
    } finally {
      release();
    }
  });
}

test('proposal review registers only confirmed items and links existing or closed records', async ({
  page,
}) => {
  await page.goto('/start');
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click();
  await page
    .getByLabel('Descripción', { exact: true })
    .fill('Implantar un ERP industrial en cuatro meses.');
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await page.locator('.project-card').first().click();
  await expect(page).toHaveURL(/\/projects\/[^/#?]+$/);
  const projectURL = page.url();
  const showRisks = async () => {
    await page.getByRole('tab', { name: 'Análisis', exact: true }).click();
    await page.getByRole('tab', { name: 'Riesgos y acciones', exact: true }).click();
  };
  await showRisks();
  const risk = page
    .locator('#analysis-panel-risks .intelligence-risk')
    .filter({ hasText: 'Resistencia al cambio' })
    .first();
  await risk.locator('summary').click();
  await risk.getByRole('button', { name: 'Revisar y registrar riesgo' }).click();
  await expect(page.getByRole('dialog', { name: 'Revisar propuesta' })).toBeVisible();
  await expect(page.getByLabel('Nivel de riesgo confirmado')).toHaveValue('unspecified');
  await expect(page.getByLabel('Origen o evidencia')).toHaveValue(/inferido/i);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('tab', { name: 'Seguimiento PMO', exact: true }).click();
  await expect(page.locator('.tracking-record')).toHaveCount(0);
  await showRisks();
  await risk.getByRole('button', { name: 'Revisar y registrar riesgo' }).click();
  await page.getByLabel('Nivel de riesgo confirmado').selectOption('high');
  await page.getByRole('button', { name: 'Guardar registro', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await risk.getByRole('button', { name: /Ver registro · Pendiente/ }).click();
  await expect(page.locator('.record-targeted')).toBeFocused();
  await expect(page.locator('.record-targeted')).toContainText('Resistencia al cambio');
  await expect(page.locator('.tracking-record')).toHaveCount(1);
  await page.locator('.record-targeted').getByRole('button', { name: 'Cerrar elemento' }).click();
  await expect(page.locator('.record-closed')).toHaveCount(1);
  await showRisks();
  await expect(risk.getByRole('button', { name: /Ver registro · Cerrado/ })).toBeVisible();
  await expect(risk.getByRole('button', { name: 'Revisar y registrar riesgo' })).toHaveCount(0);
  const another = page
    .locator('#analysis-panel-risks .intelligence-risk')
    .filter({ hasText: 'Migración de datos incompleta' })
    .first();
  await another.locator('summary').click();
  await another.getByRole('button', { name: 'Revisar y registrar riesgo' }).click();
  await page.getByLabel('Asunto', { exact: true }).fill('  RESISTENCIA   AL CAMBIO  ');
  await expect(page.getByRole('dialog')).toContainText(
    'Ya existe un registro de este tipo con el mismo asunto.',
  );
  await expect(page.getByRole('button', { name: 'Guardar registro', exact: true })).toBeDisabled();
  // A different record type remains a distinct, explicitly reviewed item.
  await page.getByLabel('Tipo de registro').selectOption('action');
  await expect(page.getByRole('button', { name: 'Guardar registro', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Vencimiento confirmado')).toHaveValue('');
  await page.getByLabel('Tipo de registro').selectOption('risk');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Ver registro · Cerrado/ })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.record-targeted')).toBeFocused();
  await expect(page.locator('.tracking-record')).toHaveCount(1);
  await page.getByRole('button', { name: 'Reabrir elemento', exact: true }).click();
  await expect(page.locator('.record-closed')).toHaveCount(0);
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: /1 Riesgos altos/ })).toBeVisible();
  await page.goto(`${projectURL}#diagnosis`);
  const actions = page
    .locator('.diagnosis-grid > details')
    .filter({ hasText: 'Próximas acciones recomendadas' });
  await actions.locator('summary').first().click();
  await actions.getByRole('button', { name: 'Revisar y registrar acción' }).first().click();
  const title = await page.getByLabel('Asunto', { exact: true }).inputValue();
  await expect(page.getByLabel('Vencimiento confirmado')).toHaveValue('');
  await page.getByRole('button', { name: 'Guardar registro', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
  await page
    .locator('.brief-next')
    .getByRole('button', { name: /Ver registro/ })
    .click();
  await expect(page.locator('.record-targeted')).toContainText(title);
  await expect(page.locator('.tracking-record')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.tracking-record')).toHaveCount(2);
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  // Stored source text stays in its original language; translated proposals are not semantic matches.
  await page.getByRole('button', { name: 'ES', exact: true }).click();
  await expect(
    page.locator('.brief-next').getByRole('button', { name: /Ver registro/ }),
  ).toBeVisible();
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click();
  await page.getByLabel('Nombre del proyecto', { exact: true }).fill('Otro ERP');
  await page.getByLabel('Descripción', { exact: true }).fill('Implantar un ERP industrial.');
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await page.locator('.project-card').filter({ hasText: 'Otro ERP' }).click();
  await showRisks();
  const otherRisk = page
    .locator('#analysis-panel-risks .intelligence-risk')
    .filter({ hasText: 'Resistencia al cambio' })
    .first();
  await otherRisk.locator('summary').click();
  await expect(otherRisk.getByRole('button', { name: 'Revisar y registrar riesgo' })).toBeEnabled();
  await expect(otherRisk.getByRole('button', { name: /Ver registro/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  const englishRisk = page
    .locator('#analysis-panel-risks .intelligence-risk')
    .filter({ hasText: 'Change resistance' })
    .first();
  await englishRisk.locator('summary').click();
  await englishRisk.getByRole('button', { name: 'Review and register risk' }).click();
  await expect(page.getByRole('dialog', { name: 'Review proposal' })).toBeVisible();
  await expect(page.getByLabel('Confirmed risk level')).toHaveValue('unspecified');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});
