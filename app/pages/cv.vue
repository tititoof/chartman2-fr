<template>
  <v-container class="cv-page align-self-start py-8 py-md-12">
    <button-article class="my-4" />

    <page-title
      :title="$t('cv.title')"
      icon="i-mdi:file-account-outline"
    />

    <v-card class="cv-intro mt-8 mb-12" rounded="xl" elevation="0">
      <v-row align="center" class="pa-6 pa-md-10" :no-gutters="true">
        <v-col cols="12" md="3" class="text-center mb-6 mb-md-0">
          <v-avatar size="160" class="cv-portrait">
            <v-img src="/img/visage.webp" alt="Christophe Hartmann" />
          </v-avatar>
        </v-col>
        <v-col cols="12" md="9">
          <p class="cv-eyebrow mb-2">Développeur web full-stack & DevOps freelance</p>
          <h1 class="cv-name mb-2">Christophe Hartmann</h1>
          <p class="cv-role mb-5">Architecte DevOps / DevSecOps — automatisation & IA</p>
          <p class="cv-summary mb-6">
            Plus de 20 ans d’expérience en conception d’applications métier et en industrialisation.
            J’accompagne les PME du développement au déploiement, avec une approche orientée
            automatisation, open source et maîtrise de l’infrastructure. J’intègre aussi les usages
            de l’IA — agents, MCP et modèles locaux — en les traitant comme des services à sécuriser.
          </p>

          <div class="d-flex flex-wrap ga-3">
            <v-btn color="primary" rounded="lg" prepend-icon="i-mdi:email-outline" href="mailto:contact@chartman2-fr.ovh">
              Me contacter
            </v-btn>
            <v-btn color="primary" variant="outlined" rounded="lg" prepend-icon="i-mdi:eye-outline" href="/cv-christophe-hartmann.pdf" target="_blank">
              Voir le CV PDF
            </v-btn>
            <v-btn color="primary" variant="text" rounded="lg" prepend-icon="i-mdi:download-outline" href="/cv-christophe-hartmann.pdf" download>
              Télécharger
            </v-btn>
          </div>
        </v-col>
      </v-row>
      <v-divider />
      <div class="cv-contact d-flex flex-wrap justify-center ga-3 ga-md-8 px-5 py-4">
        <a href="tel:+33665711975"><v-icon icon="i-mdi:phone-outline" /> 06 65 71 19 75</a>
        <a href="mailto:contact@chartman2-fr.ovh"><v-icon icon="i-mdi:email-outline" /> contact@chartman2-fr.ovh</a>
        <a href="https://www.linkedin.com/in/christophe-hartmann-3a297a42/" target="_blank" rel="noreferrer"><v-icon icon="i-mdi:linkedin" /> LinkedIn</a>
        <a href="https://github.com/tititoof" target="_blank" rel="noreferrer"><v-icon icon="i-mdi:github" /> GitHub</a>
      </div>
    </v-card>

    <section class="cv-section mb-12" aria-labelledby="skills-title">
      <div class="cv-section-heading mb-5">
        <p class="cv-eyebrow">Savoir-faire</p>
        <h2 id="skills-title">Compétences</h2>
      </div>
      <v-row>
        <v-col v-for="group in skillGroups" :key="group.title" cols="12" md="4">
          <v-card class="cv-skill-card h-100 pa-5" rounded="xl" elevation="0">
            <v-icon :icon="group.icon" color="primary" size="28" class="mb-3" />
            <h3 class="text-h6 font-weight-bold mb-3">{{ group.title }}</h3>
            <div class="d-flex flex-wrap ga-2">
              <v-chip v-for="skill in group.skills" :key="skill" size="small" variant="tonal" color="primary">
                {{ skill }}
              </v-chip>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <section class="cv-section mb-12" aria-labelledby="experience-title">
      <div class="cv-section-heading mb-5">
        <p class="cv-eyebrow">Parcours</p>
        <h2 id="experience-title">Expériences professionnelles</h2>
      </div>
      <div class="cv-timeline">
        <article v-for="job in experiences" :key="job.company" class="cv-job">
          <div class="cv-job-marker"><v-icon :icon="job.icon" size="18" /></div>
          <v-card class="cv-job-card pa-5 pa-md-6" rounded="xl" elevation="0">
            <div class="d-flex flex-wrap align-start justify-space-between ga-2 mb-3">
              <div>
                <h3 class="text-h6 font-weight-bold">{{ job.role }}</h3>
                <p class="text-primary font-weight-medium mb-0">{{ job.company }} <span class="text-medium-emphasis">· {{ job.place }}</span></p>
              </div>
              <v-chip size="small" color="secondary" variant="tonal">{{ job.period }}</v-chip>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ job.description }}</p>
          </v-card>
        </article>
      </div>
    </section>

    <section class="cv-section mb-12" aria-labelledby="projects-title">
      <div class="cv-section-heading mb-5">
        <p class="cv-eyebrow">Concret</p>
        <h2 id="projects-title">Démonstrateurs & publications</h2>
      </div>
      <v-row>
        <v-col v-for="project in projects" :key="project.title" cols="12" md="4">
          <v-card class="cv-project-card h-100 pa-5" rounded="xl" elevation="0">
            <v-icon :icon="project.icon" color="secondary" size="30" class="mb-3" />
            <h3 class="text-h6 font-weight-bold mb-2">{{ project.title }}</h3>
            <p class="text-body-2 text-medium-emphasis mb-4">{{ project.description }}</p>
            <v-btn :href="project.href" target="_blank" rel="noreferrer" variant="text" color="primary" append-icon="i-mdi:arrow-top-right">
              Découvrir
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <v-row class="mb-12">
      <v-col cols="12" md="6">
        <section class="cv-section h-100" aria-labelledby="education-title">
          <div class="cv-section-heading mb-5">
            <p class="cv-eyebrow">Bases & apprentissage continu</p>
            <h2 id="education-title">Formation & certifications</h2>
          </div>
          <v-card class="cv-detail-card pa-5" rounded="xl" elevation="0">
            <div v-for="item in education" :key="item.title" class="cv-detail-item">
              <p class="font-weight-bold mb-1">{{ item.title }}</p>
              <p class="text-body-2 text-medium-emphasis mb-0">{{ item.detail }}</p>
            </div>
          </v-card>
        </section>
      </v-col>
      <v-col cols="12" md="6">
        <section class="cv-section h-100" aria-labelledby="approach-title">
          <div class="cv-section-heading mb-5">
            <p class="cv-eyebrow">Ma façon de travailler</p>
            <h2 id="approach-title">Une approche de bout en bout</h2>
          </div>
          <v-card class="cv-detail-card pa-5" rounded="xl" elevation="0">
            <div v-for="step in approach" :key="step.title" class="d-flex ga-3 mb-4">
              <v-icon :icon="step.icon" color="primary" class="mt-1" />
              <div>
                <p class="font-weight-bold mb-1">{{ step.title }}</p>
                <p class="text-body-2 text-medium-emphasis mb-0">{{ step.description }}</p>
              </div>
            </div>
            <div class="d-flex flex-wrap ga-2 mt-5">
              <v-chip v-for="language in languages" :key="language" size="small" variant="outlined">{{ language }}</v-chip>
            </div>
          </v-card>
        </section>
      </v-col>
    </v-row>

    <v-card class="cv-cta pa-6 pa-md-8 text-center" rounded="xl" elevation="0">
      <v-icon icon="i-mdi:handshake-outline" color="primary" size="36" class="mb-2" />
      <h2 class="text-h5 font-weight-bold mb-2">Un projet à faire avancer ?</h2>
      <p class="text-body-1 text-medium-emphasis mb-5">Parlons de vos besoins en développement, DevOps ou automatisation.</p>
      <v-btn color="primary" size="large" rounded="lg" prepend-icon="i-mdi:email-outline" href="mailto:contact@chartman2-fr.ovh">Échanger sur votre projet</v-btn>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'CV — Christophe Hartmann',
  description: 'Développeur web full-stack et DevOps freelance : parcours, compétences, projets et certifications.',
  ogTitle: 'CV — Christophe Hartmann',
  ogDescription: 'Développeur web full-stack et DevOps freelance : parcours, compétences, projets et certifications.',
})

