// tests/components/article/ArticleCard.spec.ts
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ArticleCard from '~/pages/articles/components/ArticleCard.vue'

const mockArticle = {
  id:         1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  name:       'Mon premier article',
  content:    'Contenu de mon premier article'
}

describe('ArticleCard', () => {
  it('affiche l\'id du article', async () => {
    const wrapper = await mountSuspended(ArticleCard, {
      props: { item: mockArticle as any }
    })
    expect(wrapper.text()).toContain('1')
  })

  it('émet 