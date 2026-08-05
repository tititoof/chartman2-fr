import type { Article, ArticlePaginated } from '~/types/Article'

export const useArticleStore = defineStore('article', {
  state: () => ({
    items:       [] as Article[],
    currentItem: null as Article | null,
    loading:     false,
    error:       null as string | null,
    meta: {
      total:       0,
      page:        1,
      per_page:    10,
      total_pages: 0
    }
  }),

  getters: {
    totalPages: (state): number => state.meta.total_pages,
    isEmpty:    (state): boolean => state.items.length === 0 && !state.loading
  },

  actions: {
    setList(data: ArticlePaginated) {
      this.items = data.articles
      this.meta  = data.meta
    },
    setCurrentItem(item: Article | null) {
      this.currentItem = item
    },
    setLoading(val: boolean) {
      this.loading = val
    },
    setError(msg: string | null) {
      this.error = msg
    },
    removeItem(id: number) {
      this.items = this.items.filter(i => i.id !== id)
      this.meta.total--
    }
  }
})