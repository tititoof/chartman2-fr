# Blackstaff — Configuration projet

Ce dossier `.blackstaff/` se place à la racine de chaque projet utilisant Blackstaff.

## Fichiers

```
.blackstaff/
├── index.md    ← config stack (framework, version, design system)
├── context.md  ← contexte métier (entités, conventions, règles)
└── README.md   ← ce fichier
```

## Installation

```bash
# Depuis la racine du projet
cp -r /chemin/vers/blackstaff/project-template/.blackstaff .
# Puis éditer index.md et context.md
```

## index.md — Config stack

Le frontmatter YAML configure la stack du projet :

```yaml
project: nom-du-projet        # doit correspondre au dossier dans /home/node/projets/
description: "Description"

stack:
  frontend:
    framework: nuxt           # nuxt | vue | react
    version: "4"
    design_system: vuetify    # vuetify | tailwind | ...
    lang: typescript
  backend:
    framework: rails          # rails | laravel | symfony
    version: "8"
    lang: ruby

patterns:                     # patterns activés dans l'UI VSCode
  - crud
  - strategy
  - ...
```

**Priorité des valeurs :**
Le payload webhook peut surcharger `framework` et `side` à la volée.
`version` et `design_system` viennent toujours de ce fichier.

## context.md — Contexte métier

Corps markdown libre, injecté dans chaque prompt de génération.
Garder **concis (300-500 mots)** — c'est du contexte pour guider le modèle,
pas une documentation complète.

**Ce qu'il faut documenter :**
- Les entités principales et leurs noms exacts (dans les deux langues si fullstack)
- Les relations clés entre entités
- Les conventions de nommage propres au projet
- Les règles métier importantes pour la génération de code
- Les statuts/états des entités principales

**Ce qu'il ne faut PAS mettre :**
- Du code existant (trop long, pas adapté)
- Des détails d'implémentation (ce n'est pas une doc technique)
- Des informations non pertinentes pour la génération

## Utilisation

Blackstaff lit ces fichiers automatiquement lors de chaque génération.
Aucune commande à lancer — le workflow n8n les charge à chaque appel.