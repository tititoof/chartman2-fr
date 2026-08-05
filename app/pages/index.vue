<template>
  <v-responsive>
    <v-overlay v-if="loading">
      <v-progress-circular indeterminate color="primary" size="64"/>
    </v-overlay>
    <lazy-partial-main-presentation @addLoading="addLoading" @removeLoading="removeLoading" />
    <lazy-partial-main-about-me @addLoading="addLoading" @removeLoading="removeLoading" />
    <lazy-partial-main-skills @addLoading="addLoading" @removeLoading="removeLoading" />
    <lazy-partial-main-technologies @addLoading="addLoading" @removeLoading="removeLoading" />
    <lazy-partial-main-articles @addLoading="addLoading" @removeLoading="removeLoading" />
    <lazy-partial-main-contact-me @addLoading="addLoading" @removeLoading="removeLoading" />
  </v-responsive>
</template>

<script setup>
import { useApplicationStore } from '~/stores/application'

const applicationStore = useApplicationStore()
const { mobile } = useDisplay()

useHead({
  charset: 'UTF-8',
  author: 'Christophe Hartmann',
  title: 'Accueil',
  description:
    'Web artisan, loving ruby on rails, nuxtjs, ci/cd, gitea, jenkins, sonarsource, openproject, php, laravel, symfony',
  keywords:
    'Christophe Hartmann, ruby, ruby on rails, nuxt, framework, ci/cd, gitea, sonarsource, openproject, jenkins',
})

applicationStore.setIsPhone(mobile.value)
const loading = computed(() => applicationStore.getComponentsLoading === 0)
const addLoading = () => {
  applicationStore.addComponentsLoading()
}

const removeLoading = () => {
  applicationStore.removeComponentsLoading()
}
</script>

<style>
.v-card--reveal {
  bottom: 0;
  opacity: 1 !important;
  position: absolute;
  width: 100%;
}
</style>