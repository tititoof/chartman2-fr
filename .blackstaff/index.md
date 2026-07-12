---
# ═══════════════════════════════════════════════════════════
# Blackstaff — Config projet
# Placé à la racine du projet dans .blackstaff/index.md
# Toutes les valeurs sont utilisées par le workflow n8n pour
# résoudre le bon contexte OKF et générer du code cohérent.
# ═══════════════════════════════════════════════════════════

# Nom du projet (doit correspondre au dossier dans /home/node/projets/)
project: mon-projet

# Description courte — injectée dans le prompt pour contextualiser
description: "Application de gestion de commandes B2B"

stack:
  # ── Frontend ──────────────────────────────────────────────
  frontend:
    framework: nuxt          # nuxt | vue | react | ...
    version: "4"             # version majeure
    design_system: vuetify   # vuetify | tailwind | bootstrap | ...
    lang: typescript         # typescript | javascript

  # ── Backend ───────────────────────────────────────────────
  backend:
    framework: rails         # rails | laravel | symfony
    version: "8"             # version majeure
    lang: ruby               # ruby | php

# Patterns activés pour ce projet
# Blackstaff n'affichera que ces patterns dans l'UI VSCode
patterns:
  - crud
  - auth
  - strategy
  - observer
  - decorator
  - command
  - adapter
  - facade
  - factory-method
  - builder

# Conventions propres au projet — complètent les recipes OKF
# Voir .blackstaff/context.md pour le détail
conventions:
  # Namespace principal des services backend
  service_namespace: "Services"
  # Préfixe des jobs
  job_prefix: "Process"
  # Style d'API retourné
  api_style: "json"          # json | json_api | graphql
---

# Blackstaff — Projet mon-projet

Ce fichier configure Blackstaff pour le projet. Modifier le frontmatter
YAML ci-dessus pour adapter la stack et les conventions.

Le fichier `.blackstaff/context.md` contient le contexte métier
(entités, vocabulaire, relations) injecté dans chaque génération.