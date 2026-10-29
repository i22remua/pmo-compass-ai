// Stateless public checks: fictional input, forced offline, no saved user data.
const frontend = process.env.PUBLIC_FRONTEND_URL;
const backend = process.env.PUBLIC_BACKEND_URL;
let appCheckToken;
async function attestPublicBrowser(site) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const exchange = page.waitForResponse(
      (response) =>
        ['firebaseappcheck.googleapis.com', 'content-firebaseappcheck.googleapis.com'].includes(
          new URL(response.url()).hostname,
        ) && new URL(response.url()).pathname.endsWith(':exchangeRecaptchaEnterpriseToken'),
      { timeout: 60000 },
    );
    // Handle rejection immediately if navigation itself fails.
    exchange.catch(() => {});
    // Request attestation through the real public UI, but stop its model request.
    // The smoke below uses only fictional input and the offline provider.
    await page.route('**/api/v1/workspace/generate', (route) => route.abort());
    await page.goto(`${site}/case-study`);
    await page
      .getByRole('button', { name: /Generar ahora con IA|Generate with AI now/, exact: true })
      .click();
    const response = await exchange;
    const result = await response.json();
    if (!response.ok() || typeof result.token !== 'string')
      throw new Error('Public browser App Check attestation failed. No debug bypass is used.');
    return result.token;
  } finally {
    await browser.close();
  }
}
function validate(value, label) {
  if (!value) throw new Error(`Set ${label} to the deployed HTTPS URL.`);
  const url = new URL(value);
  if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error(`${label} must be a public HTTPS URL.`);
  return url.origin;
}
async function check(url, options = {}) {
  const headers = { ...options.headers };
  const isBackend = new URL(url).origin === new URL(backend).origin;
  if (isBackend && appCheckToken) headers['X-Firebase-AppCheck'] = appCheckToken;
  let response = await fetch(url, {
    ...options,
    headers,
    signal: AbortSignal.timeout(120000),
  });
  if (isBackend && response.status === 401 && !appCheckToken) {
    const error = await response
      .clone()
      .json()
      .catch(() => ({}));
    if (error.detail?.code === 'invalid_app_check') {
      appCheckToken = await attestPublicBrowser(new URL(frontend).origin);
      response = await fetch(url, {
        ...options,
        headers: { ...headers, 'X-Firebase-AppCheck': appCheckToken },
        signal: AbortSignal.timeout(120000),
      });
    }
  }
  if (!response.ok) throw new Error(`${new URL(url).pathname}: HTTP ${response.status}`);
  return response;
}
try {
  const site = validate(frontend, 'PUBLIC_FRONTEND_URL');
  const api = validate(backend, 'PUBLIC_BACKEND_URL');
  const landing = await check(site);
  if (!(await landing.text()).includes('PMO Compass')) throw new Error('Unexpected landing page.');
  await check(`${site}/start`);
  await check(`${site}/case-study`);
  await check(`${site}/about`);
  const apiHome = await check(api);
  if (new URL(apiHome.url).pathname !== '/docs' || !(await apiHome.text()).includes('swagger-ui'))
    throw new Error('Backend homepage must open the interactive API documentation.');
  const shareImage = await check(`${site}/opengraph-image`);
  if (!shareImage.headers.get('content-type')?.includes('image/png'))
    throw new Error('Social preview image is unavailable.');
  const health = await (await check(`${api}/api/v1/health`)).json();
  if (health.status !== 'ok' || health.authMode !== 'firebase')
    throw new Error('Production readiness/authentication check failed.');
  const cors = await check(`${api}/api/v1/workspace/generate`, {
    method: 'OPTIONS',
    headers: {
      Origin: site,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  if (cors.headers.get('access-control-allow-origin') !== site)
    throw new Error('CORS does not allow the frontend.');
  const body = JSON.stringify({
    project: {
      name: 'Public smoke project',
      sector: 'Manufacturing',
      description: 'Implement an ERP in four months.',
    },
    type: 'risk_register',
    language: 'en',
    useOfflineFallback: true,
  });
  const draft = await (
    await check(`${api}/api/v1/workspace/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: site },
      body,
    })
  ).json();
  if (
    draft.provider !== 'offline' ||
    !draft.risks.some((risk) => risk.source === 'inferred') ||
    !draft.content.includes('Missing information')
  )
    throw new Error('Offline generation or provenance check failed.');
  const milestoneReference = `control-${'a'.repeat(24)}`;
  const costReference = `control-${'b'.repeat(24)}`;
  const reviewControl = {
    evidence: 'Fictional committee minutes',
    recordId: '',
    archived: false,
    revision: 1,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-15T00:00:00Z',
  };
  const analysisBody = {
    project: {
      name: 'Public diagnosis smoke project',
      sector: 'Technology',
      description: 'Implement an incident management platform.',
      endDate: '2026-03-31',
      notes:
        'The budget is approved. Costs are pending. The project is on track. The integration dependency finishes 2026-04-15.',
      aiAccess: 'offline',
    },
    type: 'risk_register',
    language: 'en',
    useOfflineFallback: true,
    reviewContext: {
      cutoff: '2026-03-15',
      projectUpdatedAt: '2026-03-15T00:00:00Z',
      coverage: {
        recordsTotal: 1,
        controlsTotal: 2,
        sourcesTotal: 0,
        historyTotal: 2,
        partial: false,
        policy: 'Complete fictional smoke case',
      },
      controls: [
        {
          ...reviewControl,
          id: milestoneReference,
          kind: 'milestone',
          title: 'Fictional delivery',
          data: {
            baselineDate: '2026-03-10',
            forecastDate: '2026-03-14',
            actualDate: '',
            dependency: '',
          },
        },
        {
          ...reviewControl,
          id: costReference,
          kind: 'cost',
          title: 'Migration costs',
          data: {
            approved: 1000,
            forecast: 1300,
            actual: 0,
            asOf: '2026-03-15',
            scope: 'Migration / whole delivery',
          },
        },
      ],
      history: [
        {
          cutoff: '2026-03-01',
          records: [],
          controls: [{ id: milestoneReference, forecastDate: '2026-03-10', forecast: null }],
        },
        {
          cutoff: '2026-03-08',
          records: [],
          controls: [{ id: milestoneReference, forecastDate: '2026-03-12', forecast: null }],
        },
      ],
    },
    trackingRecords: [
      {
        id: 'smoke-action',
        kind: 'action',
        title: 'Resolve critical blocker',
        status: 'open',
        dueDate: '2020-01-01',
      },
    ],
  };
  const diagnosis = await (
    await check(`${api}/api/v1/workspace/intelligence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: site },
      body: JSON.stringify(analysisBody),
    })
  ).json();
  if (
    diagnosis.contradictions?.length !== 1 ||
    diagnosis.contradictions[0].title !== 'Dependency after the target date' ||
    !diagnosis.contradictions[0].evidenceA.text.includes('2026-03-31') ||
    !diagnosis.contradictions[0].evidenceB.text.includes('2026-04-15') ||
    !diagnosis.contradictions[0].suggestedCheck ||
    !diagnosis.contradictions.every((item) => item.evidenceA?.text && item.evidenceB?.text) ||
    !diagnosis.diagnosis?.alerts?.some((item) => item.classification === 'provided') ||
    !diagnosis.diagnosis?.alerts?.some((item) => item.classification === 'inferred')
  )
    throw new Error('Project diagnosis or contradiction evidence check failed.');
  // Approved budget + pending costs and on-track + overdue action are not contradictions.
  const findings = diagnosis.reviewFindings || [];
  for (const rule of [
    'repeated-slippage',
    'milestone-overdue',
    'milestone-variance',
    'cost-variance',
  ]) {
    const finding = findings.find((item) => item.rule === rule);
    if (
      !finding ||
      !finding.fingerprint ||
      finding.cutoff !== '2026-03-15' ||
      !finding.question ||
      !finding.evidence?.length
    )
      throw new Error(`Committee finding contract failed: ${rule}.`);
  }
  const variance = findings.find((item) => item.rule === 'cost-variance');
  if (
    !variance.evidence.some(
      (item) => item.reference === costReference && item.text.includes('300.0'),
    )
  )
    throw new Error(
      'Comparable cost variance must preserve the exact 300 EUR difference and source.',
    );
  const slippage = findings.find((item) => item.rule === 'repeated-slippage');
  if (
    !slippage.evidence.some(
      (item) => item.text.includes('2026-03-01') && item.text.includes('2026-03-08'),
    )
  )
    throw new Error('Repeated slippage must retain both historical cutoffs.');
  const scenario = await (
    await check(`${api}/api/v1/workspace/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: site },
      body: JSON.stringify({
        ...analysisBody,
        type: 'executive_brief',
        analysisMode: 'scenario',
        question: 'What happens if go-live is delayed by three weeks?',
      }),
    })
  ).json();
  if (
    scenario.provider !== 'offline' ||
    !scenario.content.startsWith('# Scenario · not a prediction') ||
    !scenario.content.includes('## Plausible consequences') ||
    !scenario.content.includes('## Information needed for a more reliable assessment')
  )
    throw new Error('Scenario simulation contract failed.');
  const privateResponse = await fetch(`${api}/api/v1/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {}),
    },
    body,
    signal: AbortSignal.timeout(30000),
  });
  if (privateResponse.status !== 401)
    throw new Error('Private generation must require authentication.');
  const privateCode = (await privateResponse.json()).detail?.code;
  const expectedPrivateCode = appCheckToken ? 'authentication_required' : null;
  if (
    (expectedPrivateCode && privateCode !== expectedPrivateCode) ||
    !['authentication_required', 'invalid_app_check'].includes(privateCode)
  )
    throw new Error('Private generation must reject unauthenticated or unattested requests.');
  console.log(`Private access denied: ${privateCode}.`);
  if (appCheckToken) console.log('Real public-browser App Check attestation passed.');
  console.log(
    'Public smoke PASS: landing, start, API documentation, social image, health, CORS, offline inference, diagnosis, conservative contradictions, committee findings, scenario simulation and private access denial.',
  );
  console.log('External AI and signed-in persistence require the manual live checklist.');
} catch (error) {
  console.error(`Public smoke FAIL: ${error.message}`);
  process.exitCode = 1;
}
