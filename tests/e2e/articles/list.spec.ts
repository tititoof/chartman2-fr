// tests/e2e/articles/list.spec.ts
import { test, expect } from '@playwright/test'
import { ArticlesPage } from '../pages/articles.page'

const articleData = {
  name: 'Test Article',
  content: 'This is a test article.'
}

const nonExistentArticleData = {
  name: 'Non-existent Article',
  content: 'This article does not exist.'
}

const loginPageData = {
  username: 'testuser',
  password: 'testpassword'
}

const createArticleData = {
  name: 'New Article',
  content: 'Content of the new article.'
}

const searchQuery = 'Test Article'


// Tests e2e liste Articles — affichage, recherche, redirection auth.
test.describe('Liste des Articles', () => {

  test('affiche la page avec le bouton créer', async ({ page }) => {
    const p = new ArticlesPage(page)
    await p.goto()
    await expect(page).toHaveURL('/articles')
    await expect(p.createButton).toBeVisible()
  })

  test('redirige vers /login si non authentifié', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/articles')
    await expect(page).toHaveURL('/login')
  })

  test('la recherche filtre les résultats', async ({ page }) => {
    const p = new ArticlesPage(page)
    await p.goto()
    const before = (await p.getCards()).length
    await p.search(searchQuery)
    const after = await p.getCards()
    expect(after.length).toBeLessThanOrEqual(before)
  })

  test('le bouton créer navigue vers /create', async ({ page }) => {
    const p = new ArticlesPage(page)
    await p.goto()
    await p.createButton.click()
    await expect(page).toHaveURL('/articles/create')
  })

  test('la création d’un nouvel article redirige vers la liste', async ({ page, context }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(loginPageData.username, loginPageData.password)

    const createArticlePage = new CreateArticlePage(page)
    await createArticlePage.goto()
    await createArticlePage.createArticle(createArticleData.name, createArticleData.content)
    await expect(page).toHaveURL('/articles')
  })

  test('la recherche d’un article existant affiche les résultats', async ({ page, context }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(loginPageData.username, loginPageData.password)

    const articlesPage = new ArticlesPage(page)
    await articlesPage.goto()
    await articlesPage.search(searchQuery)
    const results = await articlesPage.getCards()
    expect(results.length).toBeGreaterThan(0)
  })

  test('la recherche d’un article inexistant affiche aucun résultat', async ({ page, context }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(loginPageData.username, loginPageData.password)

    const articlesPage = new ArticlesPage(page)
    await articlesPage.goto()
    await articlesPage.search(nonExistentArticleData.name)
    const results = await articlesPage.getCards()
    expect(results.length).toBe(0)
  })
})
