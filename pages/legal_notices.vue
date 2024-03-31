<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container class="py-12">
      <page-title
        :title="$t('legal_notices.title')"
        icon="i-mdi:scale-balance"
      />

      <button-article />

      <partial-legal-notices />
    </v-container>
  </v-row>
</template>
<script setup>
useHead({
  charset: 'UTF-8',
  author: 'Christophe Hartmann',
  title: 'Mentions Légales',
  description:
    'Web artisan, loving ruby on rails, nuxtjs, ci/cd, gitea, jenkins, sonarsource, openproject, php, laravel, symfony',
  keywords:
    'Christophe Hartmann, ruby, ruby on rails, nuxt, framework, ci/cd, gitea, sonarsource, openproject, jenkins',
})
</script>
