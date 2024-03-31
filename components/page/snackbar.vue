<template>
  <v-snackbar
    v-model="snackbar"
    :color="category"
    :timeout="4000"
    location="top"
  >
    <v-icon :icon="icon" />
    {{ message }}

    <template #actions>
      <v-btn
        density="compact"
        icon="i-mdi:close-circle"
        @click="handleCloseClick"
      />
    </template>
  </v-snackbar>
</template>
<script setup>
  import { useApplicationStore } from '~/stores/application'

  const { t } = useI18n()
  const applicationStore = useApplicationStore()
  const snackbar = computed({
    get: () => applicationStore.getShow,
    set: (show) => applicationStore.setShow(show),
  })
  const message = computed(() => t(applicationStore.getMessage))
  const category = computed(() => applicationStore.getCategory)
  const icon = computed(() => {
    switch (category.value) {
      case 'success':
        return 'i-mdi:check-circle'
      case 'error':
        return 'i-mdi:alert-circle'
      case 'info':
        return 'i-mdi:information'
    }
  })

  const handleCloseClick = () => {
    applicationStore.setShow(false)
  }
</script>
