// server/api/article/index.get.ts
import type { ArticlePaginated } from '~/types/Article'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'auth_token')

  if (!token) {
    throw createError({ statusCode: 401, message: 'Non authentifié' })
  }

  const query = getQuery(event)

  return await $fetch<ArticlePaginated>(`${config.railsApiBase}/articles`, {
    headers: { Authorization: `Bearer ${token}` },
    query
  })
})