<template>
    <v-row class="d-flex justify-space-around text-center">
    <v-col
      v-for="({ type, src, color, text, title, link }, i) in articles"
      :key="i"
      v-aos="['animate__fadeIn']"
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
          v-if="type === 'icon'"
          class="mx-auto mt-2"
          role="img"
          size="88"
          :icon="src"
          :color="color"
        />

        <v-img
          v-else
          class="mx-auto mt-2"
          color="primary"
          size="88"
          :image="src"
        />
        <p class="article-card-cat text-wrap">
          {{ title }}
        </p>
        <p class="article-card-desc description-scroll">
          {{ text }}
        </p>
        <v-card-actions class="mt-auto justify-center">
          <v-btn
            class="font-weight-black btn-lire"
            color="primary"
            variant="outlined"
            rounded="lg"
            size="large"
            min-width="180"
            append-icon="i-mdi:arrow-right"
            :nuxt="true"
            :to="link"
          >
            <span class="font-weight-bold">
              Lire
            </span>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
const articles = reactive([
  {
    type: 'icon',
    src: 'i-mdi:language-ruby',
    color: 'red',
    title: 'Ruby',
    text: 'Ruby & Ruby on Rails.',
    link: '/blog/category/ror',
  },
  {
    type: 'icon',
    src: 'i-mdi:nuxt',
    color: 'green',
    title: 'Nuxt',
    text: 'Framework Nuxt, Vuetify',
    link: '/blog/category/nuxt',
  },
  {
    type: 'icon',
    src: 'i-mdi:language-php',
    color: 'secondary',
    title: 'PHP',
    text: 'Articles autour de PHP.',
    link: '/blog/category/php',
  },
  {
    type: 'icon',
    src: 'i-mdi:docker',
    color: 'blue',
    title: 'Docker',
    text: 'Conteneurisation, Traefik, CI/CD et infrastructure 100% self-hosted.',
    link: '/blog/category/docker',
  },
  {
    type: 'icon',
    src: 'i-mdi:checkbox-marked-circle-plus-outline',
    color: 'secondary',
    title: 'To-do list',
    text: 'Projet full-stack Nuxt 4 + Rails 8 : authentification BFF, API REST et tests.',
    link: '/blog/category/todolist',
  },
  {
    type: 'icon',
    src: 'i-mdi:shield-home',
    color: 'teal',
    title: 'Self-Hosted',
    text: 'Divers services que l\'on peut auto-héberger.',
    link: '/blog/category/selfhosted',
  },
])
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
  word-break: break-word;
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