# Conventions

## Language
- Code, identifiers, commit messages: English. Code comments in this repo are mostly French and explain *why* (often citing the incident/alert that motivated the line) — keep that style. UI copy and articles: French.

## Vue / Nuxt
- SFC order: `<template>`, `<script setup lang="ts">`, `<style scoped>`.
- Component files are lower snake_case or single words in folders (`bar/top.vue`, `partial/main/about_me.vue`) → auto-import names `BarTop`, `PartialMainAboutMe`. `vue/multi-word-component-names` is off. Exceptions: `components/content/*` (Prose overrides and MDC components, PascalCase) and `components/ui/App*.vue`.
- No hard-coded UI strings: keys in `i18n/locales/fr.json`, used via `$t` / `useI18n`.
- Colours through Vuetify theme (`rgb(var(--v-theme-*))`), type sizes through `tokens.css` variables; no legacy `display-*` classes.
- Home page is assembled from `components/partial/main/*` sections.
- `no-console` is a warning; several files are excluded from ESLint in `eslint.config.mjs` (do not "fix" them into the lint set casually).

## Articles (`content/articles`)
- Frontmatter required: `title`, `description`, `icon` (`i-mdi:*`), `color`, `article_id` (unique across all articles); optional `draft` (boolean), `publishedAt` (`'YYYY-MM-DD'` string). Enforced by the zod schema and by the Vitest spec in `tests/content`.
- File name `NN-slug.md`; the numeric prefix breaks ties when several articles of a series share a `publishedAt`.
- Body headings start at `####` (the page supplies the title).
- Internal links use `/blog/article/<article_id>`.
- MDC block components available: `::tool-table`, `::small-table`, `::right-note`, `::mermaid` (from `app/components/content`).
- Nuxt Content queries: only operators of `SQLOperator` (`!=` is rejected at runtime by `assertSafeQuery`; use `<>` or restructure).

## Tests
- Only files named `*.nuxt.spec.ts` under `tests/` are collected; path mirrors the source (`tests/components/bar/top.nuxt.spec.ts`).
- Pattern: `mountSuspended(Component, { shallow: true })`, assertions on `wrapper.vm` state; globals enabled; image imports and `universal-cookie` aliased to `tests/mocks`.
- Plain `*.spec.ts` under `tests/server`, `tests/middleware` and `tests/e2e` are not run by Vitest.

## Git
- `develop` = working branch (→ staging), `main` = production, `feature/*` from develop. Conventional commit prefixes (`feat(scope):`, `fix(scope):`).
- Version = CalVer `YYYY.M.N` from Forgejo tags (`.ci/calver.sh`); nothing to bump in the repo.
