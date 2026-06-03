<script setup lang="ts">
interface Props {
  modelValue: boolean
  loading?:   boolean
  title?:     string
  message?:   string
  confirmLabel?: string
  confirmColor?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading:      false,
  title:        'Confirmer',
  message:      'Êtes-vous sûr de vouloir effectuer cette action ?',
  confirmLabel: 'Confirmer',
  confirmColor: 'error'
})

const emit = defineEmits<Emits>()
</script>

<template>
  <v-dialog
    :model-value="props.modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="500"
  >
    <v-card>
      <v-card-title>{{ props.title }}</v-card-title>
      <v-card-text>
        {{ props.message }}
        <br />
        <span class="text-error text-caption">Cette action est irréversible.</span>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Annuler</v-btn>
        <v-btn
          :color="props.confirmColor"
          :loading="props.loading"
          @click="emit('confirm')"
        >
          {{ props.confirmLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>