<script setup lang="ts">
import type { CreateArticlePayload, UpdateArticlePayload } from '~/types/Article'

interface Props {
  modelValue: CreateArticlePayload | UpdateArticlePayload
  loading?:   boolean
  rules?:     Record<string, Array<(v: unknown) => true | string>>
}

interface Emits {
  (e: 'update:modelValue', value: CreateArticlePayload | UpdateArticlePayload): void
  (e: 'submit'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  rules:   () => ({})
})

const emit = defineEmits<Emits>()

const update = (field: keyof (CreateArticlePayload | UpdateArticlePayload), value: unknown) => {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}
</script>

<template>
  <v-form @submit.prevent="emit('submit')">
        <v-text-field
      :model-value="props.modelValue.name"
      label="Nom de l'article"
      :rules="props.rules.name"
      @update:model-value="update('name', $event)"
    />
    <v-textarea
      :model-value="props.modelValue.content"
      label="Contenu de l'article"
      :rules="props.rules.content"
      @update:model-value="update('content', $event)"
    />
    <div class="d-flex gap-2 mt-4">
      <v-btn variant="text" @click="emit('cancel')">Annuler</v-btn>
      <v-btn type="submit" color="primary" :loading="props.loading" block>
        Enregistrer
      </v-btn>
    </div>
  </v-form>
</template>