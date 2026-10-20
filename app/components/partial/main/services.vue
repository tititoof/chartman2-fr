<template>
  <section
    id="services"
    class="py-12"
  >
    <v-container class="text-center">
      <section-title
        eyebrow="Offre"
        title="Ce que je peux faire pour vous"
      />

      <v-row class="justify-center">
        <v-col
          v-for="{ icon, title, text, stack } in services"
          :key="title"
          cols="12"
          md="4"
        >
          <v-icon
            :icon="icon"
            color="primary"
            size="36"
            class="mb-3"
          />
          <h3 class="service-title mb-2">
            {{ title }}
          </h3>
          <p class="service-text mb-3">
            {{ text }}
          </p>
          <div class="d-flex flex-wrap justify-center ga-2">
            <v-chip
              v-for="tech in stack"
              :key="tech"
              size="small"
              variant="tonal"
            >
              {{ tech }}
            </v-chip>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script lang="ts" setup>
const services = [
  {
    icon: 'i-mdi:code-braces',
    title: 'Développement d\'applications',
    text: 'Création ou reprise d\'applications web, API et interfaces, avec un code testé et maintenable.',
    stack: ['Ruby on Rails', 'Vue.js / Nuxt', 'PHP'],
  },
  {
    icon: 'i-mdi:rocket-launch-outline',
    title: 'Industrialisation CI/CD',
    text: 'Pipelines de build, tests et déploiement, Quality Gate et conteneurisation de vos projets.',
    stack: ['Docker', 'Jenkins', 'SonarQube'],
  },
  {
    icon: 'i-mdi:server-network',
    title: 'Infrastructure auto-hébergée',
    text: 'Mise en place d\'outils auto-hébergés et souverains : forge, gestion de projet, IA locale.',
    stack: ['Traefik', 'Forgejo', 'Ollama'],
  },
]
</script>

<style lang="css" scoped>
.service-title {
  font-size: 1.1rem;
  font-weight: 700;
}

.service-text {
  color: rgb(var(--v-theme-muted));
  font-size: 14px;
  line-height: 1.6;
  max-width: 320px;
  margin-inline: auto;
}
</style>
