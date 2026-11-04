import { defineConfig, devices } from '@playwright/test';

// End-to-end tests in Firefox, muted: the sound rendered offline in the browser and measured (test/e2e/).
const PORT = 5197;

export default defineConfig({
  testDir: 'test/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  reporter: [['list']],
  use: {
    ...devices['Desktop Firefox'],
    baseURL: `http://localhost:${PORT}`,
    launchOptions: { firefoxUserPrefs: { 'media.volume_scale': '0.0', 'media.autoplay.default': 0 } },
  },
  projects: [{ name: 'firefox' }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort --clearScreen false`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
  },
});
