// tests/server/api/article/index.post.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mockFetch = vi.fn()
vi.mock('ofetch', () => ({ $fetch: mockFetch }))

mockNuxtImport('getCookie',        () => vi.fn())
mockNuxtImport('readBody',         () => vi.fn())
mockNuxtImport('useRuntimeConfig', () => vi.fn(() => ({ railsApiBase: 'http://rails.test' })))

describe('POST /api/articles', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 401 si pas de token', async () => {
    const { getCookie } = await import('#imports')
    vi.mocked(getCookie).mockReturnValue(undefined)

    const handler = (await import('~/server/api/article/index.post')).default
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('retourne 400 si body manquant', async () => {
    const { getCookie, readBody } = await import('#imports')
    vi.mocked(getCookie).mockReturnValue('token')
    vi.mocked(readBody).mockResolvedValue(null)

    const handler = (await import('~/server/api/article/index.post')).default
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('crée l'article et le retourne', async () => {
    const { getCookie, readBody } = await import('#imports')
    const payload = { name: 'Test Article', content: 'This is a test article.' }
    vi.mocked(getCookie).mockReturnValue('token')
    vi.mocked(readBody).mockResolvedValue(payload)

    const created = { id: 1, ...payload, created_at: '2024-01-01', updated_at: '2024-01-01' }
    mockFetch.mockResolvedValue(created)

    const handler = (await import('~/server/api/article/index.post')).default
    const result  = await handler({} as any)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://rails.test/articles',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) })
    )
    expect(result).toEqual(created)
  })
})