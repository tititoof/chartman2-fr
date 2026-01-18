<template>
  <v-layout>
    <bar-top />
    <page-snackbar />
    <v-app>
      <NuxtLoadingIndicator color="primary" :height="4" />
      <!-- <AppVersionModal /> -->
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
  import { useAppVersionStore } from '~/stores/appVersion'

  const config = useRuntimeConfig()
  const applicationStore = useApplicationStore()
  const appVersionStore = useAppVersionStore()
  const nuxtApp = useNuxtApp()
  const theme = useTheme()
  const { locale } = useI18n()
  const { mobile } = useDisplay()

  let currentVersion: string | null = null

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
  const appVersion = computed(() => appVersionStore.getVersion)
  
  applicationStore.setIsPhone(mobile.value)

  nuxtApp.hook('page:finish', () => {
    theme.change(setTheme())

    applicationStore.setIsPhone(mobile.value)
    applicationStore.setIsDarkTheme(theme.global.name.value === 'chartman2frDarkTheme')

    window.addEventListener('app:version-changed', (event: any) => {
      appVersionStore.markOutdated(event.detail)
    })

    if (config.public.appVersion) {
      currentVersion = config.public.appVersion
    }

    if (appVersion.value !== currentVersion) {
      window.dispatchEvent(
        new CustomEvent('app:version-changed', {
          detail: currentVersion
        })
      )
    }

    if (!currentVersion) return

    window.addEventListener('error', (e) => {
      if (
        e.message?.includes('Loading chunk') ||
        e.message?.includes('Failed to fetch dynamically imported module')
      ) {
        window.dispatchEvent(
          new CustomEvent('app:version-changed', {
            detail: currentVersion
          })
        )
      }
    })
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
