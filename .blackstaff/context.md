---
type: ProjectContext
project: chartman2.fr
# Ce fichier est injecté dans chaque prompt Blackstaff.
# Il donne au modèle le vocabulaire du site pour que les noms
# générés soient cohérents avec l'existant. Garder concis.
---

# Contexte — chartman2.fr

## Domaine

Site personnel et blog technique : tutoriels et retours d'expérience (Docker, self-hosted,
DevSecOps, Ruby on Rails, Nuxt), CV et études de cas. Pas de backend ni de base de données
applicative : les articles sont des fichiers Markdown lus par Nuxt Content.

## Entités

| Entité | Où | Description |
|---|---|---|
| Article | `content/articles/<dossier>/*.md` | Frontmatter `title`, `description`, `icon`, `article_id` (clé d'URL, unique), `publishedAt` (obligatoire, `YYYY-MM-DD`), `draft`, `color` (optionnel) |
| Catégorie | `app/utils/categories.ts` | Source unique : `slug` d'URL, `dirs` (dossiers d'articles), `icon`, `color`, texte de la carte |
| Étude de cas | `app/components/partial/main/case_studies.vue` | Renvoie vers un article par son `article_id` |

## Règles

- Une seule collection Nuxt Content (`content`) ; une catégorie se filtre par préfixe de `stem`
  (`articles/5.docker/…`).
- Publié = pas `draft` et `publishedAt` passé : `useArticleQuery` (`applyPublishFilter` pour les
  listes, `isPublished` pour une page).
- La couleur d'un article vient de sa catégorie, sauf `color` dans son frontmatter.
- Icônes `i-mdi:*` via UnoCSS : une icône écrite dans un article (`content.filesystem`) ou dans
  `app/utils/*.ts` (`content.inline`) est lue automatiquement ; la safelist ne sert qu'aux noms
  construits à l'exécution.
- Textes d'interface via i18n ; code, identifiants et commentaires en anglais.

## Conventions de nommage

- Composants par dossier : `app/components/<dossier>/<nom>.vue` (ex. `articles/categories.vue`).
- Composables `use<Nom>` dans `app/composables/`, utilitaires dans `app/utils/` (auto-importés).
- Tests Vitest dans `tests/`, en miroir de `app/` ; e2e Playwright dans `tests/e2e/`.

## Stack

```
Nuxt 4 + Vuetify + TypeScript + Nuxt Content (SQLite au build) + UnoCSS (presetIcons)
Tests : Vitest (@nuxt/test-utils), Playwright ; CI Jenkins, staging depuis develop
```
