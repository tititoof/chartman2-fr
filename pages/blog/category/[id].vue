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
          v-if="articles"
          class="d-flex justify-space-around"
        >
          <v-col
            v-for="({ title, description, icon, color, article_id }, i) in articles"
            :key="i"
            cols="12"
            md="4"
          >
            <v-card
              v-aos="['animate__flipInX']"
              class="mx-auto"
              max-width="400"
              min-height="480"
              max-height="480"
              color="secondary-container"
              variant="outlined"
            >
              <v-icon
                size="280"
                :icon="icon"
                :color="color"
              />
              <v-card-title>
                <div class="font-weight-black text-uppercase text-secondary">
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
              <v-card-actions class="d-flex align-end">
                <v-btn
                  class="font-weight-black"
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
      </section>
    </v-container>
  </v-row>
</template>

<script setup lang="ts">
const route = useRoute()

const { data: articles } = await useAsyncData('home', () => queryContent()
  .where({
    _path: {
      $contains: '/articles/' + route.params.id
    }
  })
  .only(['_path', '_id', 'title', 'icon', 'description', 'color', 'article_id'])
  .find()
)
</script>