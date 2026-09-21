import type { NextConfig } from 'next';

if (
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true'
) {
  throw new Error('Firebase emulators must not be enabled in a production build.');
}

// A hosted browser must never silently connect to the visitor's localhost.
if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
  const api = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
  if (api.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)) {
    throw new Error('Set NEXT_PUBLIC_API_URL to the public HTTPS backend before deploying.');
  }
}

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
export default nextConfig;
