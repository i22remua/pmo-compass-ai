import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  outputDir: 'test-results/firebase',
  testDir: './e2e',
  testMatch: 'firebase.spec.ts',
  timeout: 60000,
  expect: { timeout: 20000 },
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3001', trace: 'retain-on-failure' },
  projects: [{ name: 'firebase-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run dev --workspace frontend -- --port 3001',
      url: 'http://127.0.0.1:3001',
      timeout: 120000,
      env: {
        NEXT_DIST_DIR: '.next-firebase',
        NEXT_PUBLIC_DATA_MODE: 'firebase',
        NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8001',
        NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-public-api-key',
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-pmo-compass.firebaseapp.com',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-pmo-compass',
        NEXT_PUBLIC_FIREBASE_APP_ID: 'demo-public-app-id',
        NEXT_PUBLIC_USE_FIREBASE_EMULATORS: 'true',
      },
    },
    {
      command:
        'backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001',
      url: 'http://127.0.0.1:8001/api/v1/health',
      env: {
        AI_PROVIDER: 'demo',
        AUTH_MODE: 'firebase',
        APP_ENV: 'test',
        FIREBASE_PROJECT_ID: 'demo-pmo-compass',
        FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
        CORS_ORIGINS: '["http://127.0.0.1:3001"]',
      },
    },
  ],
});
