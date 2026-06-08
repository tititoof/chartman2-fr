---
title: 'Todo List — Frontend : authentification'
description: 'Sessions sécurisées avec nuxt-auth-utils, server routes BFF, login et inscription'
icon: 'i-mdi:checkbox-marked-circle-plus-outline'
color: 'secondary'
article_id: '2-to-do-list-auth'
---

#### 🔐 Frontend — Authentification

Dans cet article, nous mettons en place l'authentification complète.
Plutôt que de stocker le token JWT dans le `localStorage` — accessible
depuis JavaScript et donc vulnérable aux attaques XSS — nous utilisons
**nuxt-auth-utils**, le module officiel Nuxt, qui stocke le token côté serveur
dans un cookie scellé et chiffré.

> 💡 Commit correspondant :
> [`feat: authentification avec nuxt-auth-utils`](https://forgejo.chartman-fr.ovh/tititoof/todo-frontend){:target="_blank"}

---

#### 🛡️ Pourquoi nuxt-auth-utils ?

::tool-table
| | localStorage | nuxt-auth-utils |
|---|---|---|
| **Token visible en JS** | ✅ Oui — XSS vulnérable | ❌ Non |
| **httpOnly** | ❌ | ✅ |
| **Chiffrement** | Manuel (clé exposée dans le bundle) | Automatique (clé serveur) |
| **SSR-compatible** | ❌ | ✅ |
| **Dépendances** | `crypto-js` | aucune |
::

> ⚠️ `nuxt-auth-utils` nécessite un serveur Nuxt actif (`nuxt build`).
> Il est incompatible avec `nuxt generate` (génération statique).

---

#### 🏗️ Architecture — pattern BFF

`nuxt-auth-utils` introduit le pattern **BFF (Backend For Frontend)** :
le serveur Nuxt s'intercale entre le browser et Rails. Le browser n'appelle
jamais Rails directement.

<mermaid>
graph TD
  Browser["🌍 Browser"]
  NS["⚡ Nuxt Server\nserver/api/auth/"]
  Rails["💎 Rails API"]
  Session["🔒 Session scellée\nrails_token — jamais envoyé au browser"]
  Browser -->|"POST /api/auth/login"| NS
  NS -->|"POST /users/tokens/sign_in"| Rails
  Rails -->|"token + refresh_token"| NS
  NS -.->|"Stocke"| Session
  NS -->|"Cookie httpOnly — user: id, email"| Browser
  Browser -->|"Cookie + GET /api/todo/items"| NS
  NS -->|"Bearer rails_token"| Rails
  Rails -->|"items"| NS
  NS -->|"items"| Browser
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  classDef sessionStyle fill:#dfd,stroke:#0d0,stroke-width:2px;
  class Browser,NS,Rails containerStyle;
  class Session sessionStyle;
</mermaid>

---

#### 🏗️ Construction

---

##### 1. Mettre à jour `package.json`

On ajoute `nuxt-auth-utils` et on supprime `crypto-js` qui n'est plus
nécessaire puisque le chiffrement est désormais géré côté serveur par Nuxt :

```json [package.json]
{
  "dependencies": {
    "@mdi/font": "^7.4.47",
    "@nuxtjs/i18n": "^9.5.5",
    "@pinia/nuxt": "^0.11.1",
    "@vueuse/core": "^12.7.0",
    "@vueuse/nuxt": "^12.7.0",
    "nuxt": "^4.4.7",
    "nuxt-auth-utils": "^0.5.18",
    "pinia": "^3.0.2",
    "pinia-plugin-persistedstate": "^4.3.0",
    "vue": "^3.5.16",
    "vue-router": "^5.0.0",
    "vuetify": "^3.8.5",
    "vuetify-nuxt-module": "^0.18.4"
  },
  "devDependencies": {
    "@nuxt/test-utils": "^3.17.2",
    "@vue/test-utils": "^2.4.6",
    "typescript": "^5.8.3",
    "vitest": "^3.2.4",
    "vue-tsc": "^2.2.10"
  }
}
```

Puis reconstruisez l'image pour installer les nouvelles dépendances :

```bash
docker compose build
```

---

##### 2. Mettre à jour `nuxt.config.ts`

Ajoutez `nuxt-auth-utils` en tête des modules et mettez à jour le
`runtimeConfig`. La clé `railsApiUrl` est dans la section **privée** —
elle ne sera jamais exposée au browser :

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: process.env.DEVTOOLS_ENABLE === 'true' },

  modules: [
    'nuxt-auth-utils',            // ← en premier
    'vuetify-nuxt-module',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/i18n',
    '@vueuse/nuxt',
  ],

  runtimeConfig: {
    railsApiUrl: process.env.RAILS_API_URL || 'http://todo-backend:3001',
    public: {
      appName: process.env.APP_NAME || 'Todo List',
    },
  },

  // ... reste inchangé
})
```

---

##### 3. Mettre à jour `.env.example`

Ajoutez les deux nouvelles variables et supprimez celles liées à l'ancienne
approche localStorage :

```bash [.env.example]
# Application
APP_NAME=Todo List
APP_URL=todo-frontend.domain.tld

