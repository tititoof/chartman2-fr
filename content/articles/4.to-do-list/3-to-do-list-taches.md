---
title: 'Todo List — Frontend : tâches & scopes'
description: 'Composants, store Pinia et persistance locale — sans backend'
icon: 'i-mdi:checkbox-marked-circle-plus-outline'
color: 'secondary'
article_id: '3-to-do-list-taches'
---

#### 📝 Frontend — Tâches & Scopes

Dans cet article, nous construisons la todo list en **mode local** : les tâches
sont créées, filtrées et persistées dans le localStorage via Pinia —
sans aucune connexion au backend.

Cette approche permet de valider l'UI et la logique métier indépendamment de l'API.
La connexion au backend viendra en article 7.

> 💡 Commit correspondant :
> [`feat: todo list locale — store, composants, page`](https://forgejo.chartman-fr.ovh/tititoof/todo-frontend){:target="_blank"}

---

#### 🏗️ Architecture

<mermaid>
graph LR
  subgraph Page["📄 todo.vue"]
    New["partial-todo-new\nFormulaire"]
    List["partial-todo-list\nListe + filtres"]
  end
  subgraph Store["🗃️ useTodoStore (Pinia)"]
    Items["items[]"]
    Actions["addItem / toggleItem\nremoveItem / setItems"]
    Filter["getFilteredItems()"]
  end
  subgraph Storage["💾 localStorage"]
    Persist["pinia-plugin-persistedstate"]
  end
  New -->|"addItem"| Actions
  List -->|"toggleItem / removeItem"| Actions
  List -->|"getFilteredItems"| Filter
  Filter --> Items
  Actions --> Items
  Items <-->|"persist"| Persist
  classDef clusterStyle fill:#41dcce,stroke:#333,stroke-width:1.5px;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  classDef dbStyle fill:#ddf,stroke:#00d,stroke-width:2px;
  class Page,Store clusterStyle;
  class New,List,Actions,Filter containerStyle;
  class Persist,Storage dbStyle;
</mermaid>

---

#### 🏗️ Construction

---

##### 1. Mettre à jour `i18n.config.ts`

Les composants todo utilisent des clés de traduction qui n'existent pas encore.
Ajoutez la section `tasks` dans `i18n.config.ts` :

```ts [i18n.config.ts]
export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'fr',
  messages: {
    fr: {
      global: { /* inchangé */ },
      auth: { /* inchangé */ },
      form: { /* inchangé */ },
      tasks: {
        form: {
          title: 'Nouvelle tâche',
          name: 'Nom de la tâche',
          add: 'Ajouter',
        },
        list: {
          title: 'Mes tâches',
          all: 'Toutes',
          empty: 'Aucune tâche pour le moment.',
        },
        scope: {
          personnal: 'Personnel',
          work: 'Travail',
          family: 'Famille',
          other: 'Autre',
        },
      },
    },
  },
}))
```

---

##### 2. Créer `app/types/todo.ts`

Les types définissent le contrat de données entre le store, les composants
et (plus tard) l'API. Créez ce fichier dans `app/types/` :

```ts [app/types/todo.ts]
export type IScope = 'personnal' | 'work' | 'family' | 'other'

export const SCOPE_VALUES: IScope[] = ['personnal', 'work', 'family', 'other']

export interface ITodoItem {
  id: string        // crypto.randomUUID() — unique garanti
  name: string
  done: boolean
  scope: IScope
  createdAt: string // ISO 8601
}
```

`SCOPE_VALUES` est exporté comme tableau pour itérer facilement dans les
radio buttons des composants — une seule source de vérité pour les
valeurs de scope possibles.

En article 7, `ITodoItem` sera enrichi d'un champ `scopeApiId: number`
pour la connexion au backend Rails. Le store et les composants n'auront
pas à changer.

---

##### 3. Créer `app/stores/todo.ts`

```bash
mkdir -p app/stores
```

Le store centralise toutes les opérations sur les tâches. `persist: true`
active la persistance automatique dans le localStorage via
`pinia-plugin-persistedstate` :

```ts [app/stores/todo.ts]
import { defineStore, acceptHMRUpdate } from 'pinia'
import type { ITodoItem, IScope } from '~/types/todo'

export const useTodoStore = defineStore('todo', () => {
  const items = ref<ITodoItem[]>([])

  const addItem = (name: string, scope: IScope): ITodoItem => {
    const item: ITodoItem = {
      id: crypto.randomUUID(),
      name,
      done: false,
      scope,
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

  // Préparé pour l'article 7 — remplacera les données locales par celles de l'API
  const setItems = (newItems: ITodoItem[]): void => {
    items.value = newItems
  }

  const getFilteredItems = (scope: IScope | 'all'): ITodoItem[] => {
    if (scope === 'all') return items.value
    return items.value.filter(i => i.scope === scope)
  }

  return {
    items: readonly(items),
    addItem,
    toggleItem,
    removeItem,
    setItems,
    getFilteredItems,
  }
}, {
  persist: true,
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTodoStore, import.meta.hot))
}
```

`setItems` est intentionnellement ajouté maintenant même s'il ne sera utilisé
qu'en article 7. En l'exposant dès cette étape, l'interface du store ne changera
pas lors de la connexion à l'API — seule l'implémentation évoluera.

---

##### 4. Créer `app/components/partial/todo/new.vue`

```bash
mkdir -p app/components/partial/todo
```

Le formulaire d'ajout de tâche. Après soumission, le champ se vide et le
scope revient à la valeur par défaut :

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
        />
      </v-col>
      <v-col cols="12" sm="4">
        <v-btn
          type="submit"
          color="primary"
          block
          size="large"
          :disabled="!formValid"
          prepend-icon="mdi-plus"
        >
          {{ $t('tasks.form.add') }}
        </v-btn>
      </v-col>
    </v-row>

    <v-row class="mt-2">
      <v-col>
        <v-radio-group v-model="scope" inline hide-details>
          <v-radio
            v-for="s in SCOPE_VALUES"
            :key="s"
            :label="$t('tasks.scope.' + s)"
            :value="s"
            color="primary"
          />
        </v-radio-group>
      </v-col>
    </v-row>
  </v-form>
</template>

<script setup lang="ts">
import { SCOPE_VALUES } from '~/types/todo'
import type { IScope } from '~/types/todo'

const todoStore = useTodoStore()
const { t }     = useI18n()

const name      = ref('')
const scope     = ref<IScope>('personnal')
const formValid = ref(false)

const nameRules = [(v: string) => !!v || t('form.required')]

const onSubmit = () => {
  if (!formValid.value) return
  todoStore.addItem(name.value, scope.value)
  name.value  = ''
  scope.value = 'personnal'
}
</script>
```

La règle de validation utilise `form.required` — la même clé définie
en article 2, pour garder une cohérence entre tous les formulaires.

---

##### 5. Créer `app/components/partial/todo/list.vue`

La liste affiche les tâches filtrées par scope avec possibilité de les
cocher ou supprimer :

```vue [app/components/partial/todo/list.vue]
<template>
  <div>
    <v-radio-group v-model="filterScope" inline hide-details class="mb-4">
      <v-radio
        v-for="s in SCOPE_VALUES"
        :key="s"
        :label="$t('tasks.scope.' + s)"
        :value="s"
        color="primary"
      />
      <v-radio
        :label="$t('tasks.list.all')"
        value="all"
        color="primary"
      />
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
            @click="todoStore.toggleItem(item.id)"
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
            @click="todoStore.removeItem(item.id)"
          />
        </template>
      </v-list-item>
    </v-list>
  </div>
</template>

<script setup lang="ts">
import { SCOPE_VALUES } from '~/types/todo'
import type { IScope } from '~/types/todo'

const todoStore   = useTodoStore()
const filterScope = ref<IScope | 'all'>('all')

const filteredItems = computed(() => todoStore.getFilteredItems(filterScope.value))
</script>
```

`filteredItems` est un `computed` — il se recalcule automatiquement quand
`filterScope` ou `todoStore.items` change. Pas besoin de watcher manuel.

---

##### 6. Créer `app/pages/todo.vue`

La page principale, protégée par le middleware `auth`. Elle affiche
l'email de l'utilisateur connecté et regroupe les deux composants :

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
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { user } = useUserSession()
const todoStore = useTodoStore()
</script>
```

`definePageMeta({ middleware: 'auth' })` applique le middleware créé en
article 2 — toute tentative d'accès à `/todo` sans session valide redirige
vers `/login`.

Nuxt auto-importe les composants depuis `app/components/` : `partial-todo-new`
correspond à `app/components/partial/todo/new.vue`, sans import manuel.

---

#### 🧪 Tests

```bash
mkdir -p tests/stores
```

```ts [tests/stores/todo.test.ts]
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTodoStore } from '~/stores/todo'

describe('useTodoStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('addItem ajoute une tâche avec les bons attributs', () => {
    const store = useTodoStore()
    const item  = store.addItem('Ma tâche', 'personnal')

    expect(store.items).toHaveLength(1)
    expect(item.name).toBe('Ma tâche')
    expect(item.done).toBe(false)
    expect(item.scope).toBe('personnal')
    expect(item.id).toBeTruthy()
    expect(item.createdAt).toBeTruthy()
  })

  it('addItem génère des IDs uniques', () => {
    const store = useTodoStore()
    const item1 = store.addItem('Tâche 1', 'personnal')
    const item2 = store.addItem('Tâche 2', 'work')

    expect(item1.id).not.toBe(item2.id)
  })

  it('toggleItem bascule done de false à true', () => {
    const store = useTodoStore()
    const item  = store.addItem('Ma tâche', 'personnal')

    store.toggleItem(item.id)

    expect(store.items[0].done).toBe(true)
  })

  it('toggleItem bascule done de true à false', () => {
    const store = useTodoStore()
    const item  = store.addItem('Ma tâche', 'personnal')
    store.toggleItem(item.id)
    store.toggleItem(item.id)

    expect(store.items[0].done).toBe(false)
  })

  it('removeItem supprime la bonne tâche', () => {
    const store = useTodoStore()
    const item1 = store.addItem('Tâche 1', 'personnal')
    store.addItem('Tâche 2', 'work')

    store.removeItem(item1.id)

    expect(store.items).toHaveLength(1)
    expect(store.items[0].name).toBe('Tâche 2')
  })

  it('getFilteredItems retourne tout avec all', () => {
    const store = useTodoStore()
    store.addItem('Tâche 1', 'personnal')
    store.addItem('Tâche 2', 'work')
    store.addItem('Tâche 3', 'family')

    expect(store.getFilteredItems('all')).toHaveLength(3)
  })

  it('getFilteredItems filtre par scope', () => {
    const store = useTodoStore()
    store.addItem('Perso 1', 'personnal')
    store.addItem('Perso 2', 'personnal')
    store.addItem('Travail', 'work')

    const personalItems = store.getFilteredItems('personnal')

    expect(personalItems).toHaveLength(2)
    expect(personalItems.every(i => i.scope === 'personnal')).toBe(true)
  })

  it('setItems remplace toutes les tâches locales', () => {
    const store = useTodoStore()
    store.addItem('Tâche locale', 'personnal')

    store.setItems([{
      id: '1',
      name: 'Tâche API',
      done: false,
      scope: 'work',
      createdAt: new Date().toISOString(),
    }])

    expect(store.items).toHaveLength(1)
    expect(store.items[0].name).toBe('Tâche API')
  })
})
```

```bash
docker compose exec frontend pnpm test
```

---

#### 🔖 Commit

```bash
git add .
git commit -m "feat: todo list locale — store, composants, page"
git push origin main
```

---

#### ✅ Résumé du commit

::tool-table
| Fichier | Action | Rôle |
|---------|--------|------|
| `i18n.config.ts` | ✏️ Modifié | Ajout section `tasks` (form, list, scope) |
| `app/types/todo.ts` | ➕ Nouveau | `ITodoItem`, `IScope`, `SCOPE_VALUES` |
| `app/stores/todo.ts` | ➕ Nouveau | Store Pinia avec persistance localStorage |
| `app/components/partial/todo/new.vue` | ➕ Nouveau | Formulaire d'ajout avec sélecteur de scope |
| `app/components/partial/todo/list.vue` | ➕ Nouveau | Liste avec filtre par scope |
| `app/pages/todo.vue` | ➕ Nouveau | Page principale protégée |
| `tests/stores/todo.test.ts` | ➕ Nouveau | 8 tests unitaires du store |
::

---

La todo list est fonctionnelle en local — ajout, toggle, suppression et
filtrage par scope, persistés entre les rechargements.

Dans le prochain article, nous mettons en place le backend Rails :
initialisation du projet, Docker et structure de base.

[Article 4 — Backend : initialisation →](/blog/article/4-to-do-list-backend)

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::