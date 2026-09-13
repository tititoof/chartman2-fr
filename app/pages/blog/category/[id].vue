<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container>
      <button-article class="my-4" />

      <page-title
        :title="$t('articles.title')"
        icon="i-mdi:book-open-variant-outline"
      />
      <section class="py-12">
        <v-row
          v-if="articles && articles.length > 0"
          class="d-flex justify-space-around text-center"
        >
          <v-col
            v-for="({ title, description, icon, color, article_id }, i) in articles"
            :key="i"
            cols="12"
            md="4"
          >
            <v-card
              v-aos="['animate__flipInX']"
              class="mx-auto d-flex flex-column article-card"
              max-width="400"
              height="340"
              color="article-card"
              variant="flat"
            >
              <v-icon
                role="img"
                class="mx-auto mt-2"
                size="88"
                :icon="icon"
                :color="color"
              />
              <p class="article-card-cat text-wrap">
                {{ title }}
              </p>
              <p class="article-card-desc description-scroll">
                {{ description }}
              </p>
              <v-card-actions class="mt-auto justify-center">
                <v-btn
                  class="font-weight-black mt-2 btn-lire btn-outline-hover-fill"
                  color="primary"
                  variant="outlined"
                  rounded="lg"
                  size="large"
                  min-width="180"
                  append-icon="i-mdi:arrow-right"
                  :nuxt="true"
                  :to="`/blog/article/` + article_id"
                >
                  <span class="font-weight-bold">
                    Lire
                  </span>
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
        <v-row v-else class="d-flex justify-center text-center py-8">
          <v-col cols="12" sm="8" md="5">
            <v-card
              flat
              color="transparent"
              class="d-flex flex-column align-center pa-8"
            >
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
                Les articles de cette catégorie sont en cours de rédaction.<br>
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
const { applyPublishFilter } = useArticleQuery()
const route = useRoute()

const { data: articles } = await useAsyncData('content', () =>
  applyPublishFilter(
    queryCollection(route.params.id as string).order('publishedAt', 'ASC')
  ).all()
)
</script>

<style lang="css" scoped>
.article-card {
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 20px;
  padding: 28px 22px;
}

.article-card-cat {
  color: rgb(var(--v-theme-secondary));
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  text-align: center;
  margin: 14px 0 10px;
  white-space: normal;
  overflow-wrap: break-word;
}

.article-card-desc {
  color: rgb(var(--v-theme-muted));
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
  margin: 0 0 18px;
}

.description-scroll {
  max-height: 96px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.description-scroll::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.btn-lire {
  transition: background-color 0.15s ease, color 0.15s ease;
}

.btn-lire:hover {
  background-color: rgb(var(--v-theme-primary)) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
}

.btn-lire:hover :deep(.v-icon) {
  color: rgb(var(--v-theme-on-primary)) !important;
}
</style>