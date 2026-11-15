import { test, expect, type Page } from '@playwright/test'

// Uncaught exceptions on the page (a failing store, a broken plugin...).
// Console warnings are ignored: they are too noisy to be a smoke signal.
function collectPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  return errors
}

const pages = [
  { path: '/', title: /Christophe Hartmann/ },
  { path: '/articles', title: /chartman2-fr/ },
  { path: '/cv', title: /CV/ },
  { path: '/legal_notices', title: /Mentions Légales/ },
]

for (const { path, title } of pages) {
  test(`${path} renders without error`, async ({ page }) => {
    const errors = collectPageErrors(page)

    const response = await page.goto(path)

    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(title)
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })
}

test('an article renders its Mermaid diagram', async ({ page }) => {
  const errors = collectPageErrors(page)

  const response = await page.goto('/blog/article/11-docker-registry-init')

  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/Docker – Registry/)
  await expect(page.locator('.mermaid svg').first()).toBeVisible({ timeout: 15_000 })
  expect(errors).toEqual([])
})

test('the contact form rejects an invalid e-mail without sending', async ({ page }) => {
  let emailRequests = 0
  await page.route('**/api/email', (route) => {
    emailRequests++
    return route.abort()
  })

  await page.goto('/')
  const email = page.getByLabel('E-mail*')
  await email.scrollIntoViewIfNeeded()
  await email.fill('pas-un-email')
  await page.getByRole('button', { name: 'Envoyer' }).click()

  await expect(page.getByText('Votre e-mail doit être valide')).toBeVisible()
  expect(emailRequests).toBe(0)
})
