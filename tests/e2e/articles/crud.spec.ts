// tests/e2e/articles/crud.spec.ts
import { test, expect } from '@playwright/test'
import { ArticlesPage } from '../pages/articles.page'
import { createViaApi, deleteViaApi } from '../fixtures/test-helpers'

test.describe('CRUD Article', () => {
  // Créer un article via API avant les tests (plus rapide que l'UI)
  // et le supprimer après pour garder la base propre
  let testArticleId: number

  test.beforeAll(async ({ request }) => {
    const created = await createViaApi(request, '/articles', {
      name: 'Test E2E Article',
      content: 'Contenu de l'article de test E2E'
    })
    testArticleId = created.id
  })

  test.afterAll(async ({ request }) => {
    if (testArticleId) {
      await deleteViaApi(request, '/articles', testArticleId)
    }
  })

  test('affiche le détail via la page show', async ({ page }) => {
    const p = new ArticlesPage(page)
    await p.gotoShow(testArticleId)
    await expect(page).toHaveURL(`/articles/${testArticleId}/show`)
    await expect(page.getByRole('link', { name: /éditer/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /supprimer/i })).toBeVisible()
  })

  test('crée un article via le formulaire', async ({ page }) => {
    const p = new ArticlesPage(page)
    await p.gotoCreate()

    // Ajoute ici le remplissage des champs spécifiques au modèle Article
    await page.getByLabel('Nom').fill('Test E2E Article')
    await page.getByLabel('Contenu').fill('Contenu de l'article de test E2E')

    await page.getByRole('button', { name: /enregistrer/i }).click()
    await expect(page).toHaveURL('/articles', { timeout: 5000 })
    await p.expectSuccessToast()
  })

  test('édite un article via le formulaire', async ({ page }) => {
    const p = new ArticlesPage(page)
    await p.gotoEdit(testArticleId)
    await expect(page).toHaveURL(`/articles/${testArticleId}/edit`)

    // Ajoute ici la modification d'un champ spécifique
    await page.getByLabel('Nom').fill('Test E2E Article Modifié')

    await page.getByRole('button', { name: /enregistrer/i }).click()
    await expect(page).toHaveURL('/articles', { timeout: 5000 })
    await p.expectSuccessToast()
  })

  test('supprime un article avec confirmation', async ({ page }) => {
    // Créer un item dédié à la suppression pour ne pas casser les autres tests
    const toDelete = await createViaApi(page.request, '/articles', {
      name: 'Article à Supprimer',
      content: 'Contenu de l'article à supprimer'
    })

    const p = new ArticlesPage(page)
    await p.gotoShow(toDelete.id)
    await page.getByRole('button', { name: /supprimer/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await p.confirmDelete()

    await expect(page).toHaveURL('/articles', { timeout: 5000 })
    await p.expectSuccessToast()
  })
})
