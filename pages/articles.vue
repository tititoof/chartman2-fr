<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container >
      <button-article />

      <page-title
        class="py-12"
        :title="$t('global.articles')"
        icon="i-mdi:book-open-variant-outline"
      />

        <articles-categories class="py-12" />
    </v-container>
  </v-row>
</template>
<script setup>
</script>