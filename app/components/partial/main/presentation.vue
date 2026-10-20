<template>
  <v-card
    id="blog-hero"
    color="blue lighten-1"
    rounded="lg"
  >
    <v-img
      :height="mobile ? 180 : 260"
      src="/backgrounds/weasley.png"
      cover
    >
      <div class="d-flex flex-column justify-center align-center text-center fill-height px-4 blog-hero-content">
        <h1 class="blog-hero-title">
          Le blog
        </h1>
        <p class="blog-hero-subtitle">
          Retours d'expérience Rails, Nuxt, Docker et self-hosted
        </p>
      </div>
      <partial-main-particles v-if="reducedMotion !== 'reduce'" />
    </v-img>
  </v-card>
</template>

<script setup lang="ts">
const { mobile } = useDisplay()
const reducedMotion = usePreferredReducedMotion()

const emit = defineEmits(['addLoading', 'removeLoading'])
onBeforeMount(() => {
  emit('addLoading')
})

onMounted(async () => {
  await preloadImage('/backgrounds/weasley.png')
  emit('removeLoading')
})
</script>

<style lang="css" scoped>
.blog-hero-content {
  position: relative;
  z-index: 1;
}

.blog-hero-title {
  color: white;
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
}

.blog-hero-subtitle {
  color: rgba(255, 255, 255, 0.85);
  font-size: var(--text-lg);
}
</style>
