<template>
  <section
    id="realisations"
    class="py-12"
  >
    <v-container class="text-center">
      <section-title
        eyebrow="Réalisations"
        title="Ce que je construis et fais tourner"
      />

      <v-row class="text-left">
        <v-col
          v-for="({ icon, title, problem, solution, result, article_id }, i) in cases"
          :key="article_id"
          cols="12"
          md="4"
        >
          <v-card
            v-aos="['animate__fadeInUp']"
            :data-aos-delay="`0.${i + 1}s`"
            class="case-card h-100 d-flex flex-column"
            color="article-card"
            variant="flat"
          >
            <v-icon
              :icon="icon"
              color="primary"
              size="40"
              class="mb-4"
            />
            <h3 class="case-title mb-4">
              {{ title }}
            </h3>

            <dl class="case-steps mb-4">
              <dt>Le besoin</dt>
              <dd>{{ problem }}</dd>
              <dt>Ce que j'ai fait</dt>
              <dd>{{ solution }}</dd>
              <dt>Le résultat</dt>
              <dd>{{ result }}</dd>
            </dl>

            <v-btn
              class="mt-auto align-self-start btn-outline-hover-fill"
              color="primary"
              variant="outlined"
              rounded="lg"
              append-icon="i-mdi:arrow-right"
              :to="`/blog/article/${article_id}`"
            >
              Lire le retour d'expérience
            </v-btn>
          </v-card>
        </v-col>
      </v-row>

      <v-btn
        class="mt-8"
        variant="text"
        color="primary"
        append-icon="i-mdi:arrow-right"
        to="/articles"
      >
        Tous les articles du blog
      </v-btn>
    </v-container>
  </section>
</template>

<script lang="ts" setup>
const cases = [
  {
    icon: 'i-mdi:source-branch-check',
    title: 'Chaîne CI/CD complète auto-hébergée',
    problem: 'Livrer souvent sans régression, sans dépendre d\'une plateforme SaaS.',
    solution: 'Forgejo, Jenkins, SonarQube et OpenProject reliés : un push déclenche les tests, le Quality Gate et le suivi du ticket.',
    result: 'Chaque changement est vérifié automatiquement avant d\'arriver en production.',
    article_id: '14-docker-demo-cicd',
  },
  {
    icon: 'i-mdi:robot-outline',
    title: 'IA locale branchée sur l\'outillage',
    problem: 'Profiter des LLM sans envoyer son code ni ses données dans le cloud.',
    solution: 'Ollama et des serveurs MCP connectés à la forge, la CI, la qualité et la gestion de projet.',
    result: 'Un assistant qui agit sur l\'infrastructure réelle, avec des données qui ne quittent jamais votre infrastructure.',
    article_id: 'mcp-infra-etat-des-lieux',
  },
  {
    icon: 'i-mdi:layers-triple-outline',
    title: 'Application full-stack Nuxt 4 + Rails 8',
    problem: 'Poser une base d\'application saine, de l\'API à l\'interface.',
    solution: 'Architecture, authentification, API Rails et front Nuxt, documentés étape par étape.',
    result: 'Une série de référence, du premier commit à l\'intégration complète.',
    article_id: '0-to-do-list-architecture',
  },
]
</script>

<style lang="css" scoped>
.case-card {
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 20px;
  padding: 28px 24px;
}

.case-title {
  font-size: 1.15rem;
  font-weight: 700;
}

.case-steps dt {
  color: rgb(var(--v-theme-secondary));
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.case-steps dd {
  color: rgb(var(--v-theme-muted));
  font-size: 14px;
  line-height: 1.5;
  margin: 2px 0 12px;
}
</style>
