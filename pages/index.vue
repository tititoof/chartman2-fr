<template>
    <v-responsive>
      <lazy-partial-main-presentation />
  
      <lazy-partial-main-about-me />
      <lazy-partial-main-skills />
      <lazy-partial-main-technologies />
      <lazy-partial-main-articles />
      <lazy-partial-main-contact-me />
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
</script>

<style>
.v-card--reveal {
  bottom: 0;
  opacity: 1 !important;
  position: absolute;
  width: 100%;
}
</style>