# nuxt-auth-utils — générez avec : openssl rand -hex 32
NUXT_SESSION_PASSWORD=change_me_with_openssl_rand_hex_32

# Rails API — URL interne Docker, jamais exposée au browser
RAILS_API_URL=http://todo-backend:3001

# Docker
HMR_PORT=443

# Dev tools
DEVTOOLS_ENABLE=false
```

Générez la clé de session et mettez à jour votre `.env` :

```bash
openssl rand -hex 32
```

`NUXT_SESSION_PASSWORD` chiffre le cookie de session. Si elle est absente
en développement, Nuxt en génère une automatiquement mais elle change à
chaque redémarrage — toutes les sessions existantes sont alors invalidées.

---

##### 4. Mettre à jour `i18n.config.ts`

Ajoutez les clés de traduction nécessaires aux pages login et register :

```ts [i18n.config.ts]
export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'fr',
  messages: {
    fr: {
      global: {
        name: 'Todo List',
        home: 'Accueil',
        login: 'Connexion',
        register: 'Inscription',
        logout: 'Déconnexion',
      },
      auth: {
        log_in: 'Connexion',
        register: 'Inscription',
        email: 'Email',
        password: 'Mot de passe',
        password_confirmation: 'Confirmer le mot de passe',
        submit_login: 'Se connecter',
        submit_register: "S'inscrire",
        failed: 'Identifiants incorrects',
        register_failed: "Échec de l'inscription",
        no_account: 'Pas encore de compte ?',
        already_account: 'Déjà un compte ?',
      },
      form: {
        required: 'Ce champ est obligatoire.',
        email_invalid: 'Email invalide.',
        password_min: 'Minimum 6 caractères.',
        password_mismatch: 'Les mots de passe ne correspondent pas.',
      },
    },
    en: {
      global: {
        name: 'Todo List',
        home: 'Home',
        login: 'Login',
        register: 'Register',
        logout: 'Logout',
      },
    },
  },
}))
```

---

##### 5. Créer les types

Créez le répertoire et les trois fichiers de types :

```bash
mkdir -p app/types
```

**`app/types/auth.ts`** — les interfaces pour les formulaires d'authentification :

```ts [app/types/auth.ts]
export interface ILoginInput {
  email: string
  password: string
}

export interface IRegisterInput {
  email: string
  password: string
  password_confirmation: string
}
```

**`app/types/user.ts`** — l'interface utilisateur retournée par Rails :

```ts [app/types/user.ts]
export interface IUserInfo {
  id: number
  email: string
  created_at: string
  updated_at: string
}
```

**`app/types/session.d.ts`** — l'augmentation de type pour nuxt-auth-utils.
Ce fichier indique à TypeScript ce que contient notre session :

```ts [app/types/session.d.ts]
declare module '#auth-utils' {
  interface UserSession {
    user: {
      id: number
      email: string
    }
    secure?: {
      rails_token: string           // ← jamais envoyé au browser
      rails_refresh_token: string
    }
  }
}

