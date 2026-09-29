const target =
  process.env.PUBLIC_FRONTEND_URL || process.argv[2] || 'https://pmo-compass-ai.vercel.app';
const url = new URL(target);
if (url.protocol !== 'https:')
  throw new Error('Security header verification requires an HTTPS URL.');
const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
if (!response.ok) throw new Error(`Site returned HTTP ${response.status}.`);
const required = [
  'strict-transport-security',
  'content-security-policy',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
];
const missing = required.filter((name) => !response.headers.get(name));
const csp = response.headers.get('content-security-policy') || '';
if (!csp.includes("frame-ancestors 'none'")) missing.push("CSP frame-ancestors 'none'");
if (
  csp.includes('default-src *') ||
  csp.includes('script-src *') ||
  csp.includes("'unsafe-inline'") ||
  csp.includes("'unsafe-eval'")
)
  missing.push('restrictive production CSP');
if (missing.length) throw new Error(`Missing or invalid controls: ${missing.join(', ')}`);
console.log(`Security headers verified at ${url.origin}.`);
