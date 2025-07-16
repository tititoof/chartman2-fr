---
title: 'To-do list App'
description: 'Refactor'
icon: 'i-mdi:checkbox-marked-circle-plus-outline'
color: 'secondary'
article_id: '3-to-do-list-refactor'
---

Dans cet articles, nous allons refactoriser la partie ToDo.

#### Store

Créons un store pour les tâches (comme un panier sur les sites d'ecommerce)

```ts [stores/todo]
import { defineStore, acceptHMRUpdate } from 'pinia'
import type { ITodoItem } from '~/types/todo'

export const useTodoStore = defineStore('todo', {
  state: () => ({
    list: [] as ITodoItem[]
  }),
  getters: {
    getList: state => state.list
  },
  actions: {
    addItem(item: ITodoItem) {
      this.list.push(item)
    },
    performItem(key: number) {
      this.list[key].done = true
    }
  },
  persist: {
      storage: persistedState.localStorage,
  },
})

if (Object.hasOwn(import.meta, 'hot')) {
    // @ts-ignore
    import.meta.hot.accept(acceptHMRUpdate(useTodoStore, import.meta.hot))
}
```

Pinia est en *store management* pour Vue.js (et Nuxt.js, qui repose sur Vue.js)


On importe les fonctions defineStore et acceptHMRUpdate du package Pinia. 

Ces fonctions sont utilisées dans le contexte de gestion des données et permettent d'implémenter l'utilisation de Pinia.

Puis le type *ITodoItem* depuis le fichier ~/types/todo.

Le state management possède trois parties principales :


* **State** : Cet objet représente l'état initial du stock. Ici, c'est un tableau de tâches (liste) qui est initialisé avec une liste vide [].


* **Getters** : Ces fonctions permettent d'extraire des données à partir de l'état.


* **Actions** : Ces fonctions peuvent être utilisées pour modifier l'état. Ici, deux actions sont définies :
  * *addItem* : Prend un nouvel élément de tâche (item) et ajoute-le à la fin de l'array de listes avec la méthode push().
  * *performItem* : Prend une clé (probablement un index ou ID) et change la propriété done du correspondant élément de tâches dans l'array de listes en vrai.


Le store est configuré pour conserver son état à l'aide du mécanisme de stockage localStorage.


HMR (Remplacement de modules à chauds)


La dernière partie du code vérifie si HMR (Hot Module Replacement) est activée (en vérifiant si la propriété hot existe sur l'objet import meta). 

Si oui, il appelle la méthode accept avec la fonction acceptHMRUpdate.


#### Refactor

Divisons la gestion du todo list en 2, la liste et le formulaire d'ajout.

##### Liste


```vue [components/partial/todo/list.vue]
<template>
  <section-title :title="$t('tasks.list.title')" />
  <v-row
    v-for="(task, key) in listTasks"
    :key="key"
  >
    <v-col cols="8">
      <div :class="{'text-decoration-line-through': task.done === true}">
        {{ task.name }}
      </div>
    </v-col>
    <v-col cols="4">
      <v-btn 
        v-if="task.done === false"
        type="button" 
        block
        @click.prevent="performTask(key)"
      >
        <v-icon icon="i-mdi:checkbox-marked-circle-plus-outline" />
      
        {{ $t('tasks.form.done') }}
      </v-btn>
    </v-col>
  </v-row>
</template>


<script setup lang="ts">
import { useTodoStore } from '~/stores/todo'

const todoStore = useTodoStore()
const listTasks = computed(() => todoStore.getList)

const performTask = (key: number) => {
  todoStore.performItem(key)
}

</script>
```

##### Formulaire d'ajout

```vue [components/partial/todo/new.vue]
<template>
  <section-title :title="$t('tasks.form.title')" />
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
  </v-form>
</template>


<script setup lang="ts">
import { useTodoStore } from '~/stores/todo'

const todoStore = useTodoStore()
const { t } = useI18n()
const newTaskName = ref('')
const formValid = ref(false)
const rules = reactive([
  (value: string) => {
    if (value) return true

    return t('tasks.form.required')
  },
])

const addTask = () => {
  todoStore.addItem({
    name: newTaskName.value,
    done: false
  })

  newTaskName.value = ''
}
</script>
```


Enfin, ajoutons le composant todo/new à la page d'index 


```vue [pages/index.vue]
<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container>
      <page-title :title="$t('global.name')" icon="i-mdi:format-list-checks" />

      <partial-todo-new />
      
      <partial-todo-list />
    </v-container>
  </v-row>
</template>
```


Dans le prochain [article](/blog/article/4-to-do-list-scope), nous ajouterons le contexte (scope : perso, famille, etc...)