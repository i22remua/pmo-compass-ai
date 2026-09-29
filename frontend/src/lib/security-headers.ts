const firebaseConnections = [
  'https://*.googleapis.com',
  'https://*.firebaseio.com',
  'wss://*.firebaseio.com',
  'https://www.recaptcha.net',
  'https://www.gstatic.com',
];

export function buildContentSecurityPolicy(nonce: string, apiUrl: string, development = false) {
  let apiOrigin = '';
  try {
    apiOrigin = new URL(apiUrl).origin;
  } catch {
    // The build validates hosted API URLs. A missing local URL needs no extra origin.
  }
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${[
      apiOrigin,
      ...firebaseConnections,
      ...(development
        ? ['http://127.0.0.1:9099', 'http://127.0.0.1:8085', 'ws://127.0.0.1:9150']
        : []),
    ]
      .filter(Boolean)
      .join(' ')}`,
    'frame-src https://www.recaptcha.net https://recaptcha.google.com',
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}
