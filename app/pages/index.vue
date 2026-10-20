<template>
  <v-responsive>
    <v-overlay
      :model-value="loading"
      persistent
      scroll-strategy="none"
      scrim="rgb(var(--v-theme-background))"
      opacity="1"
    >
      <v-progress-circular indeterminate color="primary" size="64" width="4" />
    </v-overlay>
    <partial-main-hero />
    <lazy-partial-main-case-studies />
    <lazy-partial-main-services />
    <lazy-partial-main-about-me @addLoading="addLoading" @removeLoading="removeLoading" />
    <lazy-partial-main-contact-me @addLoading="addLoading" @removeLoading="removeLoading" />
  </v-responsive>
</template>

<script setup>
import { useApplicationStore } from '~/stores/application'

const applicationStore = useApplicationStore()
const { mobile } = useDisplay()

useSeoMeta({
  author: 'Christophe Hartmann',
  title: 'Christophe Hartmann — Développeur Ruby on Rails, Nuxt & DevOps',
  description:
    'Christophe Hartmann, développeur freelance Ruby on Rails / Nuxt et DevOps : applications maintenables, CI/CD, infrastructure auto-hébergée.',
  keywords:
    'Christophe Hartmann, freelance, ruby on rails, nuxt, devops, ci/cd, docker, jenkins, sonarqube, forgejo, self-hosted',
})

applicationStore.setIsPhone(mobile.value)

const componentsLoading = ref(0)
const loading = computed(() => componentsLoading.value > 0)
const addLoading = () => {
  componentsLoading.value++
}

const removeLoading = () => {
  componentsLoading.value--
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