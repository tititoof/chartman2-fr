<template>
  <span class="prose-img-wrapper d-inline-block">
    <img
      :src="props.src"
      :alt="props.alt"
      :width="props.width"
      :height="props.height"
      loading="lazy"
      class="prose-img rounded-lg"
      @click="open = true"
    >
    <v-dialog
      v-model="open"
      width="95vw"
      max-width="2200"
    >
      <v-card
        color="background"
        rounded="lg"
        class="prose-img-dialog-card"
      >
        <v-btn
          class="prose-img-close"
          icon
          size="small"
          variant="flat"
          color="background"
          @click="open = false"
        >
          <v-icon icon="i-mdi:close" />
        </v-btn>
        <div
          class="prose-img-viewport"
          :class="{ 'prose-img-viewport--zoomed': zoomed }"
        >
          <img
            :src="props.src"
            :alt="props.alt"
            :class="['prose-img-full', { 'prose-img-full--zoomed': zoomed }]"
            @click="zoomed = !zoomed"
          >
        </div>
      </v-card>
    </v-dialog>
  </span>
</template>

<script setup lang="ts">
const props = defineProps({
  src: {
    type: String,
    default: ''
  },
  alt: {
    type: String,
    default: ''
  },
  width: {
    type: [String, Number],
    default: undefined
  },
  height: {
    type: [String, Number],
    default: undefined
  }
})

const open = ref(false)
const zoomed = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) zoomed.value = false
})
</script>

<style scoped>
.prose-img {
  display: block;
  max-width: 100%;
  height: auto;
  cursor: zoom-in;
  transition: opacity 0.15s ease;
}

.prose-img:hover {
  opacity: 0.88;
}

.prose-img-dialog-card {
  position: relative;
}

.prose-img-viewport {
  height: 50vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.prose-img-viewport--zoomed {
  display: block;
  overflow: auto;
}

.prose-img-full {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: zoom-in;
}

.prose-img-full--zoomed {
  width: auto;
  height: auto;
  max-width: none;
  max-height: none;
  cursor: zoom-out;
}

.prose-img-close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  opacity: 0.9;
}
</style>
