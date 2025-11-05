---
title: 'To-do list App'
description: 'Tâches'
icon: 'i-mdi:checkbox-marked-circle-plus-outline'
color: 'secondary'
article_id: '2-to-do-list-taches'
---


Explorons la création de nos tâches.


En premier, nous allons configurer les textes en fonction de la langue, puis définir le type de nos tâches (le nom et l'état),


l'affiche de la liste de nos tâches, et le formulaire nous permettant de créer une tâche.


#### 📝 Tâches

##### 🈳 Gestion des langues

Dans un premier temps, configurons le fichier de traduction.


```ts [i18n.config.ts]
export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'fr',
  messages: {
    en: {
      welcome: 'Welcome'
    },
    fr: {
      global: {
          name: "Todo application",
          disconnect: "Déconnexion",
          home: "Accueil",
          legal_notices: "Mentions légales",
          login: "Connexion",
          register: "Inscription",
      },
      tasks: {
        form: {
          title: 'Nouvelle tâche',
          name: 'Nom',
          required: 'Ce champ est obligatoire.',
          add: 'Ajouter',
          done: 'Fait'
        },
        list: {
          title: 'Liste des tâches',
          all: 'Toutes'
        },
        scope: {
          personnal: 'Personnel',
          work: 'Travail',
          family: 'Famille',
          other: 'Autre'
        }
      },
      articles: {
        title: 'Articles'
      }
    }
  }
}))
```

##### ⚙️ Gestion du type

Une tâche est composée de deux attributs :
 * name : une chaîne de caractère 
 * done : un booléen

Contruisons le type correspondant.

```ts [types/todo.ts]
export interface ITodoItem {
  name: string
  done: boolean
}
```


##### ✅ Affichage de la liste de nos tâches


Créons un composant pour le titre avec un propriété **title** de type string.


```vue [components/page/title.vue]
<template>
  <h2 class="display-2 font-weight-bold mb-3">
    {{ props.title }}
  </h2>

  <v-responsive
    class="mx-auto mb-12"
    width="56"
  >
    <v-divider class="mb-1" />

    <v-divider />
  </v-responsive>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    default: ''
  }
})
</script>
```

##### ✏️ Formulaire d'une nouvelle tâche

A partir de là, définissons notre composant pour gérer nos tâches.

```vue [components/partial/todo/list.vue]
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
import type { ITodoItem } from '~/types/todo'

const { t } = useI18n()

const listTasks: ITodoItem[] = reactive([])
const newTaskName = ref('')
const formValid = ref(false)
const rules = reactive([
  (value: string) => {
    if (value) return true

    return t('tasks.form.required')
  },
])

const addTask = () => {
  listTasks.push({
    name: newTaskName.value,
    done: false
  })

  newTaskName.value = ''
}

const performTask = (key: number) => {
  listTasks[key].done = true
}

</script>
```

###### 🎨 Template (HTML)


Le template est divisé en trois parties : une section titre, un formulaire et une liste de tâches.


* La première partie `<section-title :title="$t('tasks.form.title')"/>` définit un élément `<section-title>` avec un attribut :title qui contient le texte traduit à l'aide de la fonction $t. Ce texte est défini dans le fichier de traduction (par exemple, tasks.form.title).

* Le formulaire (`<v-form @submit.prevent="addTask" v-model="formValid">`) permet d'ajouter une nouvelle tâche. Lorsqu'on soumet le formulaire, la fonction addTask est appelée.

* La liste de tâches (`<v-row v-for="(task, key) in listTasks" :key="key">`) affiche chaque tâche avec son nom et un bouton pour marquer la tâche comme terminée.


###### 📄 Script (TS)


Le script est divisé en plusieurs parties :



* Les imports (import type { ITodoItem } from '~/types/todo';) importent le type ITodoItem défini dans le fichier ~/types/todo.

* La fonction `$t` est utilisée pour traduire les textes.

* Les champs réactifs (const listTasks: ITodoItem[] = reactive([]);, const newTaskName = ref(''); et const formValid = ref(false);) sont définis pour stocker les tâches, le nom de la nouvelle tâche et l'état de validité du formulaire.

* Les règles de validation (const rules = reactive([ (value: string) => { ... } ]);) sont définies pour valider le champ du nom de la tâche.

* Les fonctions addTask et performTask sont définis pour ajouter une nouvelle tâche et marquer une tâche comme terminée respectivement.


Il ne reste plus qu'à intégrer notre composant à notre page d'index


```vue [pages/index.vue]
<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container>
      <page-title :title="$t('global.name')" icon="i-mdi:format-list-checks" />

      <section-title :title="$t('tasks.form.title')" />

      <partial-todo-new />

      <section-title :title="$t('tasks.list.title')" />
      
      <partial-todo-list />
    </v-container>
  </v-row>
</template>
```


Voilà, maintenant nous pouvons gérer nos tâches, mais nous les perdons à chaque fois que nous fermons le navigateur, dans le prochain article, nous utiliserons Pinia pour sauvegarder nos tâches dans le navigateur.

[troisième partie](/blog/article/3-to-do-list-refactor)