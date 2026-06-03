// tests/server/api/article/index.get.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mockFetch = vi.fn()
vi.mock('ofetch', () => ({ $fetch: mockFetch }))

mockNuxtImport('getCookie', () => vi.fn())
mockNuxtImport('getQuery',  () => vi.fn(() => ({ page: 1 })))
mockNuxtImport('useRuntimeConfig', () => vi.fn(() => ({ railsApiBase: 'http://rails.test' })))

describe('GET /api/articles', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 401 si pas de token', async () => {
    const { getCookie } = await import('#imports')
    vi.mocked(getCookie).mockReturnValue(undefined)

    const handler = (await import('~/server/api/article/index.get')).default
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('appelle Rails avec le token et retourne les données', async () => {
    const { getCookie } = await import('#imports')
    vi.mocked(getCookie).mockReturnValue('test-token')

    const mockData = {
      articles: [{ id: 1, created_at: '2024-01-01', updated_at: '2024-01-01' }],
      meta: { total: 1, page: 1, per_page: 10, total_pages: 1 }
    }
    mockFetch.mockResolvedValue(mockData)

    const handler = (await import('~/server/api/article/index.get')).default
    const result  = await handler({} as any)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://rails.test/articles',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' }
      })
    )
    expect(result).toEqual(mockData)
  })
})