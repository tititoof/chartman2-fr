<template>
  <section id="articles">
    <v-container class="text-center py-12">
      <section-title title="Articles" />
      <articles-categories />
    </v-container>

    <div class="py-12" />
  </section>
</template>

<script lang="ts" setup>
const emit = defineEmits(['addLoading', 'removeLoading'])

onBeforeMount(() => {
  emit('addLoading')
})

onMounted(() => {
  emit('removeLoading')
})
</script>