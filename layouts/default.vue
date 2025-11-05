<template>
  <v-layout>
    <bar-top />
    <page-snackbar />
    <v-app>
      <v-main
        dark="isDark"
        class="d-flex align-center fill-height pb-24"
        background-color="background"
      >
        <slot /> 

        <button-back-to-top />
      </v-main>
    </v-app>
    <CookieControl locale="fr" />

    <bar-bottom />
    <NuxtSnackbar />
  </v-layout>
</template>

<script setup lang="ts">
  import { useApplicationStore } from '~/stores/application'

  const config = useRuntimeConfig()
  const applicationStore = useApplicationStore()
  const nuxtApp = useNuxtApp()
  const theme = useTheme()
  const { locale } = useI18n()
  const { mobile } = useDisplay()

  useHead({
    title: config.public.appName as string,
    htmlAttrs: {
      lang: locale.value || 'fr',
    },
    link: [
      {
        rel: 'icon',
        type: 'image/png',
        href: '/favicon.ico',
      },
    ],
  })

  const storeThemeDark = computed(() => applicationStore.isDarkTheme)
  
  applicationStore.setIsPhone(mobile.value)

  nuxtApp.hook('page:finish', () => {
    theme.change(setTheme())

    applicationStore.setIsPhone(mobile.value)
    applicationStore.setIsDarkTheme(theme.global.name.value === 'chartman2frDarkTheme')
  })

  watch(storeThemeDark, (value) => {
    theme.change(value === false ? 'chartman2frLightTheme' : 'chartman2frDarkTheme')
  })
</script>

<style>
  .page-enter-active,
  .page-leave-active,
  .component-fade-in {
    transition: all 0.2s;
  }
  .page-enter-from,
  .page-leave-to,
  .component-fade-out {
    opacity: 0;
    filter: blur(1rem);
  }

  .pb-24 {
    padding-bottom: 96px !important;
  }
</style>