export {}
```

Le champ `user` est accessible côté client via `useUserSession().user`.
Le champ `secure` reste côté serveur uniquement — le browser ne le voit jamais.

---

##### 6. Créer `server/utils/rails-client.ts`

Ce fichier est l'utilitaire partagé par toutes les server routes qui
appellent Rails. Il récupère le token depuis la session et gère
automatiquement son renouvellement sur une réponse 401 :

```bash
mkdir -p server/utils
```

```ts [server/utils/rails-client.ts]
import type { H3Event } from 'h3'

export const createRailsClient = async (event: H3Event) => {
  const config = useRuntimeConfig(event)
  const baseURL = config.railsApiUrl

  const session = await getUserSession(event)
  let currentToken = session.secure?.rails_token
  const currentRefreshToken = session.secure?.rails_refresh_token

  const refreshAccessToken = async (): Promise<boolean> => {
    if (!currentRefreshToken) return false
    try {
      const data = await $fetch<{ token: string; refresh_token: string }>(
        `${baseURL}/users/tokens/refresh`,
        { method: 'POST', headers: { Authorization: `Bearer ${currentRefreshToken}` } }
      )
      currentToken = data.token
      await setUserSession(event, {
        user: session.user,
        secure: { rails_token: data.token, rails_refresh_token: data.refresh_token },
      })
      return true
    } catch {
      await clearUserSession(event)
      return false
    }
  }

  const fetchRails = async <T>(path: string, options: Record<string, any> = {}): Promise<T> => {
    let attempts = 0
    while (attempts < 2) {
      try {
        return await $fetch<T>(`${baseURL}${path}`, {
          ...options,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
            ...(options.headers || {}),
          },
        })
      } catch (error: any) {
        const status = error?.response?.status ?? 0
        if (status === 401 && attempts === 0) {
          const refreshed = await refreshAccessToken()
          if (!refreshed) throw createError({ statusCode: 401, message: 'Session expirée' })
          attempts++
          continue
        }
        throw createError({ statusCode: status || 500, data: error?.response?._data })
      }
    }
    throw createError({ statusCode: 500 })
  }

  return { fetchRails }
}
```

Le mécanisme de retry fonctionne ainsi : si Rails répond 401, on tente de
renouveler le token via le `refresh_token`. Si le renouvellement échoue,
on efface la session et on renvoie 401 au client.

---

##### 7. Créer les server routes d'authentification

```bash
mkdir -p server/api/auth
```

**`server/api/auth/login.post.ts`** — appelle Rails, stocke le token dans
la session scellée et renvoie uniquement les infos utilisateur au browser :

```ts [server/api/auth/login.post.ts]
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { email, password } = await readBody(event)

  const data = await $fetch<{
    token: string
    refresh_token: string
    resource_owner: { id: number; email: string }
  }>(`${config.railsApiUrl}/users/tokens/sign_in`, {
    method: 'POST',
    body: { email, password },
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  }).catch((error) => {
    throw createError({
      statusCode: error?.response?.status ?? 401,
      message: 'Identifiants invalides',
    })
  })

  await setUserSession(event, {
    user: { id: data.resource_owner.id, email: data.resource_owner.email },
    secure: { rails_token: data.token, rails_refresh_token: data.refresh_token },
  })

  return { user: { id: data.resource_owner.id, email: data.resource_owner.email } }
})
```

**`server/api/auth/register.post.ts`** — même logique avec `sign_up` et
le champ `password_confirmation` en plus :

```ts [server/api/auth/register.post.ts]
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { email, password, password_confirmation } = await readBody(event)

  const data = await $fetch<{
    token: string
    refresh_token: string
    resource_owner: { id: number; email: string }
  }>(`${config.railsApiUrl}/users/tokens/sign_up`, {
    method: 'POST',
    body: { email, password, password_confirmation },
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  }).catch((error) => {
    throw createError({
      statusCode: error?.response?.status ?? 422,
      data: error?.response?._data,
    })
  })

  await setUserSession(event, {
    user: { id: data.resource_owner.id, email: data.resource_owner.email },
    secure: { rails_token: data.token, rails_refresh_token: data.refresh_token },
  })

  return { user: { id: data.resource_owner.id, email: data.resource_owner.email } }
})
```

**`server/api/auth/logout.delete.ts`** — révoque le token côté Rails
(best effort) puis efface la session Nuxt :

```ts [server/api/auth/logout.delete.ts]
export default defineEventHandler(async (event) => {
  try {
    const { fetchRails } = await createRailsClient(event)
    await fetchRails('/users/tokens/revoke', { method: 'DELETE' })
  } catch {
    // La session peut déjà être expirée — on continue quand même
  }

  await clearUserSession(event)
  return { success: true }
})
```

---

##### 8. Créer `app/composables/useAuthApi.ts`

Côté client, le composable est simple : il appelle les server routes Nuxt,
sans aucune gestion de token. Tout ça est délégué au serveur :

```bash
mkdir -p app/composables
```

```ts [app/composables/useAuthApi.ts]
import type { ILoginInput, IRegisterInput } from '~/types/auth'

