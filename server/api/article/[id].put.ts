// server/api/article/[id].put.ts
import type { UpdateArticlePayload, Article } from '~/types/Article'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'auth_token')
  const id = getRouterParam(event, 'id')

  if (!token) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!id)    throw createError({ statusCode: 400, message: 'ID manquant' })

  const body = await readBody<UpdateArticlePayload>(event)

  return await $fetch<Article>(`${config.railsApiBase}/articles/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body
  })
})