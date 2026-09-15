<template>
  <div class="mermaid-wrapper">
    <pre @click="openIfReady">
      <code
        ref="mermaidEl"
        class="mermaid"
        v-if="show"
      >
        <slot />
      </code>
    </pre>
    <v-dialog
      v-model="open"
      width="95vw"
      max-width="2200"
    >
      <v-card
        color="background"
        rounded="lg"
        class="mermaid-dialog-card"
      >
        <v-btn
          class="mermaid-close"
          icon
          size="small"
          variant="flat"
          color="background"
          @click="open = false"
        >
          <v-icon icon="i-mdi:close" />
        </v-btn>
        <div
          class="mermaid-viewport"
          :class="{ 'mermaid-viewport--zoomed': zoomed }"
        >
          <div
            class="mermaid-full"
            :class="{ 'mermaid-full--zoomed': zoomed }"
            @click="zoomed = !zoomed"
            v-html="svgHtml"
          />
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>
<script lang="ts" setup>
let show = ref(false);
const mermaidEl = ref<HTMLElement | null>(null)
const svgHtml = ref('')
const open = ref(false)
const zoomed = ref(false)

const { $mermaid } = useNuxtApp()

onMounted( async() => {
  show.value = true

  $mermaid().initialize({ startOnLoad: true })

  await nextTick()

  $mermaid().init({
    theme: 'forest',
    themeVariables: {
      lineColor: '#F8B229',
      secondaryColor: '#ec8d2a',
      tertiaryColor: '#004c6c'
    }
  })

})

const openIfReady = () => {
  const svg = mermaidEl.value?.querySelector('svg')
  if (!svg) return
  svgHtml.value = svg.outerHTML
  open.value = true
}

watch(open, (isOpen) => {
  if (!isOpen) zoomed.value = false
})
</script>
<style>
.mermaid:not([data-processed]) {
  color: transparent;
  min-height: 10px; /* Give it a minimum height so the observer can see it */
}
.mermaid {
  display: flex;
  justify-content: center;
}
pre:has(.mermaid) {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  max-width: 100%;
  cursor: zoom-in;
  transition: opacity 0.15s ease;
}
pre:has(.mermaid):hover {
  opacity: 0.88;
}

.mermaid-dialog-card {
  position: relative;
}

.mermaid-viewport {
  height: 50vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.mermaid-viewport--zoomed {
  display: block;
  overflow: auto;
}

.mermaid-full {
  cursor: zoom-in;
  padding: 8px;
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mermaid-full svg {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
}

.mermaid-full--zoomed {
  cursor: zoom-out;
  display: block;
  height: auto;
}

.mermaid-full--zoomed svg {
  transform: scale(2);
  transform-origin: top left;
}

.mermaid-close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  opacity: 0.9;
}
</style>
