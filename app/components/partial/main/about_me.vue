<template>
  <v-container
    id="about-me"
    class="text-center py-12"
  >
    <section-title
      eyebrow="À propos de moi"
      title=""
    />

    <v-responsive
      class="mx-auto about-me-text mb-8"
      max-width="720"
    >
      <p>
        Bonjour, je m'appelle Christophe Hartmann. Développeur passionné depuis l'enfance,
        j'aide les équipes à concevoir des applications solides et des infrastructures qui
        tiennent la charge.
      </p>

      <p>
        Mon terrain de jeu :
        <v-btn
          variant="plain"
          class="about-me-link"
          @click="useScroll('features')"
        >
          Ruby on Rails
        </v-btn>
        pour la solidité du backend,
        <v-btn
          variant="plain"
          class="about-me-link"
          @click="useScroll('features')"
        >
          Vue.js / Nuxt
        </v-btn>
        pour des interfaces fluides, et
        <v-btn
          variant="plain"
          class="about-me-link"
          @click="useScroll('features')"
        >
          Docker
        </v-btn>
        /
        <v-btn
          variant="plain"
          class="about-me-link"
          @click="useScroll('features')"
        >
          CI/CD
        </v-btn>
        pour que tout tourne sans accroc en production.
      </p>

      <p>
        J'ai monté ma propre infrastructure DevOps — Forgejo, Jenkins, SonarQube, OpenProject —
        non par obligation, mais parce que comprendre les outils de l'intérieur change la façon
        dont on les utilise.
      </p>

      <p>
        Judoka depuis toujours, j'apporte sur chaque mission ce que le tatami m'a enseigné :
        rigueur, écoute et l'humilité de progresser sans cesse.
      </p>

      <p class="mb-0">
        Une question, un projet ? Envoyez-moi un
        <v-btn
          variant="plain"
          class="about-me-link"
          @click="useScroll('contact-me')"
        >
          message
        </v-btn>.
      </p>
    </v-responsive>

    <v-avatar
      v-aos="['animate__fadeInDown']"
      class="elevation-12 mb-8"
      size="128"
    >
      <v-img src="/img/visage.webp" />
    </v-avatar>

    <div>
      <v-btn
        variant="outlined"
        color="primary"
        prepend-icon="i-mdi:file-account-outline"
        to="/cv"
      >
        Voir mon CV
      </v-btn>
    </div>
  </v-container>
</template>

<script lang="ts" setup>
const emit = defineEmits(['addLoading', 'removeLoading'])

onBeforeMount(() => {
  emit('addLoading')
})

onMounted(async () => {
  await preloadImage('/img/visage.webp')
  emit('removeLoading')
})
</script>

<style lang="css" scoped>
.about-me-text {
  font-size: var(--text-lg);
  font-weight: 300;
  line-height: 1.6;
  text-align: center;
}

.about-me-text p {
  margin: 0 0 16px;
}

.about-me-link {
  color: rgb(var(--v-theme-primary));
  background-color: rgb(var(--v-theme-primary-container));
  font-weight: 600;
  font-size: 0.85em;
  text-decoration: none;
  text-transform: none;
  letter-spacing: normal;
  border-radius: 999px;
  height: auto !important;
  min-width: 0 !important;
  padding: 1px 10px !important;
  margin: 0 2px;
  vertical-align: middle;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.about-me-link :deep(.v-btn__content) {
  text-transform: none;
}

.about-me-link:hover {
  background-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  text-decoration: underline;
}
</style>
