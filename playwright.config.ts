import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir:       './tests/e2e',
  fullyParallel: false,
  forbidOnly:    !!process.env.CI,
  retries:       process.env.CI ? 2 : 0,
  workers:       process.env.CI ? 1 : undefined,

  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  use: {
    baseURL:    process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',
    locale:     'fr-FR',
  },

  projects: [
    { name: 'setup', testMatch: '**/fixtures/auth.setup.ts' },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command:            'npm run dev',
    url:                'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout:            120_000,
  },
})