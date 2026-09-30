import { expect, test } from '@playwright/test';

test('untrusted saved Markdown cannot execute HTML, event handlers or JavaScript URLs', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const uid = 'security-test-user';
    const timestamp = new Date().toISOString();
    localStorage.setItem('pmo.demo.uid', uid);
    localStorage.setItem('pmo.demo.active', uid);
    localStorage.setItem(
      `pmo.workspace.v1.${uid}`,
      JSON.stringify({
        projects: [
          {
            id: 'security-project',
            ownerId: uid,
            name: 'Security review',
            sector: 'Technology',
            description: '',
            objectives: '',
            startDate: '',
            endDate: '',
            status: 'planning',
            budget: null,
            stakeholders: '',
            notes: '',
            aiAccess: 'offline',
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
        documents: [
          {
            id: 'xss-document',
            ownerId: uid,
            projectId: 'security-project',
            type: 'executive_brief',
            language: 'en',
            inputContext: '',
            provider: 'offline',
            generatedContent:
              '# Safe title\n\n<script>window.__pmoInjected=true</script>\n\n<img src=x onerror="window.__pmoInjected=true">\n\n<iframe srcdoc="<script>parent.__pmoInjected=true</script>"></iframe>\n\n[unsafe](javascript:alert(1))\n\n[safe](https://example.com)',
            risks: [],
            warnings: [],
            createdAt: timestamp,
          },
        ],
        sources: [],
        records: [],
      }),
    );
  });
  await page.goto('/documents/xss-document');
  await expect(page.getByRole('heading', { name: 'Safe title' })).toBeVisible();
  await expect(
    page.locator('.markdown-content script, .markdown-content iframe, .markdown-content img'),
  ).toHaveCount(0);
  await expect(page.locator('.markdown-content a[href^="javascript:"]')).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as Window & { __pmoInjected?: boolean }).__pmoInjected),
  ).toBeUndefined();
  await expect(page.getByRole('link', { name: 'safe', exact: true })).toHaveAttribute(
    'href',
    'https://example.com',
  );
});

test('HTML responses use nonce CSP and the public security page states real limits', async ({
  page,
}) => {
  const response = await page.goto('/security');
  const csp = response?.headers()['content-security-policy'] || '';
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toMatch(/'nonce-[^']+'/);
  expect(csp).not.toContain("'unsafe-inline'");
  // Firebase's Enterprise provider uses Google-hosted frames and token requests.
  const directives = csp.split(';').map((directive) => directive.trim());
  expect(directives.find((directive) => directive.startsWith('frame-src '))).toContain(
    'https://www.google.com/recaptcha/',
  );
  expect(directives.find((directive) => directive.startsWith('connect-src '))).toContain(
    'https://www.google.com/recaptcha/',
  );
  await expect(page.getByRole('heading', { name: 'Protección de tus datos' })).toBeVisible();
  await expect(page.locator('main')).toContainText('Ningún servicio conectado a Internet');
});

test('local users can export exactly their workspace without a server upload', async ({ page }) => {
  await page.goto('/start');
  await page.route('**/api/**', (route) => route.abort('blockedbyclient'));
  await page.goto('/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar mis datos', exact: true }).click();
  const result = await download;
  expect(result.suggestedFilename()).toMatch(/^pmo-compass-export-\d{4}-\d{2}-\d{2}\.json$/);
});
