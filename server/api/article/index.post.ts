// server/api/article/index.post.ts
import type { CreateArticlePayload, Article } from '~/types/Article'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'auth_token')

  if (!token) throw createError({ statusCode: 401, message: 'Non authentifié' })

  const body = await readBody<CreateArticlePayload>(event)
  if (!body) throw createError({ statusCode: 400, message: 'Body manquant' })

  return await $fetch<Article>(`${config.railsApiBase}/articles`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body
  })
})