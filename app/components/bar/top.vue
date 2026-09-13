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
      <v-btn
        icon="i-mdi:theme-light-dark"
        variant="text"
        rounded="lg"
        class="app-bar-icon-btn"
        @click="toggleTheme"
      />
      <v-menu>
        <template #activator="{ props }">
          <v-btn
            icon="i-mdi:dots-vertical"
            variant="text"
            rounded="lg"
            class="app-bar-icon-btn"
            v-bind="props"
          />
        </template>

        <v-list
          bg-color="background"
          class="app-bar-menu"
        >
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