export const useAuthApi = () => {
  const { clear } = useUserSession()

  const signIn = async (credentials: ILoginInput) => {
    try {
      const data = await $fetch('/api/auth/login', { method: 'POST', body: credentials })
      return { data, statusCode: 200 }
    } catch (error: any) {
      return { data: null, statusCode: error?.statusCode ?? 0 }
    }
  }

  const signUp = async (credentials: IRegisterInput) => {
    try {
      const data = await $fetch('/api/auth/register', { method: 'POST', body: credentials })
      return { data, statusCode: 200 }
    } catch (error: any) {
      return { data: null, statusCode: error?.statusCode ?? 0 }
    }
  }

  const signOut = async (): Promise<void> => {
    await $fetch('/api/auth/logout', { method: 'DELETE' }).catch(() => {})
    await clear()
    await navigateTo('/login')
  }

  return { signIn, signUp, signOut }
}
```

---

##### 9. Créer `app/middleware/auth.ts`

Le middleware protège les routes. Il s'exécute avant chaque navigation
vers une page qui le déclare :

```bash
mkdir -p app/middleware
```

```ts [app/middleware/auth.ts]
export default defineNuxtRouteMiddleware(() => {
  const { loggedIn } = useUserSession()

  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
```

`loggedIn` est un computed de `useUserSession()`. Il est `true` si le cookie
de session existe et est valide. Pour protéger une page, il suffira d'ajouter :

```ts
definePageMeta({ middleware: 'auth' })
```

---

##### 10. Créer `app/stores/application.ts`

L'état d'authentification est désormais entièrement géré par `useUserSession()`.
Ce store ne contient que l'état applicatif global — les notifications ici :

```bash
mkdir -p app/stores
```

```ts [app/stores/application.ts]
import { defineStore, acceptHMRUpdate } from 'pinia'

export const useApplicationStore = defineStore('application', () => {
  const notification = ref<{
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
  } | null>(null)

  const setNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    notification.value = { type, message }
    setTimeout(() => { notification.value = null }, 4000)
  }

  const clearNotification = () => { notification.value = null }

  return {
    notification: readonly(notification),
    setNotification,
    clearNotification,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useApplicationStore, import.meta.hot))
}
```

---

##### 11. Créer `app/pages/login.vue`

```bash
mkdir -p app/pages
```

```vue [app/pages/login.vue]
<template>
  <v-container class="py-12">
    <v-row justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card flat border>
          <v-card-title class="pa-6 pb-2 text-h5">
            {{ $t('auth.log_in') }}
          </v-card-title>

          <v-card-text class="pa-6 pt-4">
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              class="mb-4"
              :text="error"
            />

            <v-form v-model="formValid" @submit.prevent="onSubmit">
              <v-text-field
                v-model="email"
                :label="$t('auth.email')"
                type="email"
                :rules="emailRules"
                variant="outlined"
                class="mb-2"
              />
              <v-text-field
                v-model="password"
                :label="$t('auth.password')"
                type="password"
                :rules="requiredRules"
                variant="outlined"
                class="mb-4"
              />
              <v-btn
                type="submit"
                color="primary"
                block
                size="large"
                :loading="loading"
                :disabled="!formValid"
              >
                {{ $t('auth.submit_login') }}
              </v-btn>
            </v-form>
          </v-card-text>

          <v-card-actions class="pa-6 pt-0 justify-center">
            <span class="text-body-2 text-medium-emphasis">
              {{ $t('auth.no_account') }}
            </span>
            <v-btn variant="text" color="primary" to="/register" size="small">
              {{ $t('auth.register') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { signIn } = useAuthApi()
const router = useRouter()
const { t } = useI18n()

const email    = ref('')
const password = ref('')
const formValid = ref(false)
const loading   = ref(false)
const error     = ref<string | null>(null)

const emailRules = [
  (v: string) => !!v || t('form.required'),
  (v: string) => /.+@.+\..+/.test(v) || t('form.email_invalid'),
]
const requiredRules = [(v: string) => !!v || t('form.required')]

const onSubmit = async () => {
  if (!formValid.value) return
  loading.value = true
  error.value   = null

  const { statusCode } = await signIn({ email: email.value, password: password.value })
  loading.value = false

  if (statusCode === 200) {
    router.push('/todo')
  } else {
    error.value = t('auth.failed')
  }
}
</script>
```

`definePageMeta({ layout: false })` désactive le layout principal pour
cette page — pas de barre de navigation quand l'utilisateur n'est pas connecté.

---

##### 12. Créer `app/pages/register.vue`

```vue [app/pages/register.vue]
<template>
  <v-container class="py-12">
    <v-row justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card flat border>
          <v-card-title class="pa-6 pb-2 text-h5">
            {{ $t('auth.register') }}
          </v-card-title>

          <v-card-text class="pa-6 pt-4">
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              class="mb-4"
              :text="error"
            />

            <v-form v-model="formValid" @submit.prevent="onSubmit">
              <v-text-field
                v-model="email"
                :label="$t('auth.email')"
                type="email"
                :rules="emailRules"
                variant="outlined"
                class="mb-2"
              />
              <v-text-field
                v-model="password"
                :label="$t('auth.password')"
                type="password"
                :rules="passwordRules"
                variant="outlined"
                class="mb-2"
              />
              <v-text-field
                v-model="passwordConfirmation"
                :label="$t('auth.password_confirmation')"
                type="password"
                :rules="confirmationRules"
                variant="outlined"
                class="mb-4"
              />
              <v-btn
                type="submit"
                color="primary"
                block
                size="large"
                :loading="loading"
                :disabled="!formValid"
              >
                {{ $t('auth.submit_register') }}
              </v-btn>
            </v-form>
          </v-card-text>

          <v-card-actions class="pa-6 pt-0 justify-center">
            <span class="text-body-2 text-medium-emphasis">
              {{ $t('auth.already_account') }}
            </span>
            <v-btn variant="text" color="primary" to="/login" size="small">
              {{ $t('auth.log_in') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { signUp } = useAuthApi()
const router = useRouter()
const { t } = useI18n()

const email                 = ref('')
const password              = ref('')
const passwordConfirmation  = ref('')
const formValid             = ref(false)
const loading               = ref(false)
const error                 = ref<string | null>(null)

const emailRules = [
  (v: string) => !!v || t('form.required'),
  (v: string) => /.+@.+\..+/.test(v) || t('form.email_invalid'),
]
const passwordRules = [
  (v: string) => !!v || t('form.required'),
  (v: string) => v.length >= 6 || t('form.password_min'),
]
const confirmationRules = computed(() => [
  (v: string) => !!v || t('form.required'),
  (v: string) => v === password.value || t('form.password_mismatch'),
])

const onSubmit = async () => {
  if (!formValid.value) return
  loading.value = true
  error.value   = null

  const { statusCode } = await signUp({
    email: email.value,
    password: password.value,
    password_confirmation: passwordConfirmation.value,
  })
  loading.value = false

  if (statusCode === 200) {
    router.push('/todo')
  } else {
    error.value = t('auth.register_failed')
  }
}
</script>
```

Les `confirmationRules` utilisent `computed()` pour accéder à la valeur
courante de `password` au moment de la validation — sans ça, la règle
comparerait avec la valeur initiale (chaîne vide) et serait toujours fausse.

---

#### 🧪 Tests

```ts [tests/server/auth.test.ts]
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mockGetUserSession = vi.fn()
const mockSetUserSession = vi.fn()
const mockClearUserSession = vi.fn()

mockNuxtImport('getUserSession', () => mockGetUserSession)
mockNuxtImport('setUserSession', () => mockSetUserSession)
mockNuxtImport('clearUserSession', () => mockClearUserSession)

describe('createRailsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUserSession.mockResolvedValue({
      user: { id: 1, email: 'test@example.com' },
      secure: { rails_token: 'valid_token', rails_refresh_token: 'valid_refresh' },
    })
  })

  it('tente un refresh automatique sur 401', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce({ response: { status: 401 } })
      .mockResolvedValueOnce({ token: 'new_token', refresh_token: 'new_refresh' })
      .mockResolvedValue({ data: 'ok' })

    vi.stubGlobal('$fetch', fetchMock)

    expect(mockSetUserSession).toBeDefined()
  })

  it('clearUserSession si le refresh échoue', async () => {
    mockGetUserSession.mockResolvedValue({
      user: { id: 1, email: 'test@example.com' },
      secure: { rails_token: 'expired', rails_refresh_token: 'expired_refresh' },
    })

    expect(mockClearUserSession).toBeDefined()
  })
})
```

---

#### 🔖 Commit

```bash
git add .
git commit -m "feat: authentification avec nuxt-auth-utils"
git push origin main
```

---

#### ✅ Résumé du commit

::tool-table
| Fichier | Action | Rôle |
|---------|--------|------|
| `package.json` | ✏️ Modifié | Ajout `nuxt-auth-utils`, suppression `crypto-js` |
| `nuxt.config.ts` | ✏️ Modifié | Module ajouté, `railsApiUrl` privé |
| `i18n.config.ts` | ✏️ Modifié | Clés auth et form ajoutées |
| `.env.example` | ✏️ Modifié | `NUXT_SESSION_PASSWORD`, `RAILS_API_URL` |
| `app/types/auth.ts` | ➕ Nouveau | `ILoginInput`, `IRegisterInput` |
| `app/types/user.ts` | ➕ Nouveau | `IUserInfo` |
| `app/types/session.d.ts` | ➕ Nouveau | Augmentation `UserSession` |
| `server/utils/rails-client.ts` | ➕ Nouveau | Client HTTP Rails + retry sur 401 |
| `server/api/auth/login.post.ts` | ➕ Nouveau | Login → session scellée |
| `server/api/auth/register.post.ts` | ➕ Nouveau | Inscription → session scellée |
| `server/api/auth/logout.delete.ts` | ➕ Nouveau | Révocation + clear session |
| `app/composables/useAuthApi.ts` | ➕ Nouveau | `signIn`, `signUp`, `signOut` |
| `app/middleware/auth.ts` | ➕ Nouveau | Protection des routes |
| `app/stores/application.ts` | ➕ Nouveau | Store global (notifications) |
| `app/pages/login.vue` | ➕ Nouveau | Page de connexion |
| `app/pages/register.vue` | ➕ Nouveau | Page d'inscription |
::

---

Dans le prochain article, nous construisons la todo list en mode local :
composants, store Pinia et persistance localStorage.

[Article 3 — Todo list locale →](/blog/article/3-to-do-list-taches)

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::