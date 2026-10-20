<template>
  <v-app-bar
    color="background"
    height="64"
    class="app-bar-shell"
  >
    <template #prepend>
      <v-img
        :width="60"
        aspect-ratio="16/9"
        :src="src"
        cover
        @click="backToHomePage"
      />
    </template>

    <v-app-bar-title class="app-bar-brand-title">
      {{ $t('global.name') }}
    </v-app-bar-title>

    <template #append>
      <nav
        v-if="!mobile"
        aria-label="Navigation principale"
        class="d-flex align-center ga-1 mr-3"
      >
        <v-btn
          v-for="(link, i) in navLinks"
          :key="i"
          variant="text"
          rounded="lg"
          class="app-bar-nav-link"
          @click="goTo(link)"
        >
          {{ link.label }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          rounded="lg"
          class="ml-2"
          @click="goTo(contactLink)"
        >
          {{ contactLink.label }}
        </v-btn>
      </nav>
      <v-btn
        icon="i-mdi:theme-light-dark"
        variant="text"
        rounded="lg"
        class="app-bar-icon-btn"
        aria-label="Changer de thème"
        @click="toggleTheme"
      />
      <v-menu>
        <template #activator="{ props }">
          <v-btn
            :icon="mobile ? 'i-mdi:menu' : 'i-mdi:dots-vertical'"
            variant="text"
            rounded="lg"
            class="app-bar-icon-btn ml-2"
            :aria-label="mobile ? 'Menu principal' : 'Plus d\'options'"
            v-bind="props"
          />
        </template>

        <v-list
          bg-color="background"
          class="app-bar-menu"
        >
          <template v-if="mobile">
            <v-list-item
              v-for="(link, i) in [...navLinks, contactLink]"
              :key="`nav-${i}`"
              class="app-bar-menu-item"
              @click="goTo(link)"
            >
              <template #prepend>
                <v-icon
                  size="large"
                  :icon="link.icon"
                  class="app-bar-menu-icon"
                />
              </template>
              <v-list-item-title class="app-bar-menu-link">
                {{ link.label }}
              </v-list-item-title>
            </v-list-item>
            <v-divider class="my-1" />
          </template>
          <v-list-item
            v-for="(item, i) in visibleMenuItems"
            :key="i"
            :to="item.to"
            class="app-bar-menu-item"
          >
            <template #prepend>
              <v-icon
                size="large"
                :icon="item.icon"
                class="app-bar-menu-icon"
              />
            </template>
            <v-list-item-title class="app-bar-menu-link">
              {{ $t(item.name) }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </v-app-bar>
</template>

<script setup>
import { useApplicationStore } from '~/stores/application'

const applicationStore = useApplicationStore()
const router = useRouter()
const route = useRoute()
const { smAndDown: mobile } = useDisplay()
const src = ref('/img/logo.png')
const menuItems = reactive([
  {
    name: 'global.cv',
    icon: 'i-mdi:file-account-outline',
    to: '/cv',
  },
  {
    name: 'legal_notices.title',
    icon: 'i-mdi:scale-balance',
    to: '/legal_notices',
  },
  {
    name: 'default.auth.sign_in.title',
    icon: 'i-mdi:login-variant',
    to: '/auth/sign-in',
  },
  {
    name: 'default.auth.sign_out.title',
    icon: 'i-mdi:logout-variant',
    to: '/auth/sign-out',
  },
])

// Liens directs de la barre (desktop) ; repliés dans le menu sur mobile
const navLinks = [
  { label: 'Réalisations', icon: 'i-mdi:briefcase-outline', anchor: 'realisations' },
  { label: 'Services', icon: 'i-mdi:server-network', anchor: 'services' },
  { label: 'Articles', icon: 'i-mdi:post-outline', to: '/articles' },
  { label: 'CV', icon: 'i-mdi:file-account-outline', to: '/cv' },
]
const contactLink = { label: 'Contact', icon: 'i-mdi:email-outline', anchor: 'contact-me' }

const token = useCookie('token')

const visibleMenuItems = computed(() => {
  const isLoggedIn = !!token.value

  return menuItems.filter((item) => {
    if (item.to === '/auth/sign-in') {
      return !isLoggedIn
    }
    if (item.to === '/auth/sign-out') {
      return isLoggedIn
    }
    // Les autres (legal notices) toujours visibles
    return true
  })
})

const toggleTheme = () => {
  applicationStore.toggleDarkTheme()
}

// Les ancres n'existent que sur l'accueil : on y revient d'abord si besoin
const goTo = async (link) => {
  if (link.to) {
    return navigateTo(link.to)
  }

  if (route.path === '/') {
    return useScroll(link.anchor)
  }

  await navigateTo({ path: '/', hash: `#${link.anchor}` })
}

const backToHomePage = () => {
  router.push({ path: '/' })
}
</script>

<style lang="css" scoped>
.app-bar-shell {
  border-bottom: 1px solid rgb(var(--v-theme-border));
}

.app-bar-brand-title {
  font-family: var(--font-display);
  font-weight: 700;
}

.app-bar-icon-btn {
  border: 1px solid rgb(var(--v-theme-border));
  color: rgb(var(--v-theme-muted)) !important;
}

.app-bar-icon-btn :deep(.v-icon) {
  color: rgb(var(--v-theme-muted));
}

.app-bar-icon-btn:hover {
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-background)) !important;
}

.app-bar-icon-btn:hover :deep(.v-icon) {
  color: rgb(var(--v-theme-on-background));
}

.app-bar-nav-link {
  color: rgb(var(--v-theme-muted));
  text-transform: none;
  letter-spacing: normal;
}

.app-bar-nav-link:hover {
  color: rgb(var(--v-theme-on-background));
}

.app-bar-menu {
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 8px;
}

.app-bar-menu-icon {
  color: rgb(var(--v-theme-muted));
  transition: color 0.15s ease;
}

.app-bar-menu-link {
  color: rgb(var(--v-theme-on-background));
  transition: color 0.15s ease;
}

.app-bar-menu-item:hover {
  background-color: rgb(var(--v-theme-surface));
}

.app-bar-menu-item:hover .app-bar-menu-icon,
.app-bar-menu-item:hover .app-bar-menu-link {
  color: rgb(var(--v-theme-primary));
}
</style>
