// composables/article/useArticles.ts
import type {
  Article,
  ArticlePaginated,
  CreateArticlePayload,
  UpdateArticlePayload
} from '~/types/Article'

export const useArticles = () => {
  const { apiFetch } = useApi()

  const list = (page = 1, query?: Record<string, string | number>) =>
    apiFetch<ArticlePaginated>(`/articles`, { query: { page, ...query } })

  const get = (id: number) =>
    apiFetch<Article>(`/articles/${id}`)

  const create = (payload: CreateArticlePayload) =>
    apiFetch<Article>(`/articles`, { method: 'POST', body: payload })

  const update = (id: number, payload: UpdateArticlePayload) =>
    apiFetch<Article>(`/articles/${id}`, { method: 'PUT', body: payload })

  const remove = (id: number) =>
    apiFetch<void>(`/articles/${id}`, { method: 'DELETE' })

  return { list, get, create, update, remove }
}