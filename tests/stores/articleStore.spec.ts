// tests/stores/articleStore.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useArticleStore } from '~/stores/articleStore'

describe('ArticleStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('a un état initial correct', () => {
    const store = useArticleStore()
    expect(store.items).toEqual([])
    expect(store.currentItem).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('setList() met à jour items et meta', () => {
    const store = useArticleStore()
    const data  = {
      articles: [{ id: 1, name: 'Article 1', content: 'Contenu de l'article 1' }],
      meta: { total: 1, page: 1, per_page: 10, total_pages: 1 }
    }
    store.setList(data as any)
    expect(store.items).toHaveLength(1)
    expect(store.meta.total).toBe(1)
  })

  it('removeItem() retire l\'item et décrémente le total', () => {
    const store = useArticleStore()
    store.setList({
      articles: [
        { id: 1, name: 'Article 1', content: 'Contenu de l'article 1' },
        { id: 2, name: 'Article 2', content: 'Contenu de l'article 2' }
      ],
      meta: { total: 2, page: 1, per_page: 10, total_pages: 1 }
    } as any)

    store.removeItem(1)
    expect(store.items).toHaveLength(1)
    expect(store.items[0].id).toBe(2)
    expect(store.meta.total).toBe(1)
  })

  it('isEmpty est true quand items est vide et loading est false', () => {
    const store = useArticleStore()
    expect(store.isEmpty).toBe(true)
    store.setLoading(true)
    expect(store.isEmpty).toBe(false)
  })

  it('setError() met à jour le message d\'erreur', () => {
    const store = useArticleStore()
    store.setError('Erreur de chargement')
    expect(store.error).toBe('Erreur de chargement')
    store.setError(null)
    expect(store.error).toBeNull()
  })
})
