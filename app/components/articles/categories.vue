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
        class="mx-auto d-flex flex-column article-card h-100"
        max-width="400"
        min-height="340"
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
        <p class="article-card-desc">
          {{ text }}
        </p>
        <v-card-actions class="mt-auto justify-center">
          <v-btn
            class="font-weight-black btn-lire btn-outline-hover-fill"
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
const articles = categories.map(({ slug, icon, color, title, text }) => ({
  type: 'icon',
  src: icon,
  color,
  title,
  text,
  link: `/blog/category/${slug}`,
}))
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
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
