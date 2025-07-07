<template>
  <v-toolbar
    color="info-container"
    rounded="lg"
    class="px-4"
  >
    <v-icon
      size="x-large"
      :icon="icon"
    />
    <span class="text-h6 font-weight-bold align-center pl-2">
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
          <!-- <v-btn
            :color="link.color || 'success'"
            variant="outlined"
            :prepend-icon="link.icon || 'i-mdi:eye'"
            :to="link.to"
          >
            {{ $t(link.label) || $t('default.show') }}
          </v-btn> -->
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