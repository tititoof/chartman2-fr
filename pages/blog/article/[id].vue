<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container class="text-center">
      <button-article class="my-4" />
      <page-title
        :title="article?.title ?? $t('article.unknow')"
        icon="i-mdi:book-open-variant-outline"
      />
      <section class="py-12">
        <v-responsive v-if="isPublished" class="text-left">
          <v-sheet
            class="d-flex align-center mx-auto py-2 px-3 mb-2 no-scroll"
            elevation="4"
            min-height="30"
            rounded
            color="background"
            width="100%"
            style="overflow-x: hidden; max-width: 100vw;"
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

        <v-row v-else class="d-flex justify-center text-center py-8">
          <v-col cols="12" sm="8" md="5">
            <v-card flat color="transparent" class="d-flex flex-column align-center pa-8">
              <v-icon
                icon="i-mdi:rocket-launch-outline"
                size="120"
                color="primary"
                class="mb-6"
                style="opacity: 0.4;"
              />
              <p class="text-h5 font-weight-bold text-secondary mb-3">
                À venir bientôt
              </p>
              <p class="text-body-1 text-medium-emphasis">
                Cet article est en cours de rédaction.<br>
                Revenez prochainement !
              </p>
            </v-card>
          </v-col>
        </v-row>
      </section>
    </v-container>
  </v-row>
</template>
<script setup lang="ts">
const route = useRoute()

const { data: article } = await useAsyncData('content-' + route.params.id, () => queryCollection('content')
  .where('article_id', '=', route.params.id)
  .first())

const today = new Date().toISOString().split('T')[0]

const isPublished = computed(() => {
  if (!article.value) return false
  if (process.dev) return true                          // dev → tout visible
  if (article.value.draft) return false                 // brouillon → caché
  if (!article.value.publishedAt) return true           // pas de date → visible
  return article.value.publishedAt <= today             // date passée → visible
})
</script>