/** Record the real demo in isolated browser storage; never touch a cloud account. */
import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, 'delivery/linkedin');
const base = 'http://127.0.0.1:3000';
const captions = [];
await mkdir(output, { recursive: true });
const health = await fetch('http://127.0.0.1:8000/api/v1/health').then((r) => r.json());
if (!['offline', 'demo'].includes(health.provider) || health.authMode !== 'demo')
  throw new Error('Record with local AI_PROVIDER=offline and AUTH_MODE=demo.');

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: resolve(output, '.recording'), size: { width: 1440, height: 1000 } },
  colorScheme: 'light',
  reducedMotion: 'reduce',
  permissions: ['clipboard-read', 'clipboard-write'],
});
await context.addInitScript(() => {
  localStorage.setItem('pmo.theme', 'light');
  const mount = () => {
    const caption = document.createElement('div');
    caption.id = 'pmo-recording-caption';
    caption.style.cssText =
      'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:99999;background:#0e1729f5;color:#fff;border:1px solid #475569;border-radius:12px;padding:15px 24px;font:500 22px/1.45 system-ui;text-align:center;max-width:1080px;width:max-content;pointer-events:none;box-shadow:0 8px 28px #0002';
    caption.textContent =
      localStorage.getItem('pmo.recording.caption') ||
      'PMO Compass AI · del contexto del proyecto al documento revisable';
    document.body.append(caption);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
});
const page = await context.newPage();
const video = page.video();
const started = Date.now();
const elapsed = () => (Date.now() - started) / 1000;
const holdUntil = async (seconds) => {
  const remaining = seconds * 1000 - (Date.now() - started);
  if (remaining > 0) await page.waitForTimeout(remaining);
};
const caption = async (es, en) => {
  captions.push({ start: elapsed(), es, en });
  await page.evaluate((text) => {
    localStorage.setItem('pmo.recording.caption', text);
    const element = document.getElementById('pmo-recording-caption');
    if (element) element.textContent = text;
  }, es);
};
const capture = async (name) => {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: resolve(output, name),
    animations: 'disabled',
    style: '#pmo-recording-caption { display: none !important; }',
  });
};
try {
  await page.goto(base);
  await page.getByRole('button', { name: 'ES', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Tu proyecto,/ })).toBeVisible();
  await caption(
    'De las notas del proyecto a documentos PMO revisables.',
    'From project notes to reviewable PMO documents.',
  );
  await capture('01-landing-es.png');
  await holdUntil(7);

  await page.goto(`${base}/login`);
  await caption(
    'Workspace sin cuenta ni APIs de pago · todos los datos son ficticios.',
    'No account or paid AI API needed for the workspace. All data is fictional.',
  );
  await holdUntil(11);
  await page.getByRole('link', { name: 'Comenzar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vista general' })).toBeVisible();
  await holdUntil(15);

  await caption(
    'Proyectos, métricas y documentos en un workspace bilingüe.',
    'Projects, metrics and documents in one bilingual workspace.',
  );
  await capture('02-dashboard-es.png');
  await holdUntil(22);

  await page.getByRole('button', { name: 'Añadir proyectos de ejemplo', exact: true }).click();
  await page.getByRole('button', { name: 'Proyectos de ejemplo añadidos', exact: true }).waitFor();
  await page.goto(`${base}/projects/demo-project-6`);
  await page.getByRole('tab', { name: 'Notas del proyecto' }).click();
  await caption(
    'Un lanzamiento logístico: retraso del transportista y decisiones pendientes.',
    'A logistics launch: a carrier delay and pending decisions.',
  );
  await holdUntil(31);

  await page.getByRole('button', { name: 'Generar con IA', exact: true }).click();
  await page.getByLabel('Idioma del documento').selectOption('es');
  await page
    .getByLabel('Contexto adicional')
    .fill(
      'Audiencia: sponsor del programa. Formato: revisión semanal de la distribución regional.',
    );
  await caption(
    'El generador combina proyecto, notas, idioma y contexto adicional.',
    'Generation combines the project, notes, language and additional context.',
  );
  await holdUntil(38);
  await page.getByRole('button', { name: 'Generar documento', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Informe semanal de estado', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await holdUntil(44);

  await caption(
    'Plantillas locales: reviso el borrador, lo copio y guardo esta versión.',
    'Local templates: I review the draft, copy it and save this version.',
  );
  await page.getByRole('button', { name: 'Copiar', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar documento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Guardado', exact: true })).toBeDisabled();
  await page.getByRole('heading', { name: 'Próximos pasos', exact: true }).evaluate((heading) => {
    const paper = heading.closest('.output-paper');
    paper.scrollTop += heading.getBoundingClientRect().top - paper.getBoundingClientRect().top - 20;
  });
  await holdUntil(53);

  await page
    .getByRole('combobox', { name: 'Elige un documento', exact: true })
    .selectOption('risk_register');
  await caption(
    'Offline PMO Engine: riesgos con evidencias y propuestas para revisión.',
    'Offline PMO Engine: risks with source evidence and proposals for review.',
  );
  await page.locator('.generator-submit .button-primary').click();
  await expect(
    page.getByRole('heading', { name: 'Registro de riesgos', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.locator('.output-paper').evaluate((paper) => {
    paper.scrollTop = 0;
  });
  await holdUntil(57);
  await page.getByRole('heading', { name: /^R-01/ }).evaluate((heading) => {
    const paper = heading.closest('.output-paper');
    paper.scrollTop += heading.getBoundingClientRect().top - paper.getBoundingClientRect().top - 20;
  });
  await expect(
    page.getByRole('cell', { name: 'Evidencia textual', exact: true }).first(),
  ).toBeVisible();
  await capture('03-risk-register-es.png');
  await holdUntil(64);
  await page.getByRole('button', { name: 'Guardar documento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Guardado', exact: true })).toBeDisabled();

  await page.goto(`${base}/documents`);
  await caption(
    'El documento queda guardado: puedo reabrirlo y exportarlo en Markdown.',
    'The saved document can be reopened and exported as Markdown.',
  );
  await page.locator('.document-table-row').first().click();
  await expect(page.locator('.markdown-content')).toContainText('Registro de riesgos');
  await capture('04-saved-document-es.png');
  await page.screenshot({
    path: resolve(root, 'docs/screenshots/saved-document-es.png'),
    animations: 'disabled',
    style: '#pmo-recording-caption { display: none !important; }',
  });
  await holdUntil(75);

  await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click();
  await caption(
    'Ingeniería de Software, IA y Project Management · github.com/i22remua/pmo-compass-ai',
    'Software Engineering, AI and Project Management · github.com/i22remua/pmo-compass-ai',
  );
  await capture('05-dark-document-es.png');
  await holdUntil(83);
  captions.push({ start: elapsed(), es: '', en: '' });
} finally {
  await context.close();
  await browser.close();
}
await rename(await video.path(), resolve(output, 'pmo-compass-ai-demo-es.webm'));
const stamp = (seconds) =>
  new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23).replace('.', ',');
for (const language of ['es', 'en']) {
  const srt = captions
    .slice(0, -1)
    .map(
      (part, index) =>
        `${index + 1}\n${stamp(part.start)} --> ${stamp(captions[index + 1].start)}\n${part[language]}\n`,
    )
    .join('\n');
  await writeFile(resolve(output, `pmo-compass-ai-demo-${language}.srt`), srt);
}
await writeFile(
  resolve(output, 'recording.json'),
  JSON.stringify(
    {
      language: 'es',
      provider: 'offline',
      fictionalData: true,
      seconds: captions.at(-1).start,
      chapters: captions.slice(0, -1),
    },
    null,
    2,
  ) + '\n',
);
if (process.env.FFMPEG_BIN) {
  execFileSync(
    process.env.FFMPEG_BIN,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      resolve(output, 'pmo-compass-ai-demo-es.webm'),
      '-c:v',
      'libx264',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-an',
      resolve(output, 'pmo-compass-ai-demo-es.mp4'),
    ],
    { stdio: 'inherit' },
  );
}
console.log(
  'Recorded the real local demo, five screenshots and ES/EN subtitles in delivery/linkedin. No cloud data or published repository was changed.',
);
