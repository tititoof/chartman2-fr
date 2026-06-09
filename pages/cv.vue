<template>
  <v-container class="py-12">
    <v-row justify="center">
      <v-col cols="12" md="8" class="text-center">

        <v-icon icon="i-mdi:file-account-outline" size="64" color="primary" class="mb-4" />
        <h1 class="text-h4 font-weight-bold mb-2">Christophe Hartmann</h1>
        <p class="text-body-1 text-medium-emphasis mb-8">
          Développeur full-stack — Ruby on Rails · Nuxt · DevOps
        </p>

        <div class="d-flex gap-4 justify-center flex-wrap">
          <v-btn
            color="primary"
            size="large"
            variant="flat"
            prepend-icon="mdi-eye-outline"
            href="/cv-christophe-hartmann.pdf"
            target="_blank"
          >
            Voir le CV
          </v-btn>

          <v-btn
            size="large"
            variant="outlined"
            prepend-icon="mdi-download-outline"
            href="/cv-christophe-hartmann.pdf"
            download
          >
            Télécharger (PDF)
          </v-btn>
        </div>

      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'CV — Christophe Hartmann',
  description: 'Architecte Solutions Web & DevOps.',
  ogTitle: 'CV — Christophe Hartmann',
  ogDescription: 'Architecte Solutions Web & DevOps.',
})
</script>
