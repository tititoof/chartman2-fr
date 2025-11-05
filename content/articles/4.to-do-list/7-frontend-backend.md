---
title: 'To-do list App'
description: 'Frontend-backend'
icon: 'i-mdi:checkbox-marked-circle-plus-outline'
color: 'secondary'
article_id: '7-to-do-list-frontend-backend'
---

Nous pouvons maintenant connecter le frontend avec le backend.

#### 🎨 Modification du frontend

Nous allons ajouter des plugins pour l'ajout de la connexion au backend et les requêtes associées, des services et procédures de notre frontend.

##### 📦 Création des plugins

Nous créons 3 plugins au chargement de Nuxt.

* **Un premier pour charger les fichiers d'APIs (connexion, chargement des items...)**

```js [plugins/appApi.ts] meta-info=val
export default defineNuxtPlugin((nuxtApp) => {
  // @ts-ignore
  const modulesToImport = import.meta.glob('../src/apis/modules/*.ts')
  const modules = {}

  for (const path in modulesToImport) {
    // @ts-ignore
    modulesToImport[path]().then((module) => {
      const moduleName = module.default.moduleName // Récupérer l'attribut statique "name"
      const moduleInstance = new module.default() // Créer une instance du module

      // @ts-ignore
      modules[moduleName] = moduleInstance // Ajouter le module à l'objet addedModules
    })
  }

  return {
    provide: {
      api: modules,
    },
  }
})
```

