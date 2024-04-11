<template>
  <v-toolbar flat color="info-container">
    <v-btn
      @click="$router.back()"
      variant="tonal"
      color="info"
      class="mr-2"
    >
      <v-icon icon="i-mdi:arrow-left-circle" />
    </v-btn>
    <v-btn
      to="/"
      variant="tonal"
      color="info"
    >
      <v-icon icon="i-mdi-home" />
    </v-btn>

    <v-spacer></v-spacer>

    <v-btn
      v-if="route.name != 'articles'"
      to="/articles"
      variant="tonal"
      color="info"
    >
      <v-icon icon="i-mdi:book-open-variant-outline" />
    </v-btn>
  </v-toolbar>
</template>
<script setup>
const route = useRoute()
</script>
