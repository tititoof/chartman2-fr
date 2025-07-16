<template>
  <v-dialog
    v-model="props.show"
    width="auto"
  >
    <v-card
      max-width="800"
      color="secondary-container"
      :prepend-icon="props.icon"
      :text="props.text"
      :title="props.title"
    >
      <template #actions>
        <v-spacer></v-spacer>
        <buttons-action
          class="ms-auto"
          :color="props.cancelColor"
          :label="props.cancelText"
          :icon="props.cancelIcon"
          @submit-action="handleClose"
        />
        <buttons-action
          class="ms-auto"
          :color="props.okColor"
          :label="props.okText"
          :icon="props.okIcon"
          @submit-action="handleAction"
        />
      </template>
    </v-card>
  </v-dialog>
</template>
<script setup lang="ts">
const props = defineProps({
  icon: {
    type: String,
    default: 'i-mdi:trash-can',
  },
  title: {
    type: String,
    default: '',
  },
  text: {
    type: String,
    default: '',
  },
  show: {
    type: Boolean,
    default: false,
  },
  okText: {
    type: String,
    default: 'Ok',
  },
  okIcon: {
    type: String,
    default: '',
  },
  okColor: {
    type: String,
    default: 'success',
  },
  cancelText: {
    type: String,
    default: 'Ok',
  },
  cancelIcon: {
    type: String,
    default: '',
  },
  cancelColor: {
    type: String,
    default: 'info',
  },
})

const emit = defineEmits(['submit-close', 'submit-action'])
const handleClose = () => {
  emit('submit-close')
}
const handleAction = () => {
  emit('submit-action')
}
</script>