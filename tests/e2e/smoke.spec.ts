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

test('the cookie banner records the consent', async ({ page, baseURL }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const bar = page.locator('.cookieControl__Bar')
  await expect(bar).toBeVisible({ timeout: 10_000 })

  // A click before Vue has hydrated the banner does nothing: retry it
  await expect(async () => {
    await bar.getByRole('button', { name: 'Accepter', exact: true }).click({ timeout: 1_000 })
    await expect(bar).toBeHidden({ timeout: 1_000 })
  }).toPass({ timeout: 15_000 })

  // The consent cookies are Secure outside development: over plain HTTP (a local
  // production build) the browser drops them, so only check it on the staging
  if (baseURL?.startsWith('https://')) {
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(bar).toBeHidden()
  }
})

test('the contact form rejects an invalid e-mail without sending', async ({ page }) => {
  let emailRequests = 0
  await page.route('**/api/email', (route) => {
    emailRequests++
    return route.abort()
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const email = page.getByLabel('E-mail*')
  await email.scrollIntoViewIfNeeded()

  // Text typed before Vue has hydrated the form is wiped: retry until the
  // validation answers
  await expect(async () => {
    await email.fill('pas-un-email')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.getByText('Votre e-mail doit être valide')).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 15_000 })
  expect(emailRequests).toBe(0)
})
