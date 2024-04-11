<template>
  <v-row class="d-flex justify-space-around">
    <v-col
      v-aos="['animate__fadeIn']"
      v-for="({ type, src, color, text, title, link }, i) in articles"
      :key="i"
      cols="12"
      md="4"
    >
      <v-card
        class="mx-auto"
        max-width="300"
        min-height="480"
        max-height="480"
        color="secondary-container"
      >
        <v-icon
          v-if="type === 'icon'"
          role="img"
          size="280"
          :icon="src"
          :color="color"
        />

        <v-img
          v-else
          color="primary"
          size="300"
          :image="src"
        />
        <v-card-title>
          <div class="font-weight-black text-uppercase">
            {{ title }}
          </div>
        </v-card-title>
        <v-card-text class="title font-weight-light mb-5">
          <v-sheet
            :height="30"
            color="secondary-container"
          >
            {{ text }}
          </v-sheet>
        </v-card-text>
        <v-card-actions class="d-flex align-end">
          <v-btn
            class="font-weight-black"
            color="info"
            :nuxt="true"
            :to="link"
            variant="outlined"
            block
          >
            <span class="font-weight-bold">
              Lire
            </span>
          </v-btn>
        </v-card-actions>
      </v-card>
      <div class="d-flex justify-center" />
    </v-col>
  </v-row>
</template>
<script setup>
const articles = reactive([
  {
    type: "icon",
    src: 'i-mdi:language-ruby',
    color: "red",
    title: "Ruby",
    text: "Articles autour du langage Ruby.",
    link: "/blog/category/ruby",
  },
  {
    type: "icon",
    src: 'i-mdi:language-javascript',
    color: "green",
    title: "Javascript",
    text: "Articles autour du langage Javascript.",
    link: "/blog/category/javascript",
  },
])
</script>
