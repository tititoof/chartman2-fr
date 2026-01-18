<script setup lang="ts">
import { useAppVersionStore } from '@/stores/appVersion'

const store = useAppVersionStore()
const outdated = computed(() => store.getOutdated)
</script>

<template>
  <div class="text-center">
    <v-dialog
      v-model="outdated"
      max-width="500"
      persistent
    >
      <v-card
        prepend-icon="i-mdi:newspaper"
      >
        <template v-slot:title>
          Nouvelle version disponible.
        </template>
        <v-card-item>
          <v-card-text>
            La version <strong>{{ store.getVersion }}</strong> de l’application est disponible.
          </v-card-text>
        </v-card-item>
        <template v-slot:actions>
          <v-spacer></v-spacer>

          <v-btn @click="store.reload">
            Recharger
          </v-btn>
        </template>
      </v-card>
    </v-dialog>
  </div>
</template>
