// tests/e2e/pages/login.page.ts
import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export class LoginPage {
  readonly page:          Page
  readonly emailInput:    Locator
  readonly passwordInput: Locator
  readonly submitButton:  Locator
  readonly errorToast:    Locator

  constructor(page: Page) {
    this.page          = page
    this.emailInput    = page.getByLabel('Email')
    this.passwordInput = page.getByLabel('Mot de passe')
    this.submitButton  = page.getByRole('button', { name: 'Se connecter' })
    this.errorToast    = page.locator('.v-snackbar')
  }

  async goto() { await this.page.goto('/login') }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async expectError(message: string) {
    await this.errorToast.waitFor({ state: 'visible' })
    await expect(this.errorToast).toContainText(message)
  }
}