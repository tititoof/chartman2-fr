<template>
  <v-container class="d-flex align-self-start py-12 article-page">
    <div class="text-center w-100 article-page">
      <button-article class="my-4" />
      <page-title
        :title="article?.title ?? $t('article.unknow')"
        icon="i-mdi:book-open-variant-outline"
      />
      <section class="py-12">
        <v-responsive v-if="isPublished" class="text-left">
          <v-expansion-panels
            v-if="tocLinks.length >= 3"
            class="mb-4"
          >
            <v-expansion-panel
              class="article-toc"
              bg-color="background"
            >
              <v-expansion-panel-title>
                <v-icon icon="i-mdi:format-list-bulleted" class="mr-2" />
                <span class="font-weight-bold">Sommaire</span>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <nav aria-label="Sommaire de l'article">
                  <ul class="toc-list">
                    <li v-for="link in tocLinks" :key="link.id">
                      <a :href="`#${link.id}`">{{ link.text }}</a>
                      <ul v-if="link.children?.length" class="toc-list">
                        <li v-for="child in link.children" :key="child.id">
                          <a :href="`#${child.id}`">{{ child.text }}</a>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </nav>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

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

          <nav
            v-if="previous || next"
            aria-label="Navigation entre les articles de la catégorie"
          >
            <v-row class="mt-6">
              <v-col cols="12" sm="6">
                <v-card
                  v-if="previous"
                  :to="`/blog/article/${previous.article_id}`"
                  variant="outlined"
                  color="primary"
                  class="article-nav h-100"
                >
                  <v-card-text>
                    <p class="text-caption text-medium-emphasis">
                      <v-icon icon="i-mdi:arrow-left" size="small" /> Article précédent
                    </p>
                    <p class="font-weight-bold">{{ previous.title }}</p>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" sm="6">
                <v-card
                  v-if="next"
                  :to="`/blog/article/${next.article_id}`"
                  variant="outlined"
                  color="primary"
                  class="article-nav h-100 text-right"
                >
                  <v-card-text>
                    <p class="text-caption text-medium-emphasis">
                      Article suivant <v-icon icon="i-mdi:arrow-right" size="small" />
                    </p>
                    <p class="font-weight-bold">{{ next.title }}</p>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </nav>
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
    </div>
  </v-container>
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

useSeoMeta({
  title: () => article.value?.title,
  description: () => article.value?.description,
  ogTitle: () => article.value?.title,
  ogDescription: () => article.value?.description,
  ogType: 'article',
})

const tocLinks = computed(() => article.value?.body?.toc?.links ?? [])

// Articles du même dossier, dans le même ordre que la page catégorie
const { applyPublishFilter } = useArticleQuery()
const categoryDir = computed(() => article.value?.stem?.split('/').slice(0, -1).join('/'))

const { data: siblings } = await useAsyncData('siblings-' + route.params.id, () =>
  applyPublishFilter(
    queryCollection('content')
      .where('stem', 'LIKE', `${categoryDir.value}/%`)
      .order('publishedAt', 'ASC')
  )
    .select('title', 'article_id')
    .all(),
  { watch: [categoryDir] }
)

const currentIndex = computed(() =>
  siblings.value?.findIndex(({ article_id }) => article_id === route.params.id) ?? -1
)
const previous = computed(() => currentIndex.value > 0 ? siblings.value![currentIndex.value - 1] : null)
const next = computed(() => {
  if (currentIndex.value < 0) return null
  return siblings.value?.[currentIndex.value + 1] ?? null
})
</script>

<style lang="css" scoped>
/* Empêche le contenu (tableaux, code) d'élargir la page au-delà de l'écran */
.article-page {
  min-width: 0;
}

.article-toc {
  border: 1px solid rgb(var(--v-theme-border));
}

.toc-list {
  list-style: none;
  padding-left: 1rem;
}

.toc-list a {
  color: rgb(var(--v-theme-info));
  text-decoration: none;
  line-height: 1.8;
}

.toc-list a:hover,
.toc-list a:focus-visible {
  text-decoration: underline;
}

.article-nav {
  border-color: rgb(var(--v-theme-border));
}

/* Évite que les titres ciblés par le sommaire passent sous la barre du haut */
:deep(:is(h2, h3, h4, h5, h6)[id]) {
  scroll-margin-top: 80px;
}
</style>