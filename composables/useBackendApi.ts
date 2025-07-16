import { useCookies } from '@vueuse/integrations/useCookies'

export const useBackendApi = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  params?: object,
  isAuthenticateNeeded: boolean = false) => {
    
  const methods = ['GET', 'POST', 'PUT', 'DELETE']
  
  const cookies = useCookies(['token'])
  useNuxtApp().$apiErrors.value = []

  let headers: { [key: string]: string } = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }

  if (! methods.includes(method)) {
    return Promise.reject({
      reason: 503
    })
  }

  if (isAuthenticateNeeded) {
    if (!cookies.get('token')) {
      return Promise.reject({
        reason: 503
      })
    }

    headers.Authorization = 'Bearer ' + cookies.get('token')
  }

  const options = {
    method,
    headers
  }

  if (method == 'GET') {
    options.query = params
  } else {
    options.body = params
  }

  return await useNuxtApp().$api(endpoint, options)
}