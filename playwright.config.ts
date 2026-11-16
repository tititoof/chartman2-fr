import { defineConfig, devices } from '@playwright/test'

// Smoke tests of a running site: the staging in CI (stage « E2E » of the
// Jenkinsfile), the dev server locally. No web server is started from here.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: [
    ['list'],
    ['junit', { outputFile: 'playwright-results.xml' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'fr-FR',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
