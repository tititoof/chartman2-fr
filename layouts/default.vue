<template>
  <v-layout>
    <menu-top />
    <client-only>
      <navigation-left />
    </client-only>

    <v-app>
      <v-main
        dark="isDark"
        class="d-flex align-center fill-height pb-24"
        background-color="background"
      >
        <slot /> 

        <NuxtSnackbar />
        <page-snackbar />
        <button-back-to-top />
      </v-main>
    </v-app>

    <menu-bottom />
  </v-layout>
</template>

<script setup lang="ts">
  import { useTheme, useDisplay } from 'vuetify'
  import { useUsersStore } from '~/store/usersStore'

  const config = useRuntimeConfig()
  const usersStore = useUsersStore()
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

  const storeThemeDark = computed(() => usersStore.isDarkTheme)

  nuxtApp.hook('page:finish', () => {

    theme.global.name.value = setUserTheme()

    usersStore.setIsPhone(mobile.value)
    usersStore.setDarkTheme(theme.global.name.value === 'sharHubDarkTheme')
  })

  watch(storeThemeDark, (value) => {
    theme.global.name.value =
      value === false ? 'sharHubLightTheme' : 'sharHubDarkTheme'
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
