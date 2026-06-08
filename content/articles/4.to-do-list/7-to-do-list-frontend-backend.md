---
title: 'Todo List — Connexion frontend-backend'
description: 'Server routes Nuxt, composable useTodoApi et flux complet'
icon: 'i-mdi:checkbox-marked-circle-plus-outline'
color: 'secondary'
article_id: '7-to-do-list-frontend-backend'
draft: false
publishedAt: '2026-07-01'
---

#### 🔌 Connexion frontend-backend

Dans cet article, nous connectons les deux dépôts. Le frontend Nuxt appelle
son propre serveur qui proxy les requêtes vers Rails — le token JWT ne quitte
jamais le serveur grâce à `nuxt-auth-utils`.

> 💡 Commits correspondants :
> - Backend : [`feat: seeds scopes par défaut`](https://forgejo.chartman-fr.ovh/tititoof/todo-backend){:target="_blank"}
> - Frontend : [`feat: connexion API Rails`](https://forgejo.chartman-fr.ovh/tititoof/todo-frontend){:target="_blank"}

---

#### 🏗️ Flux complet

<mermaid>
graph LR
  Browser["🌍 Browser"]
  subgraph NS["⚡ Nuxt Server"]
    Route["server/api/todo/\nitems.post.ts"]
    RC["createRailsClient\ntoken depuis session"]
    Route --> RC
  end
  Rails["💎 Rails API"]
  PG["🐘 PostgreSQL"]
  Browser -->|"POST /api/todo/items + cookie"| NS
  RC -->|"POST /api/v1/todo/items Bearer token"| Rails
  Rails --> PG
  Rails -->|"JSON:API"| RC
  RC -->|"JSON:API"| Browser
  classDef clusterStyle fill:#41dcce,stroke:#333,stroke-width:1.5px;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class NS clusterStyle;
  class Browser,Route,RC,Rails,PG containerStyle;
</mermaid>

---

#### 🌱 1. Backend — Seeds (dépôt `todo-backend`)

Avant de connecter le frontend, alimentons la base avec les scopes par défaut.
Les `nicknames` doivent correspondre exactement au type `IScope` du frontend :

```ruby [db/seeds.rb]
scopes = [
  { name: "Personnel", nickname: "personnal" },
  { name: "Travail",   nickname: "work" },
  { name: "Famille",   nickname: "family" },
  { name: "Autre",     nickname: "other" },
]

scopes.each do |attrs|
  Todo::Scope.find_or_create_by!(nickname: attrs[:nickname]) do |scope|
    scope.name = attrs[:name]
  end
end

puts "Seeds OK : #{Todo::Scope.count} scopes"
```

```bash
docker compose exec backend bin/rails db:seed
```

Commitez et passez au frontend :

```bash
git add db/seeds.rb
git commit -m "feat: seeds scopes par défaut"
git push origin main
```

---

#### 🎨 Frontend — dépôt `todo-frontend`

---

##### 2. Mettre à jour `app/types/todo.ts`

Ajoutez `ITodoScope` et le champ `scopeApiId` dans `ITodoItem` — l'ID
numérique Rails est nécessaire pour les appels PUT et DELETE :

```ts [app/types/todo.ts]
export type IScope = 'personnal' | 'work' | 'family' | 'other'

export const SCOPE_VALUES: IScope[] = ['personnal', 'work', 'family', 'other']

export interface ITodoItem {
  id: string
  name: string
  done: boolean
  scope: IScope
  scopeApiId: number   // ID côté Rails — requis pour PUT/DELETE
  createdAt: string
}

export interface ITodoScope {
  id: number
  name: string
  nickname: IScope
}
```

---

##### 3. Mettre à jour `app/stores/todo.ts`

Ajoutez la gestion des scopes et mettez à jour `addItem` pour accepter
`scopeApiId` :

```ts [app/stores/todo.ts]
import { defineStore, acceptHMRUpdate } from 'pinia'
import type { ITodoItem, ITodoScope, IScope } from '~/types/todo'

export const useTodoStore = defineStore('todo', () => {
  const items  = ref<ITodoItem[]>([])
  const scopes = ref<ITodoScope[]>([])

  const addItem = (name: string, scope: IScope, scopeApiId: number): ITodoItem => {
    const item: ITodoItem = {
      id: crypto.randomUUID(),
      name,
      done: false,
      scope,
      scopeApiId,
      createdAt: new Date().toISOString(),
    }
    items.value.push(item)
    return item
  }

  const toggleItem = (id: string): void => {
    const item = items.value.find(i => i.id === id)
    if (item) item.done = !item.done
  }

  const removeItem = (id: string): void => {
    items.value = items.value.filter(i => i.id !== id)
  }

  const setItems = (newItems: ITodoItem[]): void => { items.value = newItems }
  const setScopes = (newScopes: ITodoScope[]): void => { scopes.value = newScopes }

  const getFilteredItems = (scope: IScope | 'all'): ITodoItem[] => {
    if (scope === 'all') return items.value
    return items.value.filter(i => i.scope === scope)
  }

  return {
    items:  readonly(items),
    scopes: readonly(scopes),
    addItem,
    toggleItem,
    removeItem,
    setItems,
    setScopes,
    getFilteredItems,
  }
}, {
  persist: true,
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTodoStore, import.meta.hot))
}
```

---

##### 4. Créer les server routes pour les items

```bash
mkdir -p server/api/todo/items
```

```ts [server/api/todo/items.get.ts]
export default defineEventHandler(async (event) => {
  const { fetchRails } = await createRailsClient(event)
  return fetchRails('/api/v1/todo/items')
})
```

```ts [server/api/todo/items.post.ts]
export default defineEventHandler(async (event) => {
  const { fetchRails } = await createRailsClient(event)
  const body = await readBody(event)
  return fetchRails('/api/v1/todo/items', { method: 'POST', body })
})
```

```ts [server/api/todo/items/[id].put.ts]
export default defineEventHandler(async (event) => {
  const { fetchRails } = await createRailsClient(event)
  const id   = getRouterParam(event, 'id')
  const body = await readBody(event)
  return fetchRails(`/api/v1/todo/items/${id}`, { method: 'PUT', body })
})
```

```ts [server/api/todo/items/[id].delete.ts]
export default defineEventHandler(async (event) => {
  const { fetchRails } = await createRailsClient(event)
  const id = getRouterParam(event, 'id')
  return fetchRails(`/api/v1/todo/items/${id}`, { method: 'DELETE' })
})
```

---

##### 5. Créer les server routes pour les scopes

```bash
mkdir -p server/api/todo/scopes
```

```ts [server/api/todo/scopes.get.ts]
export default defineEventHandler(async (event) => {
  const { fetchRails } = await createRailsClient(event)
  return fetchRails('/api/v1/todo/scopes')
})
```

```ts [server/api/todo/scopes.post.ts]
export default defineEventHandler(async (event) => {
  const { fetchRails } = await createRailsClient(event)
  const body = await readBody(event)
  return fetchRails('/api/v1/todo/scopes', { method: 'POST', body })
})
```

```ts [server/api/todo/scopes/[id].put.ts]
export default defineEventHandler(async (event) => {
  const { fetchRails } = await createRailsClient(event)
  const id   = getRouterParam(event, 'id')
  const body = await readBody(event)
  return fetchRails(`/api/v1/todo/scopes/${id}`, { method: 'PUT', body })
})
```

```ts [server/api/todo/scopes/[id].delete.ts]
export default defineEventHandler(async (event) => {
  const { fetchRails } = await createRailsClient(event)
  const id = getRouterParam(event, 'id')
  return fetchRails(`/api/v1/todo/scopes/${id}`, { method: 'DELETE' })
})
```

Toutes ces routes utilisent `createRailsClient` défini en article 2 —
le token est récupéré depuis la session scellée, le browser ne le voit jamais.

---

##### 6. Créer `app/composables/useTodoApi.ts`

```ts [app/composables/useTodoApi.ts]
import type { ITodoItem, ITodoScope, IScope } from '~/types/todo'

// Types JSON:API retournés par Rails
interface IJsonApiItem {
  id: string
  attributes: { name: string; done: boolean; scope_id: number; created_at: string }
}

interface IJsonApiScope {
  id: string
  attributes: { name: string; nickname: string; created_at: string }
}

export const useTodoApi = () => {
  const todoStore = useTodoStore()

  // Convertit un item JSON:API Rails en ITodoItem Nuxt
  const mapItem = (apiItem: IJsonApiItem): ITodoItem => {
    const scopeApiId = apiItem.attributes.scope_id
    const scope      = todoStore.scopes.find(s => s.id === scopeApiId)
    return {
      id: apiItem.id,
      name: apiItem.attributes.name,
      done: apiItem.attributes.done,
      scope: (scope?.nickname ?? 'other') as IScope,
      scopeApiId,
      createdAt: apiItem.attributes.created_at,
    }
  }

  const fetchScopes = async (): Promise<boolean> => {
    try {
      const data = await $fetch<{ data: IJsonApiScope[] }>('/api/todo/scopes')
      todoStore.setScopes(data.data.map(s => ({
        id: parseInt(s.id),
        name: s.attributes.name,
        nickname: s.attributes.nickname as IScope,
      })))
      return true
    } catch { return false }
  }

  const fetchItems = async (): Promise<boolean> => {
    try {
      const data = await $fetch<{ data: IJsonApiItem[] }>('/api/todo/items')
      todoStore.setItems(data.data.map(mapItem))
      return true
    } catch { return false }
  }

  const createItem = async (name: string, scope: IScope): Promise<boolean> => {
    const apiScope = todoStore.scopes.find(s => s.nickname === scope)
    if (!apiScope) return false
    try {
      await $fetch('/api/todo/items', {
        method: 'POST',
        body: { item: { name, done: false, scope_id: apiScope.id } },
      })
      await fetchItems()
      return true
    } catch { return false }
  }

  const toggleItem = async (id: string): Promise<boolean> => {
    const item = todoStore.items.find(i => i.id === id)
    if (!item) return false
    try {
      await $fetch(`/api/todo/items/${id}`, {
        method: 'PUT',
        body: { item: { name: item.name, done: !item.done, scope_id: item.scopeApiId } },
      })
      await fetchItems()
      return true
    } catch { return false }
  }

  const removeItem = async (id: string): Promise<boolean> => {
    try {
      await $fetch(`/api/todo/items/${id}`, { method: 'DELETE' })
      todoStore.removeItem(id)
      return true
    } catch { return false }
  }

  return { fetchScopes, fetchItems, createItem, toggleItem, removeItem }
}
```

`fetchItems` est rappelé après `createItem` et `toggleItem` pour
resynchroniser le store avec l'état réel en base. Pas de gestion
d'état optimiste — on garde le code simple.

---

##### 7. Mettre à jour `app/components/partial/todo/new.vue`

Les scopes viennent maintenant du store (chargés depuis l'API) et
la création d'item passe par `useTodoApi` :

```vue [app/components/partial/todo/new.vue]
<template>
  <v-form v-model="formValid" @submit.prevent="onSubmit">
    <v-row align="center">
      <v-col cols="12" sm="8">
        <v-text-field
          v-model="name"
          :label="$t('tasks.form.name')"
          :rules="nameRules"
          variant="outlined"
          hide-details="auto"
          clearable
          :disabled="loading"
        />
      </v-col>
      <v-col cols="12" sm="4">
        <v-btn
          type="submit"
          color="primary"
          block
          size="large"
          :disabled="!formValid"
          :loading="loading"
          prepend-icon="mdi-plus"
        >
          {{ $t('tasks.form.add') }}
        </v-btn>
      </v-col>
    </v-row>

    <v-row class="mt-2">
      <v-col>
        <v-radio-group v-model="selectedScope" inline hide-details>
          <v-radio
            v-for="scope in todoStore.scopes"
            :key="scope.id"
            :label="$t('tasks.scope.' + scope.nickname)"
            :value="scope.nickname"
            color="primary"
          />
        </v-radio-group>
      </v-col>
    </v-row>
  </v-form>
</template>

<script setup lang="ts">
import type { IScope } from '~/types/todo'

const todoStore      = useTodoStore()
const { createItem } = useTodoApi()
const { t }          = useI18n()

const name          = ref('')
const selectedScope = ref<IScope>('personnal')
const formValid     = ref(false)
const loading       = ref(false)

const nameRules = [(v: string) => !!v || t('form.required')]

const onSubmit = async () => {
  if (!formValid.value) return
  loading.value = true
  await createItem(name.value, selectedScope.value)
  loading.value = false
  name.value    = ''
}
</script>
```

Les radio buttons itèrent sur `todoStore.scopes` (chargés depuis l'API)
au lieu de `SCOPE_VALUES` — les scopes sont désormais une donnée dynamique,
pas une constante locale.

---

##### 8. Mettre à jour `app/components/partial/todo/list.vue`

Toggle et suppression passent par l'API, avec un état de chargement
par item pour ne pas bloquer l'interface :

```vue [app/components/partial/todo/list.vue]
<template>
  <div>
    <v-radio-group v-model="filterScope" inline hide-details class="mb-4">
      <v-radio
        v-for="scope in todoStore.scopes"
        :key="scope.id"
        :label="$t('tasks.scope.' + scope.nickname)"
        :value="scope.nickname"
        color="primary"
      />
      <v-radio :label="$t('tasks.list.all')" value="all" color="primary" />
    </v-radio-group>

    <v-alert
      v-if="filteredItems.length === 0"
      type="info"
      variant="tonal"
      :text="$t('tasks.list.empty')"
    />

    <v-list v-else lines="one">
      <v-list-item
        v-for="item in filteredItems"
        :key="item.id"
        rounded="lg"
        class="mb-2"
        border
      >
        <template #prepend>
          <v-checkbox-btn
            :model-value="item.done"
            color="primary"
            :loading="loadingIds.has(item.id)"
            @click="onToggle(item.id)"
          />
        </template>

        <v-list-item-title
          :class="{ 'text-decoration-line-through text-medium-emphasis': item.done }"
        >
          {{ item.name }}
        </v-list-item-title>

        <v-list-item-subtitle>
          <v-chip size="x-small" color="primary" variant="tonal">
            {{ $t('tasks.scope.' + item.scope) }}
          </v-chip>
        </v-list-item-subtitle>

        <template #append>
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            color="error"
            :loading="loadingIds.has(item.id)"
            @click="onRemove(item.id)"
          />
        </template>
      </v-list-item>
    </v-list>
  </div>
</template>

<script setup lang="ts">
import type { IScope } from '~/types/todo'

const todoStore              = useTodoStore()
const { toggleItem, removeItem } = useTodoApi()

const filterScope = ref<IScope | 'all'>('all')
const loadingIds  = ref(new Set<string>())

const filteredItems = computed(() => todoStore.getFilteredItems(filterScope.value))

const onToggle = async (id: string) => {
  loadingIds.value.add(id)
  await toggleItem(id)
  loadingIds.value.delete(id)
}

const onRemove = async (id: string) => {
  loadingIds.value.add(id)
  await removeItem(id)
  loadingIds.value.delete(id)
}
</script>
```

`loadingIds` est un `Set` réactif — quand on clique sur le bouton d'un item,
seul **cet item** affiche un indicateur de chargement, pas toute la liste.

---

##### 9. Mettre à jour `app/pages/todo.vue`

Ajoutez le chargement des scopes et items au montage de la page :

```vue [app/pages/todo.vue]
<template>
  <v-container class="py-8">
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-6">
          <h1 class="text-h4 font-weight-bold">
            <v-icon icon="mdi-format-list-checks" color="primary" class="mr-2" />
            {{ $t('global.name') }}
          </h1>
          <span v-if="user" class="text-body-2 text-medium-emphasis">
            {{ user.email }}
          </span>
        </div>

        <v-progress-linear v-if="initialLoading" indeterminate color="primary" class="mb-4" />

        <template v-else>
          <v-card flat border class="mb-6">
            <v-card-title class="pa-4 pb-2">
              {{ $t('tasks.form.title') }}
            </v-card-title>
            <v-card-text>
              <partial-todo-new />
            </v-card-text>
          </v-card>

          <v-card flat border>
            <v-card-title class="pa-4 pb-2 d-flex align-center">
              {{ $t('tasks.list.title') }}
              <v-chip size="small" color="primary" variant="tonal" class="ml-2">
                {{ todoStore.items.length }}
              </v-chip>
            </v-card-title>
            <v-card-text>
              <partial-todo-list />
            </v-card-text>
          </v-card>
        </template>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { user }                        = useUserSession()
const todoStore                       = useTodoStore()
const { fetchScopes, fetchItems }     = useTodoApi()
const initialLoading                  = ref(true)

onMounted(async () => {
  await fetchScopes()   // scopes d'abord — nécessaires pour mapper les items
  await fetchItems()    // puis les items
  initialLoading.value = false
})
</script>
```

`v-progress-linear` s'affiche pendant le chargement initial pour éviter
un flash de contenu vide. Une fois les données chargées, la page s'affiche.

---

##### 10. Mettre à jour `app/app.vue`

Ajoutez le bouton de déconnexion dans la barre de navigation :

```vue [app/app.vue]
<template>
  <v-app :theme="theme">
    <v-app-bar flat border="b">
      <v-app-bar-title>
        <nuxt-link to="/" class="text-decoration-none text-primary">
          {{ $t('global.name') }}
        </nuxt-link>
      </v-app-bar-title>

      <template #append>
        <v-btn
          :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          variant="text"
          @click="toggleTheme"
        />
        <v-btn
          v-if="loggedIn"
          icon="mdi-logout"
          variant="text"
          :title="$t('global.logout')"
          @click="signOut"
        />
      </template>
    </v-app-bar>

    <v-main>
      <nuxt-page />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
const isDark = useLocalStorage<boolean>('theme-dark', true)
const theme  = computed(() => isDark.value ? 'dark' : 'light')

const toggleTheme = () => { isDark.value = !isDark.value }

const { loggedIn } = useUserSession()
const { signOut }  = useAuthApi()
</script>
```

---

#### 🧪 Tests

```bash
mkdir -p tests/composables
```

```ts [tests/composables/useTodoApi.test.ts]
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

describe('useTodoApi', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchScopes met à jour le store', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      data: [
        { id: '1', attributes: { name: 'Personnel', nickname: 'personnal', created_at: '' } },
      ],
    }))

    const store = useTodoStore()
    const { fetchScopes } = useTodoApi()
    await fetchScopes()

    expect(store.scopes).toHaveLength(1)
    expect(store.scopes[0].nickname).toBe('personnal')
  })

  it('fetchItems mappe scope_id vers IScope', async () => {
    const store = useTodoStore()
    store.setScopes([{ id: 1, name: 'Personnel', nickname: 'personnal' }])

    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      data: [{
        id: '10',
        attributes: { name: 'Ma tâche', done: false, scope_id: 1, created_at: '2025-01-01' },
      }],
    }))

    const { fetchItems } = useTodoApi()
    await fetchItems()

    expect(store.items[0].scope).toBe('personnal')
    expect(store.items[0].scopeApiId).toBe(1)
  })

  it('removeItem supprime du store immédiatement', async () => {
    const store = useTodoStore()
    store.setScopes([{ id: 1, name: 'Personnel', nickname: 'personnal' }])
    store.setItems([{
      id: '10', name: 'À supprimer', done: false,
      scope: 'personnal', scopeApiId: 1, createdAt: ''
    }])

    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({}))

    const { removeItem } = useTodoApi()
    await removeItem('10')

    expect(store.items).toHaveLength(0)
  })
})
```

```bash
# Frontend
docker compose exec frontend pnpm test

# Backend
docker compose exec backend bundle exec rspec
```

---

#### 🔖 Commits

```bash
# Backend
cd todo-backend
git add db/seeds.rb
git commit -m "feat: seeds scopes par défaut"
git push origin main

# Frontend
cd todo-frontend
git add .
git commit -m "feat: connexion API Rails — server routes, useTodoApi, stores"
git push origin main
```

---

#### ✅ Résumé

::tool-table
| Dépôt | Fichier | Action | Rôle |
|-------|---------|--------|------|
| Backend | `db/seeds.rb` | ➕ Nouveau | 4 scopes par défaut |
| Frontend | `app/types/todo.ts` | ✏️ Modifié | `ITodoScope`, `scopeApiId` |
| Frontend | `app/stores/todo.ts` | ✏️ Modifié | `scopes` + `setScopes` |
| Frontend | `server/api/todo/items.*` | ➕ 4 routes | Proxy items → Rails |
| Frontend | `server/api/todo/scopes.*` | ➕ 4 routes | Proxy scopes → Rails |
| Frontend | `app/composables/useTodoApi.ts` | ➕ Nouveau | CRUD + mapping JSON:API |
| Frontend | `app/components/partial/todo/new.vue` | ✏️ Modifié | Scopes API + createItem |
| Frontend | `app/components/partial/todo/list.vue` | ✏️ Modifié | Toggle/delete API + loading |
| Frontend | `app/pages/todo.vue` | ✏️ Modifié | Chargement au mount |
| Frontend | `app/app.vue` | ✏️ Modifié | Bouton logout |
::

---

#### 🎉 Conclusion de la série

La Todo List est complète et fonctionnelle :

- **Frontend Nuxt 4** avec `nuxt-auth-utils` — tokens JWT jamais exposés au browser
- **Backend Rails 8 API** avec Devise — endpoints versionnés, services isolés, serializers JSON:API
- **Pattern BFF** — Nuxt server proxy toutes les requêtes vers Rails
- **Tests** — RSpec côté Rails, Vitest côté Nuxt
- **Deux dépôts** sur Forgejo avec miroir automatique vers GitHub via Jenkins

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::