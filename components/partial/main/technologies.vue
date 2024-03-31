<template>
  <section id="stats">
    <v-parallax
      :height="!applicationStore.getIsPhone ? 500 : ''"
      src="https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1950&q=80"
    >
      <v-container>
        <v-row class="d-flex justify-space-evenly ">
          <v-col
            v-for="{ value, title, url } of stats"
            :key="title"
            cols="6"
            md="3"
            class="text-center"
          >
            <div
              class="text-h3 text-white font-weight-black mb-4 pt-6 justify-center"
            >
              {{ value }}
              <v-icon
                color="yellow"
                :size="applicationStore.getIsPhone ? 12 : 24"
                icon="i-mdi:star"
              />
            </div>

            <v-btn
              color="white"
              :href="url"
              outlined
              large
              target="_blank"
              variant="outlined"
            >
              <span class="white-text text-darken-1 font-weight-bold">
                {{ title }}
              </span>
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-parallax>
  </section>
</template>
<script setup>
import { useApplicationStore } from '~/stores/application'

const applicationStore = useApplicationStore()
const stats = reactive([
  {
    value: '199k+',
    title: 'VueJS',
    url: 'https://github.com/vuejs/vue',
  },
  {
    value: '41k+',
    title: 'NuxtJS',
    url: 'https://github.com/nuxt/nuxt.js/',
  },
  {
    value: '19k+',
    title: 'Ruby',
    url: 'https://github.com/ruby/ruby',
  },
  {
    value: '51k+',
    title: 'Ruby on Rails',
    url: 'https://github.com/rails/rails',
  },
  {
    value: '72k+',
    title: 'Laravel',
    url: 'https://github.com/laravel/laravel',
  },
  {
    value: '28k+',
    title: 'Symfony',
    url: 'https://github.com/symfony/symfony',
  },
])
</script>
