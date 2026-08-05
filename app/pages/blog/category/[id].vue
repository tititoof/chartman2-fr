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
              class="mx-auto d-flex flex-column"
              max-width="400"
              min-height="480"
              max-height="480"
              color="secondary-container"
              variant="outlined"
              rounded="xl"
            >
              <v-icon
                role="img"
                class="mx-auto"
                size="280"
                :icon="icon"
                :color="color"
              />
              <v-card-title>
                <div class="font-weight-black text-uppercase text-secondary text-wrap ">
                  {{ title }}
                </div>
              </v-card-title>
              <v-card-text class="title font-weight-light mb-5">
                <v-sheet
                  :height="30"
                  color="background"
                >
                  {{ description }}
                </v-sheet>
              </v-card-text>
              <v-card-actions class="mt-auto">
                <v-btn
                  class="font-weight-black mt-2"
                  color="info"
                  :nuxt="true"
                  :to="`/blog/article/` + article_id"
                  variant="outlined"
                  block
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