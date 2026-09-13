<template>
  <v-toolbar flat color="surface" class="button-article-bar">
    <v-btn
      @click="$router.back()"
      variant="outlined"
      color="primary"
      class="mr-2 ml-2 btn-outline-hover-fill"
    >
      <v-icon icon="i-mdi:arrow-left-circle" />
    </v-btn>
    <v-btn
      to="/"
      variant="outlined"
      color="primary"
      class="btn-outline-hover-fill"
    >
      <v-icon icon="i-mdi-home" />
    </v-btn>

    <v-spacer></v-spacer>

    <v-btn
      v-if="route.name != 'articles'"
      to="/articles"
      variant="outlined"
      color="primary"
      class="mr-2 btn-outline-hover-fill"
    >
      <v-icon icon="i-mdi:book-open-variant-outline" />
    </v-btn>
  </v-toolbar>
</template>
<script setup>
const route = useRoute()
</script>

<style lang="css" scoped>
.button-article-bar {
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 8px;
}
</style>
