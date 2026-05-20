// tests/server/api/article/[id].get.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mockFetch = vi.fn()
vi.mock('ofetch', () => ({ $fetch: mockFetch }))

mockNuxtImport('getCookie',        () => vi.fn())
mockNuxtImport('getRouterParam',   () => vi.fn())
mockNuxtImport('useRuntimeConfig', () => vi.fn(() => ({ railsApiBase: 'http://rails.test' })))

describe('GET /api/articles/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 401 si pas de token', async () => {
    const { getCookie } = await import('#imports')
    vi.mocked(getCookie).mockReturnValue(undefined)

    const handler = (await import('~/server/api/article/[id].get')).default
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('retourne 400 si id manquant', async () => {
    const { getCookie, getRouterParam } = await import('#imports')
    vi.mocked(getCookie).mockReturnValue('token')
    vi.mocked(getRouterParam).mockReturnValue(undefined)

    const handler = (await import('~/server/api/article/[id].get')).default
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('retourne le article depuis Rails', async () => {
    const { getCookie, getRouterParam } = await import('#imports')
    vi.mocked(getCookie).mockReturnValue('token')
    vi.mocked(getRouterParam).mockReturnValue('42')

    const mockArticle = { id: 42, name: 'Test Article', content: 'This is a test article.', created_at: '2024-01-01', updated_at: '2024-01-01' }
    mockFetch.mockResolvedValue(mockArticle)

    const handler = (await import('~/server/api/article/[id].get')).default
    const result  = await handler({} as any)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://rails.test/articles/42',
      expect.objectContaining({ headers: { Authorization: 'Bearer token' } })
    )
    expect(result).toEqual(mockArticle)
  })
})
