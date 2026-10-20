<template>
  <section
    id="hero"
    class="hero"
  >
    <v-container class="text-center hero-inner">
      <p class="hero-eyebrow mb-4">
        Freelance · Architecte DevOps / DevSecOps · Automatisation & IA
      </p>

      <h1 class="hero-title mb-6">
        Du code à la production, sans accroc.
      </h1>

      <p class="hero-subtitle mx-auto mb-8">
        J'accompagne les équipes techniques, startups et PME pour concevoir des applications maintenables et industrialiser leur livraison :
        CI/CD, qualité de code, infrastructure auto-hébergée et souveraine.
      </p>

      <div class="d-flex flex-wrap justify-center ga-4 mb-8">
        <v-btn
          color="primary"
          size="large"
          rounded="lg"
          prepend-icon="i-mdi:email-outline"
          @click="useScroll('contact-me')"
        >
          Parlons de votre projet
        </v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          size="large"
          rounded="lg"
          class="btn-outline-hover-fill"
          prepend-icon="i-mdi:briefcase-outline"
          @click="useScroll('realisations')"
        >
          Voir mes réalisations
        </v-btn>
      </div>

      <v-chip
        class="hero-availability"
        variant="outlined"
        color="success"
        prepend-icon="i-mdi:circle-medium"
      >
        Ouvert aux missions freelance — et aux opportunités salariées
      </v-chip>
    </v-container>
  </section>
</template>

<style lang="css" scoped>
.hero {
  border-bottom: 1px solid rgb(var(--v-theme-border));
}

.hero-inner {
  max-width: 880px;
  padding-top: 96px;
  padding-bottom: 72px;
}

.hero-eyebrow {
  color: rgb(var(--v-theme-secondary));
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.hero-title {
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 800;
  line-height: 1.15;
}

.hero-availability {
  white-space: normal;
  height: auto;
  padding-block: 6px;
}

.hero-subtitle {
  color: rgb(var(--v-theme-muted));
  font-size: var(--text-lg);
  max-width: 640px;
}
</style>
