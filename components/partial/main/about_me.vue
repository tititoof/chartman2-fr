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
      Je suis passionné de judo et d'informatique depuis tout petit, curieux de
      nature, j'adore découvrir et apprendre.<br>
      Je suis tombé amoureux de Ruby à travers son framework
      <v-btn
        variant="plain"
        class="text-decoration-none font-italic mx-0 px-0"
        @click="useScroll('features')"
      >
        Ruby on Rails
      </v-btn>
      <br>
      Ce langage me sert pour gérer les données (backend). Côté utilisateur
      (frontend), VueJS avec le framework
      <v-btn
        variant="plain"
        class="text-decoration-none font-italic mx-0 px-0"
        @click="useScroll('features')"
      >
        NuxtJS
      </v-btn>
      (simple rapide et efficace) m'a redonné le goût du JavaScript.<br>
      Afin de comprendre le
      <v-btn
        variant="plain"
        class="text-decoration-none font-italic mx-0 px-0"
        @click="useScroll('features')"
      >
        CI / CD
      </v-btn>, j'ai mis en place le mien avec Gitea, Jenkins, SonarQube et
      Openproject.<br>
      Devenu professeur de judo, j'applique ce que m'ont transmis mes senseïs
      dans mon travail et mes cours de Judo. Une question ? envoyez moi un
      message
      <v-btn
        variant="plain"
        class="text-decoration-none font-italic mx-0 px-0"
        @click="useScroll('contact-me')"
      >
        message
      </v-btn>
    </v-responsive>

    <v-avatar
      class="elevation-12 mb-12"
      size="128"
    >
      <v-img src="/img/head.png" />
    </v-avatar>
  </v-container>
</template>