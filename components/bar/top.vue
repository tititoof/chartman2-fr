<template>
  <v-app-bar
    color="primary-container"
    density="compact"
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

    <v-app-bar-title>
      {{ $t('global.name') }}
    </v-app-bar-title>
    
    <template #append>
      <v-btn
        icon="i-mdi:theme-light-dark"
        @click="toggleTheme"
      />
      <v-menu>
        <template #activator="{ props }">
          <v-btn
            icon="i-mdi:dots-vertical"
            v-bind="props"
          />
        </template>

        <v-list
          color="primary"
          bg-color="primary-container"
        >
          <v-list-item
            v-for="(item, i) in menuItems"
            :key="i"
          >
            <template #prepend>
              <v-icon
                size="large"
                :icon="item.icon"
              />
            </template>
            <v-list-item-title>
              <v-btn
                color="info"
                :nuxt="true"
                :to="item.to"
                variant="plain"
              >
                {{ $t(item.name) }}
              </v-btn>
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
const src = ref('/img/logo.webp')
const menuItems = reactive([
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
])

const toggleTheme = () => {
  applicationStore.toggleDarkTheme()
}

const backToHomePage = () => {
  router.push({ path: '/' })
}

</script>