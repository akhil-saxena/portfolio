import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.AUDIT_PORT ?? 4399);

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    colorScheme: 'dark',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },

  projects: [
    {
      name: 'normal',
      use: { ...devices['Desktop Chrome'], contextOptions: { reducedMotion: 'no-preference' } },
    },
    {
      name: 'reduce',
      use: { ...devices['Desktop Chrome'], contextOptions: { reducedMotion: 'reduce' } },
    },
  ],

  webServer: {
    command: `node ${new URL('serve-dist.mjs', import.meta.url).pathname} ${process.env.AUDIT_ROOT ?? 'dist/client'}`,
    cwd: new URL('../../', import.meta.url).pathname,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    stdout: 'pipe',
    timeout: 20_000,
  },
});
