<template>
  <pre>
    <code class="mermaid" v-if="show">
      <slot />
    </code>
  </pre>
</template>
<script lang="ts" setup>
let show = ref(false);

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
</style>