const skillGroups = [
  { title: 'Développement', icon: 'i-mdi:code-braces', skills: ['Ruby on Rails', 'Laravel', 'Symfony', 'Nuxt.js', 'Vue.js', 'PostgreSQL', 'MySQL'] },
  { title: 'DevOps & infrastructure', icon: 'i-mdi:cloud-cog-outline', skills: ['Docker', 'Traefik', 'Portainer', 'Forgejo / Git', 'Jenkins', 'SonarQube', 'Coolify', 'CI/CD'] },
  { title: 'Méthodes & IA', icon: 'i-mdi:brain', skills: ['OpenProject', 'Redmine', 'Agile', 'Kanban', 'Scrum', 'Agents IA', 'MCP', 'Ollama', 'n8n'] },
]

const experiences = [
  { company: 'AXN Informatique', role: 'Développeur Web & Référent DevOps', place: 'Saint-Avertin', period: 'Oct. 2023 – aujourd’hui', icon: 'i-mdi:cloud-cog-outline', description: 'Conception et déploiement d’une infrastructure Docker standardisée, automatisée par scripts Bash. Gestion du backlog Redmine et mise en place d’outils d’IA (skills, agents, hooks) pour optimiser le développement.' },
  { company: 'SAS Judo', role: 'Enseignant de Judo & Entraîneur', place: 'Saint-Avertin', period: 'Janv. 2019 – aujourd’hui', icon: 'i-mdi:karate', description: 'Enseignement et accompagnement des pratiquants au sein du club.' },
  { company: 'SupInfo', role: 'Intervenant PHP & Symfony', place: 'Tours', period: '2026', icon: 'i-mdi:school-outline', description: 'Conception et animation de formations sur l’écosystème PHP, évaluation de projets étudiants et participation aux jurys.' },
  { company: 'Vermon', role: 'Développeur Web & Administrateur Systèmes', place: 'Tours', period: 'Oct. 2013 – juin 2022', icon: 'i-mdi:server', description: 'Conception et maintenance évolutive du système d’information. Refonte de l’architecture serveur et migration vers Linux pour améliorer la stabilité et la sécurité. Encadrement technique et revues de code.' },
]

