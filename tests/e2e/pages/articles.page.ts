// tests/e2e/pages/articles.page.ts
import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export class ArticlesPage {
  readonly page:         Page
  readonly createButton: Locator
  readonly searchInput:  Locator
  readonly successToast: Locator

  constructor(page: Page) {
    this.page         = page
    this.createButton = page.getByRole('link', { name: /créer/i })
    this.searchInput  = page.getByLabel('Rechercher')
    this.successToast = page.locator('.v-snackbar').filter({ hasText: /succès/i })
  }

  async goto()              { await this.page.goto('/articles') }
  async gotoCreate()        { await this.page.goto('/articles/create') }
  async gotoShow(id: number){ await this.page.goto(`/articles/${id}/show`) }
  async gotoEdit(id: number){ await this.page.goto(`/articles/${id}/edit`) }

  async getCards()          { return this.page.locator('.v-card').all() }

  async clickShow(i = 0) {
    (await this.getCards())[i].getByRole('button', { name: /voir/i }).click()
  }
  async clickEdit(i = 0) {
    (await this.getCards())[i].getByRole('button', { name: /éditer/i }).click()
  }
  async clickDelete(i = 0) {
    (await this.getCards())[i].getByRole('button', { name: /supprimer/i }).click()
  }

  async confirmDelete() {
    await this.page.getByRole('dialog').getByRole('button', { name: /supprimer/i }).click()
  }

  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(400) // debounce 300ms
  }

  async expectSuccessToast() {
    await this.successToast.waitFor({ state: 'visible', timeout: 5000 })
  }

  async expectUrl(pattern: string | RegExp) {
    await expect(this.page).toHaveURL(pattern)
  }
}
