// Stateless public checks: fictional input, forced offline, no saved user data.
const frontend = process.env.PUBLIC_FRONTEND_URL;
const backend = process.env.PUBLIC_BACKEND_URL;
function validate(value, label) {
  if (!value) throw new Error(`Set ${label} to the deployed HTTPS URL.`);
  const url = new URL(value);
  if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error(`${label} must be a public HTTPS URL.`);
  return url.origin;
}
async function check(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(120000) });
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
    diagnosis.contradictions?.length < 3 ||
    !diagnosis.contradictions.every((item) => item.evidenceA?.text && item.evidenceB?.text) ||
    !diagnosis.diagnosis?.alerts?.some((item) => item.classification === 'provided') ||
    !diagnosis.diagnosis?.alerts?.some((item) => item.classification === 'inferred')
  )
    throw new Error('Project diagnosis or contradiction evidence check failed.');
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
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(30000),
  });
  if (privateResponse.status !== 401)
    throw new Error('Private generation must require authentication.');
  console.log(
    'Public smoke PASS: landing, start, API documentation, social image, health, CORS, offline inference, diagnosis, contradictions, scenario simulation and private authentication.',
  );
  console.log('External AI and signed-in persistence require the manual live checklist.');
} catch (error) {
  console.error(`Public smoke FAIL: ${error.message}`);
  process.exitCode = 1;
}
