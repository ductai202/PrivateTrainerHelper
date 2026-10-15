import { defineConfig } from '@playwright/test';
import webpush from 'web-push';

// throw-away VAPID keys so the cron route treats push as configured (no real device involved)
const vapid = webpush.generateVAPIDKeys();

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  use: { baseURL: 'http://localhost:3000' },
  webServer: [
    {
      // deterministic stand-in for OpenRouter (see tests/e2e/fake-openrouter.mjs)
      command: 'node tests/e2e/fake-openrouter.mjs',
      url: 'http://127.0.0.1:4010/last-request',
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000/login',
      reuseExistingServer: true,
      timeout: 120000,
      env: {
        OPENROUTER_API_KEY: 'test-key',
        OPENROUTER_BASE_URL: 'http://127.0.0.1:4010/api/v1',
        AI_MODEL: 'test/model',
        ZALO_BOT_TOKEN: 'TESTBOT',
        ZALO_BOT_API_BASE: 'http://127.0.0.1:4010',
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: vapid.publicKey,
        VAPID_PRIVATE_KEY: vapid.privateKey,
        VAPID_SUBJECT: 'mailto:test@example.com',
      },
    },
  ],
});
