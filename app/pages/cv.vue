<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container>
      <button-article class="my-4" />

      <page-title
        :title="$t('cv.title')"
        icon="i-mdi:file-account-outline"
      />

      <v-row justify="center" class="mt-8">
        <v-col cols="12" md="8" class="text-center">
          <p class="text-body-1 text-medium-emphasis mb-4">
            {{ $t('cv.subtitle') }}
          </p>

          <div class="d-flex gap-2 justify-center flex-wrap mb-8">
            <v-chip
              v-for="(skill, index) in $tm('cv.skills')"
              :key="index"
              color="secondary"
              variant="tonal"
              size="small"
            >
              {{ $rt(skill) }}
            </v-chip>
          </div>

          <div class="d-flex gap-4 justify-center flex-wrap">
            <v-btn
              color="primary"
              size="large"
              variant="flat"
              prepend-icon="i-mdi:eye-outline"
              href="/cv-christophe-hartmann.pdf"
              target="_blank"
            >
              {{ $t('cv.actions.view') }}
            </v-btn>

            <v-btn
              size="large"
              variant="outlined"
              prepend-icon="i-mdi:download-outline"
              href="/cv-christophe-hartmann.pdf"
              download
            >
              {{ $t('cv.actions.download') }}
            </v-btn>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </v-row>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'CV — Christophe Hartmann',
  description: 'Architecte Solutions Web & DevOps.',
  ogTitle: 'CV — Christophe Hartmann',
  ogDescription: 'Architecte Solutions Web & DevOps.',
})
</script>
