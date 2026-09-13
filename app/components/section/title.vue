<template>
  <p
    v-if="props.eyebrow"
    class="section-eyebrow mb-2"
  >
    {{ props.eyebrow }}
  </p>

  <h2 class="section-title-heading mb-4">
    {{ props.title }}
  </h2>

  <v-responsive
    class="mx-auto mb-8"
    width="56"
  >
    <v-divider color="border" class="mb-1" />

    <v-divider color="border" />
  </v-responsive>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  eyebrow: {
    type: String,
    default: '',
  },
})
</script>

<style lang="css" scoped>
.section-eyebrow {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--v-theme-secondary));
  text-align: center;
}

.section-title-heading {
  font-family: var(--font-display);
  font-size: var(--text-h2);
  font-weight: 700;
  text-align: center;
}
</style>
