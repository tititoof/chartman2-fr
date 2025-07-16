<template>
  <v-btn
    variant="outlined"
    :color="props.color || 'success'"
    :to="props.to"
  >
    <v-icon size="x-large">
      {{ props.icon || 'i-mdi:eye' }}
    </v-icon>
    <span class="d-none d-lg-inline ms-1">
      {{ props.label || $t('default.buttons.show') }}
    </span>
  </v-btn>
</template>

<script lang="ts" setup>
import { defineProps } from 'vue'

const props = defineProps({
  to: {
    type: String,
    default: '/',
  },
  label: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  color: {
    type: String,
    default: '',
  },
})
</script>