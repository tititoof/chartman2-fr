<template>
  <v-layout>
    <bar-top />

    <v-app>
      <v-main
        dark="isDark"
        class="d-flex align-center fill-height pb-24"
        background-color="background"
      >
        <slot /> 

        <page-snackbar />
        <button-back-to-top />
      </v-main>
    </v-app>

    <bar-bottom />
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
  const router = useRouter()

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

  nuxtApp.hook('page:finish', () => {
    theme.global.name.value = setTheme()

    applicationStore.setIsPhone(mobile.value)
    applicationStore.setIsDarkTheme(theme.global.name.value === 'chartman2frDarkTheme')
  })

  watch(storeThemeDark, (value) => {
    console.log(value)
    console.log(theme.global.name.value)
    theme.global.name.value =
      value === false ? 'chartman2frLightTheme' : 'chartman2frDarkTheme'
  })
</script>

<style>
  .page-enter-active,
  .page-leave-active,
  .component-fade-in {
    transition: all 0.4s;
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
