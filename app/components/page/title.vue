<template>
  <v-toolbar
    color="surface"
    rounded="lg"
    class="px-4 page-title-bar"
  >
    <v-icon
      size="x-large"
      color="primary"
      :icon="icon"
    />
    <span class="page-title-text pl-2">
      {{ props.title }}
    </span>
    <v-spacer />

    <template #append>
      <template
        v-if="props.links.length > 0"
      >
        <section
          v-for="link in props.links"
          :key="link.label"
        >
          <buttons-navigate
            :color="link.color"
            :label="$t(link.label)"
            :icon="link.icon"
            :to="link.to"
          />
        </section>
      </template>
    </template>
  </v-toolbar>
</template>

<script setup lang="ts">
const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: 'i-mdi:alpha-xcircle-outline',
  },
  links: {
    type: Array,
    default: [],
  },
})

const icon = computed(() => {
  return props.icon
})
</script>

<style lang="css" scoped>
.page-title-bar {
  border: 1px solid rgb(var(--v-theme-border));
}

.page-title-text {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  align-self: center;
}
</style>