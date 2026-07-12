<script setup lang="ts">
const { state } = useNotification()
</script>

<template>
  <v-snackbar
    v-model="state.show"
    :color="state.type"
    :timeout="state.timeout"
    location="bottom right"
  >
    {{ state.message }}
    <template #actions>
      <v-btn variant="text" @click="state.show = false">Fermer</v-btn>
    </template>
  </v-snackbar>
</template>