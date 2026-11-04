import { defineConfig, devices } from '@playwright/test';

// End-to-end tests in Firefox, muted: the sound rendered offline in the browser and measured (test/e2e/);
// and the page's fit on a phone again in WebKit, as an iPhone: Safari and every iPhone browser lay out with it, and differently.
const PORT = 5197;

export default defineConfig({
  testDir: 'test/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], launchOptions: { firefoxUserPrefs: { 'media.volume_scale': '0.0', 'media.autoplay.default': 0 } } },
    },
    // its system libraries once per machine: sudo env "PATH=$PATH" ./node_modules/.bin/playwright install-deps webkit
    { name: 'iphone', use: { ...devices['iPhone 13'] }, testMatch: 'layout.spec.ts', grep: /fits a phone/ },
  ],
  webServer: {
    // vite itself, not through npx: npx spends minutes on its checks before the server starts
    command: `./node_modules/.bin/vite --port ${PORT} --strictPort --clearScreen false`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
  },
});