const projects = [
  { title: 'DevOps self-hosted', icon: 'i-mdi:server-network', description: 'Une série de 13 articles sur une stack auto-hébergée : Docker, Traefik, CI/CD et déploiement automatisé.', href: 'https://chartman2-fr.ovh/blog/article/0-pourquoi-heberger-soi-meme-souverain' },
  { title: 'Application To-Do full-stack', icon: 'i-mdi:application-brackets-outline', description: 'Architecture Nuxt 4 et Rails 8, API sécurisée et intégration d’agents intelligents dans un projet démonstrateur.', href: 'https://chartman2-fr.ovh/blog/article/0-to-do-list-architecture' },
  { title: 'IA & automatisation', icon: 'i-mdi:robot-outline', description: 'Orchestration multi-modèles avec n8n, mécanismes de fallback et intégration de modèles locaux avec Ollama.', href: 'https://chartman2-fr.ovh/blog/article/3-generation-code-llm-local' },
]

const education = [
  { title: 'Anthropic Academy — 10 certificats', detail: 'Claude Code, Model Context Protocol, Subagents, Agent Skills, Claude Platform et AI Fluency · 2026' },
  { title: 'Certifications complémentaires', detail: 'Bulats · Wall Street English · CQP MAM (FFJDA)' },
]

const approach = [
  { title: 'Concevoir et développer', description: 'Applications métier maintenables, du modèle de données à l’interface.', icon: 'i-mdi:application-edit-outline' },
  { title: 'Industrialiser', description: 'Automatiser les environnements, les contrôles qualité et les déploiements.', icon: 'i-mdi:cog-sync-outline' },
  { title: 'Exploiter et sécuriser', description: 'Garder la maîtrise de l’infrastructure, y compris pour les services d’IA.', icon: 'i-mdi:shield-check-outline' },
]

const languages = ['Français', 'Anglais']
</script>

<style scoped>
.cv-page {
  max-width: 1120px;
}

.cv-intro,
.cv-skill-card,
.cv-job-card,
.cv-project-card,
.cv-detail-card,
.cv-cta {
  border: 1px solid rgb(var(--v-theme-border));
  background: rgb(var(--v-theme-surface));
}

.cv-intro {
  overflow: hidden;
}

.cv-portrait {
  border: 4px solid rgb(var(--v-theme-primary-container));
}

.cv-eyebrow {
  color: rgb(var(--v-theme-secondary));
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.cv-name {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.1;
}

.cv-role {
  color: rgb(var(--v-theme-primary));
  font-size: clamp(1.1rem, 2vw, 1.4rem);
  font-weight: 600;
}

.cv-summary {
  color: rgb(var(--v-theme-muted));
  font-size: 1.05rem;
  line-height: 1.75;
  max-width: 800px;
}

.cv-contact a {
  align-items: center;
  color: rgb(var(--v-theme-on-background));
  display: inline-flex;
  gap: 7px;
  text-decoration: none;
}

.cv-contact a:hover {
  color: rgb(var(--v-theme-primary));
}

.cv-section-heading h2 {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 750;
  letter-spacing: -0.025em;
}

.cv-timeline {
  display: grid;
  gap: 16px;
  padding-left: 14px;
  position: relative;
}

.cv-timeline::before {
  background: rgb(var(--v-theme-border));
  content: '';
  left: 31px;
  position: absolute;
  top: 24px;
  bottom: 24px;
  width: 2px;
}

.cv-job {
  display: grid;
  gap: 16px;
  grid-template-columns: 36px 1fr;
  position: relative;
}

.cv-job-marker {
  align-items: center;
  background: rgb(var(--v-theme-primary-container));
  border-radius: 50%;
  color: rgb(var(--v-theme-primary));
  display: flex;
  height: 36px;
  justify-content: center;
  margin-top: 18px;
  position: relative;
  z-index: 1;
  width: 36px;
}

.cv-detail-item + .cv-detail-item {
  border-top: 1px solid rgb(var(--v-theme-border));
  margin-top: 16px;
  padding-top: 16px;
}

.cv-cta {
  background: rgb(var(--v-theme-primary-container));
}

@media (max-width: 600px) {
  .cv-page {
    padding-inline: 16px;
  }

  .cv-contact {
    align-items: flex-start;
    flex-direction: column;
    padding-left: 24px !important;
  }

  .cv-job {
    gap: 10px;
    grid-template-columns: 30px 1fr;
  }

  .cv-job-marker {
    height: 30px;
    width: 30px;
  }

  .cv-timeline::before {
    left: 28px;
  }
}
</style>
