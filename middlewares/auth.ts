import { useCookies } from '@vueuse/integrations/useCookies'

export default defineNuxtRouteMiddleware((to) => {
  const cookies = useCookies()

  const token = cookies.get('token')
  const refreshToken = cookies.get('refresh_token')

  if (!token || !refreshToken) {
    return navigateTo('/auth/sign-in')
  }
})