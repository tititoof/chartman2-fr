// server/api/article/[id].get.ts
import type { Article } from '~/types/Article'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'auth_token')
  const id = getRouterParam(event, 'id')

  if (!token) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!id)    throw createError({ statusCode: 400, message: 'ID manquant' })

  return await $fetch<Article>(`${config.railsApiBase}/articles/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
})