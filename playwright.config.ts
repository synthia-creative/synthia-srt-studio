import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, timeout: 30000,
  expect: { timeout: 7000 }, reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5187/synthia-srt-studio/', viewport: { width: 1440, height: 1000 },
    browserName: 'chromium', channel: process.env.BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
  },
  webServer: { command: 'node scripts/serve-built.mjs', url: 'http://127.0.0.1:5187/synthia-srt-studio/', reuseExistingServer: !process.env.CI },
});
