<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container class="text-center">
      <button-article />
  
      <page-title
        class="py-12"
        :title="article.title"
        icon="i-mdi:book-open-variant-outline"
      />
      <v-responsive class="text-left">
        <v-sheet
          class="d-flex align-center mx-auto py-2 px-3 mb-2"
          elevation="4"
          min-height="30"
          rounded
          color="on-primary-container"
          width="100%"
        >
            <!DOCTYPE html>
            <html
              :class="storeThemeDark === false ? 'light' : 'dark'"
              style="overflow-y: initial"
              lang="fr"
              xml:lang="fr"
            >
              <ContentDoc
                :path="article._path"
                unwrap="p"
                style="width: 85vw;overflow-x: auto; white-space: nowrap"
              />
            </html>
        </v-sheet>
      </v-responsive>
    </v-container>
  </v-row>
</template>
<script setup lang="ts">
import { useApplicationStore } from '~/stores/application'

const route = useRoute()
const applicationStore = useApplicationStore()
const storeThemeDark = computed(() => applicationStore.isDarkTheme)
const { data: article } = await useAsyncData('home', () => queryContent()
  .where({
    article_id: route.params.id
  })
  .only(['_path', 'title'])
  .findOne())
</script>