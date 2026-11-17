---
type: project
title: chartman2.fr
description: "Site personnel et blog technique (Nuxt 4, Vuetify, Nuxt Content) : tutos Docker, self-hosted, DevSecOps, Rails, Nuxt"

stack:
  frontend:
    framework: nuxt
    version: "4"
    design_system: vuetify
    lang: typescript
    content: nuxt-content   # articles Markdown dans content/articles, une seule collection
    icons: unocss           # presetIcons, classes i-mdi:*

workflow:
  patcher: nuxt
  roadmap: AMELIORATIONS-SERIE-DEVSECOPS.md
  memory_prefix: chartman2.fr/
---

# Blackstaff — chartman2.fr

Profil du site chartman2.fr : la stack ci-dessus sert à Blackstaff pour résoudre le contexte OKF,
le bloc `workflow` au dev-workflow et à `/save`. Pas de backend : le site lit ses articles avec
Nuxt Content (SQLite généré au build).

`.blackstaff/context.md` contient le vocabulaire du site, injecté dans chaque génération.
