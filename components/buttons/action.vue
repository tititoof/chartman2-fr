<template>
  <v-btn
    variant="outlined"
    :color="props.color || 'success'"
    @click="handleAction"
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
const props = defineProps({
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
  informations: {
    type: Object,
    default: {},
  },
})

const emit = defineEmits(['submit-action'])

const handleAction = () => {
  emit('submit-action', props.informations)
}
</script>
