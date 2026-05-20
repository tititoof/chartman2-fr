// tests/server/api/article/[id].delete.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mockFetch = vi.fn()
vi.mock('ofetch', () => ({ $fetch: mockFetch }))

mockNuxtImport('getCookie',        () => vi.fn())
mockNuxtImport('getRouterParam',   () => vi.fn())
mockNuxtImport('useRuntimeConfig', () => vi.fn(() => ({ railsApiBase: 'http://rails.test' })))

describe('DELETE /api/articles/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('supprime et retourne { success: true }', async () => {
    const { getCookie, getRouterParam } = await import('#imports')
    vi.mocked(getCookie).mockReturnValue('token')
    vi.mocked(getRouterParam).mockReturnValue('42')
    mockFetch.mockResolvedValue(undefined)

    const handler = (await import('~/server/api/article/[id].delete')).default
    const result  = await handler({} as any)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://rails.test/articles/42',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(result).toEqual({ success: true })
  })
})
