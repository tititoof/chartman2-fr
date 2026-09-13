<script setup lang="ts">
  import type { NuxtError } from '#app'

  const applicationStore = useApplicationStore()
  const nuxtApp = useNuxtApp()
  const { mobile } = useDisplay()
  const theme = useTheme()

  const storeThemeDark = computed(() => applicationStore.isDarkTheme)

  theme.change(storeThemeDark.value === false ? 'chartman2frLightTheme' : 'chartman2frDarkTheme')

  nuxtApp.hook('page:finish', () => {
    theme.change(storeThemeDark.value === false ? 'chartman2frLightTheme' : 'chartman2frDarkTheme')

    applicationStore.setIsPhone(mobile.value)
    applicationStore.setIsDarkTheme(theme.global.name.value === 'chartman2frDarkTheme')
  })

  watch(storeThemeDark, (value) => {
    theme.change(value === false ? 'chartman2frLightTheme' : 'chartman2frDarkTheme')
  })

  const props = defineProps({
    error: Object as () => NuxtError
  })

  const friendlyMessage = computed(() => {
    if (props.error?.statusCode === 404) {
      return "La page que vous cherchez n'existe pas ou plus."
    }

    return "Une erreur inattendue s'est produite. Vous pouvez réessayer ou revenir à l'accueil."
  })
</script>

<template>
  <v-layout>
    <bar-top />
    <page-snackbar />
    <v-app>
      <v-main
        class="d-flex align-center fill-height pb-24"
        background-color="background"
      >
        <v-img
          :min-height="mobile ? '45vh' : '70vh'"
          src="/backgrounds/hero-2.svg"
          contain
        >
          <v-container
            class="d-flex align-center justify-center fill-height"
            fluid
          >
            <v-row
              justify="center"
              class="text-center"
            >
              <v-col cols="12">
                <p class="error-eyebrow mb-2">
                  Erreur {{ error?.statusCode || '' }}
                </p>
                <h1 class="error-title mb-4">
                  Oups, cette page s'est perdue en route
                </h1>
                <p class="error-message mb-8">
                  {{ friendlyMessage }}
                </p>
                <div class="d-flex flex-wrap justify-center ga-4">
                  <v-btn
                    class="error-btn"
                    color="primary"
                    variant="outlined"
                    rounded="lg"
                    size="large"
                    min-width="180"
                    append-icon="i-mdi:arrow-left-circle"
                    @click="$router.back()"
                  >
                    Page précédente
                  </v-btn>
                  <v-btn
                    class="error-btn"
                    color="primary"
                    variant="outlined"
                    rounded="lg"
                    size="large"
                    min-width="180"
                    to="/"
                    append-icon="i-mdi-home"
                  >
                    Accueil
                  </v-btn>
                </div>
              </v-col>
            </v-row>
          </v-container>
        </v-img>

        <button-back-to-top />
      </v-main>
    </v-app>
    <CookieControl locale="fr" />

    <bar-bottom />
  </v-layout>
</template>

<style lang="css" scoped>
.error-eyebrow {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--v-theme-secondary));
}

.error-title {
  font-family: var(--font-display);
  font-size: var(--text-h1);
  font-weight: 700;
}

.error-message {
  font-size: var(--text-lg);
  color: rgb(var(--v-theme-muted));
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}

.error-btn {
  transition: background-color 0.15s ease, color 0.15s ease;
}

.error-btn:hover {
  background-color: rgb(var(--v-theme-primary)) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
}

.error-btn:hover :deep(.v-icon) {
  color: rgb(var(--v-theme-on-primary));
}
</style>