* **Le plugin pour le chargement des procéduures (service appelant d'autres services)**

```js [plugins/appProcedure.ts]
export default defineNuxtPlugin((nuxtApp) => {
  // @ts-ignore
  const modulesToImport = import.meta.glob('../src/procedures/**/*.ts')
  const modules = {}

  for (const path in modulesToImport) {
    // @ts-ignore
    modulesToImport[path]().then((module) => {
      const moduleName = module.default.moduleName // Récupérer l'attribut statique "name"
      const moduleInstance = new module.default() // Créer une instance du module

      // @ts-ignore
      modules[moduleName] = moduleInstance // Ajouter le module à l'objet addedModules
    })
  }

  return {
    provide: {
      procedures: modules,
    },
  }
})
```


* **Les derniers pour le chargement des services**


```js [plugins/appService.ts]
export default defineNuxtPlugin((nuxtApp) => {
  // @ts-ignore
  const modulesToImport = import.meta.glob('../src/services/**/*.ts')
  const modules = {}

  for (const path in modulesToImport) {
    // @ts-ignore
    modulesToImport[path]().then((module) => {
      const moduleName = module.default.moduleName // Récupérer l'attribut statique "name"
      const moduleInstance = new module.default() // Créer une instance du module

      // @ts-ignore
      modules[moduleName] = moduleInstance // Ajouter le module à l'objet addedModules
    })
  }

  return {
    provide: {
      services: modules,
    },
  }
})
```

```ts [src/appService.ts]
class AppService {
  protected nuxtApp: any

  constructor() {
    this.nuxtApp = useNuxtApp()
  }
}

export default AppService
```

* Créons un service pour gérer les erreurs

```ts [src/services/common/apiErrors.ts]
import AppService from "~/src/appService";

class ApiErrors extends AppService {
  static readonly moduleName: string = 'apiErrors'

  getIndividualItems (errors: { [key: string]: any }, key: string, translate: any) {
    if (Array.isArray(errors[key])) {
      return errors[key].map((item: string) => translate(`errors.${key}.${item}`));
    }

    return [];
  }

  format(errors: { [key: string]: any }, translate: any) {
    if (errors instanceof Object) {
      const formatedErrors = []

      for (const key in errors) {
        if (errors.hasOwnProperty(key)) {
          formatedErrors.push(this.getIndividualItems(errors, key, translate))
        }
      }

      return formatedErrors.join("\n")
    }

    return errors
  }
}

export default ApiErrors
```


 * On crée un service pour gérer les codes `http` backend.


```ts [src/services/common/httpCodes.ts]
import AppService from "~/src/appService"
import { StatusCode1xx, StatusCode2xx, StatusCode3xx, StatusCode4xx, StatusCode5xx } from "~/types/common"

class HttpCodesModule extends AppService {
  static readonly moduleName: string = 'httpCodes'

  checkApiResponse (data: string, statusCode: number | null) {
    if (data === 'NetworkError when attempting to fetch resource.'
    || statusCode === null
    || StatusCode5xx.hasOwnProperty(statusCode.toString())) {
      return { success: false, type: 'error', title: 'httpCode.error' }
    }

    if (StatusCode1xx.hasOwnProperty(statusCode.toString())
    || StatusCode3xx.hasOwnProperty(statusCode.toString())) {
      return { success: true, type: 'info', title: 'httpCode.info' }
    }

    if (StatusCode2xx.hasOwnProperty(statusCode.toString())) {
      return { success: true, type: 'success', title: 'httpCode.success' }
    }

    if (StatusCode4xx.hasOwnProperty(statusCode.toString())) {
      return { success: false, type: 'warning', title: 'httpCode.warning' }
    }
  }
}

export default HttpCodesModule
```


* Création du service pour la gestion des `items`


```ts [src/services/todo/items.ts]
import AppService from '~/src/appService'
import { useTodoStore } from '~/stores/todo'
import type { ReturnedResponseType } from '~/types/common'

class ItemsModule extends AppService {
  static readonly moduleName = 'items'

  async list (): Promise<ReturnedResponseType> {
    const todoStore = useTodoStore()

    // @ts-ignore
    const { data, statusCode } = await this.nuxtApp.$api.items.index()
    
    // @ts-ignore
    const { success, type, title } = this.nuxtApp.$services.httpCodes.checkApiResponse(data, statusCode)

    if (success) {
      todoStore.setItems(data.data)
    }

    return { success, type, title, data }
  }

  async create (params: any): Promise<ReturnedResponseType> {
    // @ts-ignore
    const { data, statusCode } = await this.nuxtApp.$api.items.create(params)

    // @ts-ignore
    const { success, type, title } = this.nuxtApp.$services.httpCodes.checkApiResponse(data, statusCode)

    return { success, type, title, data }
  }

  async update (id: number, params: any): Promise<ReturnedResponseType> {
    // @ts-ignore
    const { data, statusCode } = await this.nuxtApp.$api.items.update(id, params)

    // @ts-ignore
    const { success, type, title } = this.nuxtApp.$services.httpCodes.checkApiResponse(data, statusCode)

    return { success, type, title, data }
  }

  async destroy (id: number): Promise<ReturnedResponseType> {
    // @ts-ignore
    const { data, statusCode } = await this.nuxtApp.$api.items.destroy(id)

    // @ts-ignore
    const { success, type, title } = this.nuxtApp.$services.httpCodes.checkApiResponse(data, statusCode)

    return { success, type, title, data }
  }
}

export default ItemsModule
```


* Création du service pour la gestion des `scopes`


```ts [src/services/todo/scopes.ts]
import AppService from '~/src/appService'
import { useTodoStore } from '~/stores/todo'

class ScopesModule extends AppService {
  static readonly moduleName = 'scopes'

  async list () {
    // const { $api } = useNuxtApp()
    const todoStore = useTodoStore()

    // @ts-ignore
    const { data, statusCode } = await this.nuxtApp.$api.scopes.index()

    // @ts-ignore
    const { success, type, title } = this.nuxtApp.$services.httpCodes.checkApiResponse(data, statusCode)

    if (success) {
      todoStore.setScopes(data.data)
    }

    return { success, type, title, data }
  }

  async create (params: any) {
    // @ts-ignore
    const { data, statusCode } = await this.nuxtApp.$api.scopes.create(params)

    // @ts-ignore
    const { success, type, title } = this.nuxtApp.$services.httpCodes.checkApiResponse(data, statusCode)

    return { success, type, title, data }
  }

  async update (id: number, params: any) {
    // @ts-ignore
    const { data, statusCode } = await this.nuxtApp.$api.scopes.update(id, params)

    // @ts-ignore
    const { success, type, title } = this.nuxtApp.$services.httpCodes.checkApiResponse(data, statusCode)

    return { success, type, title, data }
  }

  async destroy (id: number) {
    // @ts-ignore
    const { data, statusCode } = await this.nuxtApp.$api.scopes.destroy(id)

    // @ts-ignore
    const { success, type, title } = this.nuxtApp.$services.httpCodes.checkApiResponse(data, statusCode)

    return { success, type, title, data }
  }
}

export default ScopesModule
```


* Création du service pour la gestion de l'authenfication

```ts [src/services/users/auth.ts]
import AppService from '~/src/appService'
import { useApplicationStore } from '~/stores/application'
import type { ReturnedResponseType } from '~/types/common'

class AuthModule extends AppService {
  static readonly moduleName: string = 'auth'

  async signIn (email: string, password: string): Promise<ReturnedResponseType> {
    const usersStore = useApplicationStore()

    // @ts-ignore
    const { data, statusCode } = await this.nuxtApp.$api.auth.signIn({ email, password })
    
    // @ts-ignore
    const { success, type, title } = this.nuxtApp.$services.httpCodes.checkApiResponse(data, statusCode)

    usersStore.setIsConnected(success)

    return { success, type, title, data }
  }
}

export default AuthModule
```


* Création du service pour la gestion des `utilisateurs`


```ts [src/services/users/user.ts]
import AppService from "~/src/appService"
import type { ReturnedResponseType } from "~/types/common"

class UserModule extends AppService {
  static readonly moduleName: string = 'user'

  async current (): Promise<ReturnedResponseType> {
    // @ts-ignore
    const { data, statusCode } = await this.nuxtApp.$api.auth.info()

    // @ts-ignore
    const { success, type, title } = this.nuxtApp.$services.httpCodes.checkApiResponse(data, statusCode)

    return { success, type, title, data }
  }
}

export default UserModule
```

* Création de la procédure d'authentification


```ts [src/procedures/auth.ts]
import AppFactory from '~/src/appService'
import type { ReturnedResponseType } from "~/types/common"

class AuthModule extends AppFactory {
  static readonly moduleName = "auth"

  async signIn (email: string, password: string): Promise<ReturnedResponseType> {
    // @ts-ignore
    const { success, type, title, data } = await this.nuxtApp.$services.auth.signIn(email, password)

    if (! success) {
      return { success, type, title, data }
    }

    // @ts-ignore
    return await this.nuxtApp.$services.user.current()
  }
}

export default AuthModule
```


* Création du service pour la gestion des `apis`

```ts [src/apis/apiService.ts]
// @ts-nocheck
import { useStorage, createFetch } from '@vueuse/core'
import type { RemovableRef } from '@vueuse/core'
import type { IFetchResponse } from '~/types/common'
import { DefaultStorage, type IStorage } from '~/types/auth/storage'

import * as CryptoJS from 'crypto-js'

class ApiService {
  static readonly MAX_ATTEMPS = 3
  protected REFRESH_TOKEN: string = '/users/tokens/refresh'

  protected storage: RemovableRef<string>

  private myFetch: any
  private maxAttempts: number = 2
  private key: string
  private iv: string

  constructor() {
    const config = useRuntimeConfig()
    
    this.key = CryptoJS.enc.Utf8.parse(config.public.cryptSecretKey)
    this.iv = CryptoJS.enc.Utf8.parse('7061737323313233')

    this.storage = useStorage(
      config.public.appStorageName, 
      this.setStorageValue(DefaultStorage.token, DefaultStorage.refresh_token),
      window.localStorage,
      {
        // mergeDefaults: true,
        serializer: {
          read: (v) => v,
          write: (v) => String(v)
        },
      }
    )

    this.myFetch = createFetch({
      baseUrl: config.public.apiBaseUrl,
      fetchOptions: {
        mode: 'cors',
        
      },
      options: {
        updateDataOnError: true,
        onFetchError(ctx) {
          if (ctx.error.statusCode === 422) {
            ctx.data = ctx.data
          }

          return ctx
        }
      }
    })
  }

  async fetch (path: string, method: string, headers: HeadersInit, payload: object | null): Promise<IFetchResponse> {
    const requestInit: RequestInit = { method, headers };
    
    let data = { data: {}, statusCode: 0 }
    let attempts = 0
  
    if (payload) {
      requestInit.body = JSON.stringify(payload);
    }

    while (attempts < this.maxAttempts) {
      const response = await this.myFetch(path, requestInit).json()

      if (response.error.value && response.statusCode.value !== 422) {
        attempts++
        
        // @ts-ignore
        if (path !== this.REFRESH_TOKEN) {
          // @ts-ignore
          await this.refreshToken()
        }

        data = { data: response.error.value, statusCode: response.statusCode.value }
      } else {
        data = { data: response.data.value, statusCode: response.statusCode.value }

        attempts = this.maxAttempts
      }
    }
  
    return data
  }

  getAuthHeaders () {
    const authorization: string = this.getStorageAttribut('token')

    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authorization
    }
  }

  getRefreshHeaders () {
    const authorization: string = this.getStorageAttribut('refresh_token')

    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authorization
    }
  }


  getHeaders () {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  }

  getUploadHeaders () {
    const authorization: string = this.getStorageAttribut('token')

    return {
      Authorization: authorization
    }
  }

  getStorageAttribut (attribut: string) {
    const storageValue: IStorage = JSON.parse(this.decrypt(this.storage.value))
    
    if (storageValue.hasOwnProperty(attribut)) {
      return storageValue[attribut]
    }

    return undefined
  }

  setStorageValue (token: string, refreshToken: string) {
    return this.encrypt(JSON.stringify({
      token: token,
      refresh_token: refreshToken
    }))
  }

  // https://stackoverflow.com/questions/41671267/encrypt-the-string-in-typescript-and-decrypt-in-c-sharp-using-advanced-encryptio/41792242
  encrypt (message: string | null) {
    const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(message), this.key, {
      keySize: 128 / 8,
      iv: this.iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })

    return encrypted.toString()
  }

  decrypt (encryptedMessage: string | null) {
    const decrypted = CryptoJS.AES.decrypt(encryptedMessage, this.key, {
      keySize: 128 / 8,
      iv: this.iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })

    return decrypted.toString(CryptoJS.enc.Utf8)
  }
}


export default ApiService
```

* Création de l'api pour l'authenfication

```ts [src/apis/modules/auth.ts]
import ApiService from '~/src/apis/apiService'
import type { IFetchResponse } from '~/types/common'
import type { ILoginInput } from '~/types/auth/log_in'
import { DefaultStorage } from '~/types/auth/storage'

class AuthModule extends ApiService {
  static readonly moduleName = "auth"

  private LOGIN: string = '/users/tokens/sign_in'
  private LOGOUT: string = '/users/tokens/sign_out'
  // private REFRESH_TOKEN: string = '/users/tokens/refresh'
  private INFO: string = '/users/tokens/info'

  async signIn (credentials: ILoginInput): Promise<IFetchResponse> {
    const { data, statusCode } = await this.fetch(this.LOGIN, 'POST', this.getHeaders(), credentials)
    
    if (statusCode === 200) {
      const storageValue = this.setStorageValue(data.token, data.refresh_token)

      this.storage.value = storageValue
    }

    return { data, statusCode }
  }

  async signOut (): Promise<IFetchResponse> {
    const { data, statusCode } = await this.fetch(this.LOGOUT, 'DELETE', this.getAuthHeaders(), null)

    this.storage.value = JSON.stringify(DefaultStorage)

    return { data, statusCode }
  }

  async refreshToken (): Promise<IFetchResponse> {
    const { data, statusCode } = await this.fetch(this.REFRESH_TOKEN, 'POST', this.getRefreshHeaders(), null)

    if (statusCode === 200) {
      const storageValue = this.setStorageValue(data.token, data.refresh_token)

      this.storage.value = storageValue
    }

    return { data, statusCode }
  }

  async info (): Promise<IFetchResponse> {
    return await this.fetch(this.INFO, 'GET', this.getAuthHeaders(), null)
  }
}

export default AuthModule
```


* Création de l'api pour la gestion des `items`

```ts [src/apis/modules/items.ts]
import ApiService from '~/src/apis/apiService'
import type { IFetchResponse } from '~/types/common'

class ItemsModule extends ApiService {
  static readonly moduleName = "items"

  private URL: string = '/api/v1/todo/items'

  async index (): Promise<IFetchResponse> {
    return await this.fetch(this.URL, 'GET', this.getAuthHeaders(), null)
  }

  async create (params: any): Promise<IFetchResponse> {
    return await this.fetch(this.URL, 'POST', this.getAuthHeaders(), params)
  }

  async update (id: number, params: any): Promise<IFetchResponse> {
    return await this.fetch(`${this.URL}/${id}`, 'PUT', this.getAuthHeaders(), params)
  }

  async destroy (id: number): Promise<IFetchResponse> {
    return await this.fetch(`${this.URL}/${id}`, 'DELETE', this.getAuthHeaders(), null)
  }
}

export default ItemsModule
```


* Création de l'api pour la gestion des `scopes`

```ts [src/apis/modules/scope.ts]
import ApiService from '~/src/apis/apiService'
import type { IFetchResponse } from '~/types/common'

class ScopesModule extends ApiService {
  static readonly moduleName = "scopes"

  private URL: string = '/api/v1/todo/scopes'

  async index (): Promise<IFetchResponse> {
    return await this.fetch(this.URL, 'GET', this.getAuthHeaders(), null)
  }

  async create (params: any): Promise<IFetchResponse> {
    return await this.fetch(this.URL, 'POST', this.getAuthHeaders(), params)
  }

  async update (id: number, params: any): Promise<IFetchResponse> {
    return await this.fetch(`${this.URL}/${id}`, 'PUT', this.getAuthHeaders(), params)
  }

  async destroy (id: number): Promise<IFetchResponse> {
    return await this.fetch(`${this.URL}/${id}`, 'DELETE', this.getAuthHeaders(), null)
  }
}

export default ScopesModule
```


* Création du store pour l'application


```ts [stores/application.ts]
import { defineStore, acceptHMRUpdate } from 'pinia'
import type { IStatus } from '~/types/snackbar/type'
import type { IUserResponse } from '~/types/user'

export const useApplicationStore = defineStore('application', {
  state: () => ({
    isDarkTheme: true,
    isThemeDefined: false,
    category: '' as IStatus,
    message: '' as string,
    show: false as boolean,
    current: {},
    isConnected: false,
  }),
  getters: {
    getIsDarkTheme: state => state.isDarkTheme,
    getIsThemeDefined: (state) => state.isThemeDefined,
    getCategory: (state) => state.category,
    getMessage: (state) => state.message,
    getShow: (state) => state.show,
    getCurrent: (state) => state.current,
    getIsConnected: (state) => state.isConnected,
  },
  actions: {
    setIsDarkTheme(isDarkTheme: boolean) {
      this.isDarkTheme = isDarkTheme
      this.isThemeDefined = true
    },
    setCategory(category: IStatus) {
      this.category = category
    },
    setMessage(message: string) {
      this.message = message
    },
    setShow(show: boolean) {
      this.show = show
    },
    toggleDarkTheme() {
      this.isDarkTheme = !this.isDarkTheme
      this.isThemeDefined = true
    },
    setCurrent(user: IUserResponse) {
      this.current = user
    },
    setIsConnected(isConnected: boolean) {
      this.isConnected = isConnected
    }
  },
  persist: {
    storage: piniaPluginPersistedstate.localStorage,
  },
})

if (Object.hasOwn(import.meta, 'hot')) {
  // @ts-ignore
  import.meta.hot.accept(acceptHMRUpdate(useApplicationStore, import.meta.hot))
}
```


* Création du store pour les items et les scopes (notre Todo)



```ts [stores/todo.ts]
import { defineStore, acceptHMRUpdate } from 'pinia'
import type { IItemData, IScopeData } from '~/types/todo'

export const useTodoStore = defineStore('todo', {
  state: () => ({
    items: [] as IItemData[],
    scopes: [] as IScopeData[],
    filteredItems: [] as IItemData[],
  }),
  getters: {
    getItems: state => state.items,
    getScopes: state => state.scopes,
    // getFilteredItems: state => state.filteredItems
  },
  actions: {
    setItems(items: IItemData[]) {
      this.items = items
    },
    setScopes(scopes: IScopeData[]) {
      this.scopes = scopes
    },
  },
  persist: {
      storage: piniaPluginPersistedstate.localStorage,
  },
})

if (Object.hasOwn(import.meta, 'hot')) {
    // @ts-ignore
    import.meta.hot.accept(acceptHMRUpdate(useTodoStore, import.meta.hot))
}
```

* Création du type `utilisateur`

```ts [types/user.ts]
export interface IUserResponse {
  "token": string,
  "refresh_token": string,
  "expires_in": number,
  "token_type": string,
  "resource_owner": {
    "id": number,
    "email": string,
    "created_at": string,
    "updated_at": string
  }
}


export interface UserData {
  id: number;
  email: string;
  created_at: Date | string;
  updated_at: Date | string;
}
```

* Création du type `todo`, `scope`, `item`

```ts [types/todo.ts]
export type IScopeAttribute = {
  id: number
  name: string
  nickname: string
}

export type IScopeData = {
  id: string
  type: string
  attributes: IScopeAttribute
}

export type IScopeApiResponse = {
  data: IScopeData[]
}

export type IItemAttributes = {
  id: number
  done: boolean
  name: string
  userId: number
  scopeId: number
}

export type IItemData = {
  id: string
  type: string
  attributes: IItemAttributes
}

export type IITemApiResponse = {
  data: IItemData[]
}
```


* Création des types communs - `response`, `statuts` ...

```ts [types/common.ts]
// import { RemovableRef } from "@vueuse/core"

export type stringFunction = (name: string | null) => string;

export interface IFetchResponse {
  data: any
  statusCode: number
}
export type MessageType = "warning" | "error" | "info" | "success" | null | undefined

export type ReturnedResponseType = {
  success: boolean
  type: MessageType
  title: string
  data: any
}

export const StatusCode1xx = {
  100: 'CONTINUE',
  101: 'SWITCHING_PROTOCOLS',
  102: 'PROCESSING',
  103: 'EARLY_HINTS'
}

export const StatusCode2xx = {
  200: 'SUCCESSFUL',
  201: 'CREATED',
  202: 'ACCEPTED',
  203: 'NON_AUTHORITATIVE_INFORMATION',
  204: 'NO_CONTENT',
  205: 'RESET_CONTENT',
  206: 'PARTIAL_CONTENT',
  207: 'MULTI_STATUS',
  208: 'ALREADY_REPORTED',
  226: 'IM_USED6'
}

export const StatusCode3xx = {
   300: 'REDIRECTION',
   301: 'MOVED_PERMANENTLY',
   302: 'FOUND',
   303: 'SEE_OTHER',
   304: 'NOT_MODIFIED',
   305: 'USE_PROXY',
   306: 'SWITCH_PROXY',
   307: 'TEMPORARY_REDIRECT',
   308: 'PERMANENT_REDIRECT'
}


export const StatusCode4xx = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  402: 'PAYMENT_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  406: 'NOT_ACCEPTABLE',
  407: 'PROXY_AUTHENTICATION_REQUIRED',
  408: 'REQUEST_TIMEOUT',
  409: 'CONFLICT',
  410: 'GONE',
  411: 'LENGTH_REQUIRED',
  412: 'PRECONDITION_FAILED',
  413: 'PAYLOAD_TOO_LARGE',
  414: 'URI_TOO_LONG',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  416: 'RANGE_NOT_SATISFIABLE',
  417: 'EXPECTATION_FAILED',
  418: 'I_AM_A_TEAPOT',
  421: 'MISDIRECTED_REQUEST',
  422: 'UNPROCESSABLE_ENTITY',
  423: 'LOCKED',
  424: 'FAILED_DEPENDENCY',
  425: 'TOO_EARLY',
  426: 'UPGRADE_REQUIRED',
  428: 'PRECONDITION_REQUIRED',
  429: 'TOO_MANY_REQUESTS',
  431: 'REQUEST_HEADER_FIELDS_TOO_LARGE'
}

export const StatusCode5xx = {
  500: 'SERVER_ERROR',
  501: 'NOT_IMPLEMENTED',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
  505: 'VERSION_NOT_SUPPORTED',
  507: 'INSUFFICIENT_STORAGE'
}
```

##### ✏️ Application des changements dans les pages


* Création du middleware pour contrôleur l'accès à notre Todo (utilisateur authentifié)

```ts [middleware/auth.ts]
import { useApplicationStore } from '~/stores/application'

export default defineNuxtRouteMiddleware(async (to) => {
  const nuxtApp = useNuxtApp()

  useRuntimeHook('page:finish', async () => {
    const usersStore = useApplicationStore()
    
    if (! usersStore.getIsConnected) {
      return navigateTo('/log_in')
    }

    // @ts-ignore
    if (nuxtApp.$api.auth.getStorageAttribut('token') === '' ) {
      return navigateTo('/log_in')
    }

    // @ts-ignore
    const { data, statusCode } = await nuxtApp.$api.auth.info()

    if (statusCode !== 200) {
      return navigateTo('/log_in')
    }
  })
})
```


```vue [pages/index.vue]
<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container>
      <page-title :title="$t('global.name')" icon="i-mdi:format-list-checks" />

      <section-title :title="$t('tasks.form.title')" />

      <v-row align="center" justify="center">
        <v-col cols="auto">
          <v-btn size="x-large" :nuxt="true" to="todo"> 
            Todo list
          </v-btn>
        </v-col>
      </v-row>
    </v-container>
  </v-row>
</template>
<script setup lang="ts">
  definePageMeta({
    middleware: 'auth',
  })
</script>
```

* Création de la page de connexion

```vue [pages/log_in.vue]
<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container class="py-12">
      <page-title
        :title="$t('auth.log_in')"
        icon="i-mdi:login-variant"
        subtitle=""
      />
        <card-log-in @on-sign-in="onSignIn" />
    </v-container>
  </v-row>
</template>

<script setup lang="ts">
const { $procedures, $api } = useNuxtApp()
const snackbar = useSnackbar()
const { t } = useI18n()


const onSignIn = async (email, password) => {
  const result = await $procedures.auth.signIn(email.value, password.value)
  const router = useRouter()

  let text = t("auth.failed")

  if (result.success) {
    text = t("auth.successed")

    router.push({ path: "/" })
  }

  snackbar.add({
    type: result.type,
    title: t(result.title),
    text: text
  })
}

</script>
`
```

* Modification de la page Todo 


```vue [pages/todo.vue]
<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container>
      <page-title :title="$t('global.name')" icon="i-mdi:format-list-checks" />

      <section-title :title="$t('tasks.form.title')" />

      <v-row class="py-3" v-if="formErrors.length > 0">
        <v-alert
          
          class="py-3"
          density="compact"
          :text="formErrors"
          :title="$t('httpCode.warning')"
          type="warning"
        />
      </v-row>

      <partial-todo-new @on-create-item="onCreateItem" />
        
      <section-title :title="$t('tasks.list.title')" />

      <partial-todo-list @on-update-item="onUpdateItem" />
    </v-container>
  </v-row>
</template>
<script setup lang="ts">
import type { ReturnedResponseType } from '~/types/common';

definePageMeta({
  middleware: 'auth',
})

const nuxtApp = useNuxtApp()
const { t } = useI18n()
const snackbar = useSnackbar()
const formErrors = ref('')

useRuntimeHook('page:finish', async () => {
  await getScopesList()

  await getTasksList()
})


const onCreateItem = async (name: string, scopeId: number) => {
  formErrors.value = ''

  // @ts-ignore
  const result: ReturnedResponseType = await nuxtApp.$services.items.create({
    name,
    scope_id: scopeId,
    done: false
  })

  checkResults(result, 'tasks.form.created', 'tasks.form.failed')

  getTasksList()
}

const onUpdateItem = async (itemId: number, name: string, scopeId: number, done: boolean) => {
  // @ts-ignore
  const result: ReturnedResponseType = await nuxtApp.$services.items.update(itemId, {
    name,
    done,
    scope_id: scopeId
  })

  checkResults(result, 'tasks.form.updated', 'tasks.form.failed')

  getTasksList()
}

const getTasksList = async () => {
  // @ts-ignore
  const result: ReturnedResponseType = await nuxtApp.$services.items.list()

  checkResults(result, 'tasks.fetch.successed', 'tasks.fetch.failed')
}

const getScopesList = async () => {
  // @ts-ignore
  const result: ReturnedResponseType = await nuxtApp.$services.scopes.list()

  checkResults(result, 'tasks.fetch.successed', 'tasks.fetch.failed')
}


const checkResults = (result: ReturnedResponseType, successed: string, failed: string) => {
  let text = t(failed)

  if (result.success) {
    text = t(successed)
  } else {
    // @ts-ignore
    formErrors.value = nuxtApp.$services.apiErrors.format(result.data, t)
  }

  snackbar.add({
    type: result.type,
    title: t(result.title),
    text: text
  })
}
</script>
```

* Modification de la liste


```vue [components/partial/todo/list.vue]
<template>
  <v-row>
    <v-radio-group
      v-model="filterTaskScope"
      inline
    >
      <template 
        v-for="scope in scopes"
        :key="scope.attributes.id"
        >
        <v-radio
          :label="scope.attributes.nickname"
          :value="scope.attributes.id"
        />
      </template>
      <v-radio
        :label="$t('tasks.list.all')"
        :value="0"
      />
    </v-radio-group>
  </v-row>
  <v-row
    v-for="task in listTasksFiltred"
    :key="task.attributes.id"
  >
    <v-col cols="4">
      <v-chip color="primary">
        <div :class="{'text-decoration-line-through': task.attributes.done === true}">
          {{ $t('tasks.scope.' + getScopeNicknameFromItem(task.attributes.scopeId)) }}
          {{ task.attributes.done === true ? 'Y' : 'N' }}
        </div>
      </v-chip>
    </v-col>
    <v-col cols="4">
      <div :class="{'text-decoration-line-through': task.attributes.done === true}">
        {{ task.attributes.name }}
      </div>
    </v-col>
    <v-col cols="4">
      <v-btn 
        v-if="task.attributes.done === false"
        type="button" 
        block
        @click.prevent="performTask(task)"
      >
        <v-icon icon="i-mdi:checkbox-marked-circle-plus-outline" />
      
        {{ $t('tasks.form.done') }}
      </v-btn>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { useTodoStore } from '~/stores/todo'
import type { IItemData } from '~/types/todo';

const emit = defineEmits(['onUpdateItem'])

const todoStore = useTodoStore()
const items = computed(() => todoStore.getItems)
const scopes = computed(() => todoStore.getScopes)
const filterTaskScope = ref(0)
const listTasksFiltred = computed(() => {
  if (filterTaskScope.value !== 0) {
    return items.value.filter( (item) => {
      return item.attributes.scopeId === filterTaskScope.value
    })
  }

  return items.value
})

const performTask = (task: IItemData) => {
  emit('onUpdateItem', task.attributes.id, task.attributes.name, task.attributes.scopeId, true)
}

const getScopeNicknameFromItem = (scopeId: number) => {
  return scopes.value.find(scope => scope.attributes.id === scopeId)?.attributes.nickname
}
</script>
```

* Modification du formulaire 


```vue [components/partial/todo/new.vue]
<template>
  <v-form 
    @submit.prevent="addTask" 
    v-model="formValid"
  >
    <v-row>
      <v-col cols="8">
        <v-text-field
          v-model="newTaskName"
          :rules="rules"
          :label="$t('tasks.form.name')"
        ></v-text-field>
      </v-col>
      <v-col cols="4">
        <v-btn type="submit" block :disabled="!formValid">
          {{ $t('tasks.form.add') }}
        </v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-radio-group
        v-model="newTaskScope"
        :rules="rules"
        inline
      >
        <v-radio
          v-for="(scope, scopeKey) in scopes"
          :key="scopeKey"
          :label="$t('tasks.scope.' + scope.attributes.nickname)"
          :value="scope.attributes.id"
        ></v-radio>
      </v-radio-group>
    </v-row>
  </v-form>
</template>

<script setup lang="ts">
import { useTodoStore } from '~/stores/todo'
import type { IScope } from '~/types/scope'

const emit = defineEmits(['onCreateItem'])

const todoStore = useTodoStore()
const { t } = useI18n()
const scopes = computed(() => todoStore.getScopes)
const newTaskName = ref('')
const newTaskScope = ref(null as IScope | null)
const formValid = ref(false)
const rules = reactive([
  (value: string) => {
    if (value) return true

    return t('tasks.form.required')
  },
])


const addTask = () => {
  emit('onCreateItem', newTaskName.value, newTaskScope.value)

  newTaskName.value = ''
  newTaskScope.value = null
}
</script>
```

Nous avons créé une petite application Todo, rapidement, qui peut être largement améliorée.

Les plugins peuvent être migrés vers des composables.

Voilà pour cette série d'article sur une petite ToDo Liste.