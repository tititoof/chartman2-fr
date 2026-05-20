<script setup lang="ts">
import type { Article } from '~/types/Article'

interface Props {
  item: Article
}

interface Emits {
  (e: 'edit',   id: number): void
  (e: 'show',   id: number): void
  (e: 'delete', id: number): void
}

const props = defineProps<Props>()
const emit  = defineEmits<Emits>()
</script>

<template>
  <v-card class="mb-4" elevation="2">
    <v-card-title>{{ props.item.name }}</v-card-title>
    <v-card-subtitle>
      Créé le {{ new Date(props.item.created_at).toLocaleDateString('fr-FR') }}
    </v-card-subtitle>
    <v-card-text class="text-truncate">
            <div><strong>Nom de l'article :</strong> {{ props.item.name }}</div>
      <div><strong>Contenu de l'article :</strong> {{ props.item.content }}</div>
    </v-card-text>
    <v-card-actions>
      <v-btn variant="text" color="secondary" @click="emit('show',   props.item.id)">Voir</v-btn>
      <v-btn variant="text" color="primary"   @click="emit('edit',   props.item.id)">Éditer</v-btn>
      <v-spacer />
      <v-btn variant="text" color="error"     @click="emit('delete', props.item.id)">Supprimer</v-btn>
    </v-card-actions>
  </v-card>
</template>