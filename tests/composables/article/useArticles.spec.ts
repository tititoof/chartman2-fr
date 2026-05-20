// tests/composables/article/useArticles.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useArticles } from '~/composables/article/useArticles'

const mockApiFetch = vi.fn()
vi.mock('~/composables/article/useApi', () => ({
  useApi: () => ({ apiFetch: mockApiFetch })
}))

describe('useArticles', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list() appelle GET /articles avec la page', async () => {
    const paginated = {
      articles: [],
      meta: { total: 0, page: 1, per_page: 10, total_pages: 0 }
    }
    mockApiFetch.mockResolvedValue(paginated)

    const { list } = useArticles()
    const result   = await list(2)

    expect(mockApiFetch).toHaveBeenCalledWith('/articles', { query: { page: 2 } })
    expect(result).toEqual(paginated)
  })

  it('get() appelle GET /articles/:id', async () => {
    const item = { id: 1, created_at: '2024-01-01', updated_at: '2024-01-01' }
    mockApiFetch.mockResolvedValue(item)

    const { get } = useArticles()
    await get(1)

    expect(mockApiFetch).toHaveBeenCalledWith('/articles/1')
  })

  it('create() appelle POST /articles', async () => {
    const payload = { name: 'Test Article', content: 'This is a test article.' }
    mockApiFetch.mockResolvedValue({ id: 1, ...payload })

    const { create } = useArticles()
    await create(payload as any)

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/articles',
      { method: 'POST', body: payload }
    )
  })

  it('remove() appelle DELETE /articles/:id', async () => {
    mockApiFetch.mockResolvedValue(undefined)

    const { remove } = useArticles()
    await remove(42)

    expect(mockApiFetch).toHaveBeenCalledWith('/articles/42', { method: 'DELETE' })
  })
})
