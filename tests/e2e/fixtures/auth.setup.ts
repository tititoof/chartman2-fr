// tests/e2e/fixtures/auth.setup.ts
import { test as setup, expect } from '@playwright/test'
import { LoginPage } from '../pages/login.page'

const AUTH_FILE = 'tests/e2e/.auth/user.json'

setup('authentification de l'utilisateur de test', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login(
    process.env.E2E_USER_EMAIL || 'test@example.com',
    process.env.E2E_USER_PASSWORD || 'password123'
  )
  await expect(page).not.toHaveURL('/login')
  await page.context().storageState({ path: AUTH_FILE })
})