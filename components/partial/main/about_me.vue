<template>
  <v-container
    id="about-me"
    class="text-center py-12"
  >
    <section-title title="A propos de moi" />

    <v-responsive
      class="mx-auto title font-weight-light mb-8"
      max-width="720"
    >
      Bonjour ! <br>
      Je m'appelle Christophe Hartmann,<br>
      Développeur passionné depuis l'enfance, j'aide les équipes à construire des applications solides et des infrastructures qui ne lâchent pas.<br>
      Mon terrain de jeu : 
      <v-btn
        variant="plain"
        class="text-decoration-none font-italic mx-0 px-0"
        @click="useScroll('features')"
      >
        Ruby on Rails 
      </v-btn>
      pour la solidité du backend,
      <br>
      <v-btn
        variant="plain"
        class="text-decoration-none font-italic mx-0 px-0"
        @click="useScroll('features')"
      >
        Vue.js / Nuxt
      </v-btn> pour des interfaces fluides, et
      <v-btn
        variant="plain"
        class="text-decoration-none font-italic mx-0 px-0"
        @click="useScroll('features')"
      >
        Docker
      </v-btn>
      <v-btn
        variant="plain"
        class="text-decoration-none font-italic mx-0 px-0"
        @click="useScroll('features')"
      >
        CI / CD
      </v-btn>, pour que tout ça tourne sans accroc en production.<br>
      J'ai monté ma propre infrastructure DevOps — Forgejo, Jenkins, SonarQube, OpenProject — pas par obligation,
      mais parce que comprendre les outils de l'intérieur change tout à la façon dont on les utilise.<br>
      Judoka depuis toujours, j'apporte sur chaque mission ce que le tatami m'a appris : rigueur, écoute, et l'humilité de toujours progresser.
      Une question ? Un projet ? envoyez moi un
      <v-btn
        variant="plain"
        class="text-decoration-none font-italic mx-0 px-0"
        @click="useScroll('contact-me')"
      >
        message
      </v-btn>
    </v-responsive>

    <v-avatar
      v-aos="['animate__fadeInDown']"
      class="elevation-12 mb-12"
      size="128"
    >
      <v-img src="/img/visage.webp" />
    </v-avatar>
  </v-container>
</template>

<script lang="ts" setup>
const emit = defineEmits(['addLoading', 'removeLoading'])

onBeforeMount(() => {
  emit('addLoading')
})

onMounted(() => {
  emit('removeLoading')
})
</script>
