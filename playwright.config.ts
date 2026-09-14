import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  outputDir: 'test-results/demo',
  testDir: './e2e',
  testMatch: 'demo.spec.ts',
  timeout: 45000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: [
    {
      command: 'npm run dev --workspace frontend',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command:
        'backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000',
      url: 'http://127.0.0.1:8000/api/v1/health',
      reuseExistingServer: !process.env.CI,
      env: { AI_PROVIDER: 'demo', AUTH_MODE: 'demo', RATE_LIMIT_PER_MINUTE: '200' },
    },
  ],
});
