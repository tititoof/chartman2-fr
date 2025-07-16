import * as fs from 'fs'
import * as path from 'path'

export class generateApiCrudComposable {
  constructor(dirname, apiName, apiEndPoint) {
    this.dirname = dirname
    this.apiName = apiName
    this.apiEndPoint = apiEndPoint

    this.composablesDir = path.join(this.dirname, 'composables')
    this.pluginsDir = path.join(this.dirname, 'plugins')
    this.composableName = `use${this.apiName}Api`
    this.composableFilePath = path.join(this.composablesDir, 'api', `${this.composableName}.ts`)
    this.backendApiFilePath = path.join(this.composablesDir, 'useBackendApi.ts')
    this.pluginsApiFilePath = path.join(this.pluginsDir, 'api.ts')
  }

  ensureUseBackendApi() {
    if (!fs.existsSync(this.backendApiFilePath)) {
      console.log('Création du fichier useBackendApi.ts')

      const content
= `
import { useCookies } from '@vueuse/integrations/useCookies'

export const useBackendApi = async (endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  data?: object,
  isAuthenticateNeeded: boolean = false): Promise<any> => {
          
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBaseUrl
  const methods = ['GET', 'POST', 'PUT', 'DELETE']
  const cookies = useCookies(['token'])
          
  let headers: { [key: string]: string } = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
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
    body: data,
    headers
  }
  
  useNuxtApp().$apiErrors.value = []

  return useFetch(endpoint, {
    ...options,
    $fetch: useNuxtApp().$api as typeof $fetch
  })
}`

      fs.writeFileSync(this.backendApiFilePath, content)
    }
  }

  ensureUsePluginApi() {
    if (!fs.existsSync(this.pluginsApiFilePath)) {
      const content
= `export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const baseUrl = "https://" + config.public.apiBaseUrl

  const apiErrors = ref<string[]>([])

  const api = $fetch.create({
    baseURL: baseUrl,
    async onResponseError({ request, response, error }) {
      if (response.status === 500) {
      //   await nuxtApp.runWithContext(() => navigateTo('/login'))
      } else {
        const errData = response._data

        if (errData) {
          apiErrors.value = errData
        } else {
          console.error('Erreur générale :', errData?.message || error.message)
        }
      }
    }
  })

  return {
    provide: {
      api,
      apiErrors
    }
  }
})`
      fs.writeFileSync(this.pluginsApiFilePath, content)
    }
  }

  generateComposable() {
    const content
= `export const ${this.composableName} = async (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  data?: object | null,
  id: string | null = null
): Promise<any> => {
  const endpoint = '${this.apiEndPoint}' + (id !== null ? '/' + id : '')

  return await useBackendApi(endpoint, method, data, true)
}`

    if (!fs.existsSync(path.join(this.composablesDir, 'api'))) {
      fs.mkdirSync(path.join(this.composablesDir, 'api'), { recursive: true })
    }
    fs.writeFileSync(this.composableFilePath, content)

    console.log(`Composable ${this.composableName} créé avec succès !`)
  }
}
