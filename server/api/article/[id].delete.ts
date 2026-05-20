// server/api/article/[id].delete.ts
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'auth_token')
  const id = getRouterParam(event, 'id')

  if (!token) throw createError({ statusCode: 401, message: 'Non authentifié' })
  if (!id)    throw createError({ statusCode: 400, message: 'ID manquant' })

  await $fetch(`${config.railsApiBase}/articles/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })

  return { success: true }
})