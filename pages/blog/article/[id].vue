<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container class="text-center">
      <button-article class="my-4" />
      <page-title
        :title="article.title ?? $t('article.unknow')"
        icon="i-mdi:book-open-variant-outline"
      />
      <section class="py-12">
        <v-responsive class="text-left">
          <v-sheet
            class="d-flex align-center mx-auto py-2 px-3 mb-2 no-scroll"
            elevation="4"
            min-height="30"
            rounded
            color="background"
            width="100%"
          >
            <ClientOnly>
              <ContentRenderer
                v-if="article"
                class="w-100 ml-2"
                :value="article"
              />
            </ClientOnly>
          </v-sheet>
        </v-responsive>
      </section>
    </v-container>
  </v-row>
</template>
<script setup lang="ts">
const route = useRoute()
console.log(route.params.id)
const { data: article } = await useAsyncData('content-' + route.params.id, () => queryCollection('content')
  .where('article_id', '=', route.params.id)
  .first())
</script>