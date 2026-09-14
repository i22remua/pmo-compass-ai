import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  outputDir: 'test-results/providers',
  testDir: './e2e',
  testMatch: 'providers.spec.ts',
  timeout: 45000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'provider-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run dev --workspace frontend',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command:
        'backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8002',
      url: 'http://127.0.0.1:8002/api/v1/health',
      env: {
        AI_PROVIDER: 'ollama',
        AUTH_MODE: 'demo',
        APP_ENV: 'test',
        OLLAMA_MODEL: 'llama3.1',
        // A closed local port exercises a real connection failure, without installing a model.
        OLLAMA_BASE_URL: 'http://127.0.0.1:1',
        OLLAMA_TIMEOUT_SECONDS: '3',
        RATE_LIMIT_PER_MINUTE: '100',
      },
    },
  ],
});
