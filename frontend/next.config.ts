import type { NextConfig } from 'next';

if (
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true'
) {
  throw new Error('Firebase emulators must not be enabled in a production build.');
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
