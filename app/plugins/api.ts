import { useCookies } from '@vueuse/integrations/useCookies'

export default defineNuxtPlugin((nuxtApp) => {
  const cookies = useCookies(['refresh_token'])
  const config = useRuntimeConfig()
  const baseUrl = "https://" + config.public.apiBaseUrl

  const apiErrors = ref<string[]>([])

  const api = $fetch.create({
    baseURL: baseUrl,
    async onResponseError({ request, response, options, error }) {
      if (response.status === 500) {
        console.log(response)
      //   await nuxtApp.runWithContext(() => navigateTo('/login'))
      } else if (response.status === 401) { 
        try {
          const headers: { [key: string]: string } = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cookies.get('refresh_token') || ''}`
          }

          const { token: newToken, refresh_token: newRefreshToken } = await $fetch('/users/tokens/refresh', {
            method: 'POST',
            baseURL: baseUrl,
            headers
          })

          // Stocker les nouveaux tokens
          cookies.set('token', newToken)
          cookies.set('refresh_token', newRefreshToken)

          // Réessayer la requête originale avec le nouveau token
          options.headers = options.headers || {}
          options.headers.Authorization = `Bearer ${newToken}`
          
          return await $fetch(request, options as any)
        } catch (refreshError) {
          console.log(refreshError)
          // Le refresh a échoué => suppression des cookies + redirection
          cookies.remove('token')
          cookies.remove('refresh_token')
          
          return navigateTo('/auth/sign-in')
        }
      } else{
        console.log(response)
        const errData = response._data

        if (errData) {
          apiErrors.value = errData

        } else {
          console.error('Erreur générale :', errData?.message || error.message)
        }
      }
    }
  })

  // Expose to useNuxtApp().$api
  return {
    provide: {
      api,
      apiErrors
    }
  }
})