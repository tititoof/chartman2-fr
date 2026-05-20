<script setup lang="ts">
import type { Article } from '~/types/Article'

interface Props {
  item: Article
}

const props = defineProps<Props>()
</script>

<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between">
      {{ props.item.name }}
      <v-chip size="small" color="secondary">
        {{ new Date(props.item.created_at).toLocaleDateString('fr-FR') }}
      </v-chip>
    </v-card-title>
    <v-card-text>
      <v-list>
        <v-list-item>
          <v-list-item-content>
            <div>{{ props.item.content }}</div>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>
</template>