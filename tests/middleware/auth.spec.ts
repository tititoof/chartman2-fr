// tests/middleware/auth.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mockNavigateTo = vi.fn()
const mockAuthStore = vi.fn()

mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useAuthStore', () => mockAuthStore)

describe('middleware/auth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('redirige vers /login si non authentifié', async () => {
    mockAuthStore.mockReturnValue({ isAuthenticated: false })

    const middleware = (await import('~/middleware/auth')).default
    middleware({} as any, {} as any)

    expect(mockNavigateTo).toHaveBeenCalledWith('/login')
  })

  it('ne redirige pas si authentifié', async () => {
    mockAuthStore.mockReturnValue({ isAuthenticated: true })

    const middleware = (await import('~/middleware/auth')).default
    middleware({} as any, {} as any)

    expect(mockNavigateTo).not.toHaveBeenCalled()
  })
})