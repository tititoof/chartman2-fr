# chartman2.fr — core

Personal site + blog (French only) of a Rails/Nuxt/DevOps freelancer. Nuxt 4 SSR app, articles as Markdown via Nuxt Content.

## Source map
- `app/` — Nuxt 4 srcDir: `pages/` (index, cv, legal_notices, `blog/article/[id]`, `blog/category/[id]`), `components/`, `composables/`, `stores/` (Pinia), `plugins/`, `utils/`, `assets/css/tokens.css`.
- `content/articles/<N>.<category>/NN-slug.md` — blog articles; collections declared in `content.config.ts`.
- `server/` — only `api/` contact mail (Resend) and a Nitro plugin stripping `X-Powered-By`.
- `i18n/locales/fr.json` — all UI copy; `en.json` kept but locale disabled on purpose. Legal notices (SIRET, host) are duplicated in `en.json`, `i18n/i18n.config.js` and the root `i18n.config.ts` (apparently unused): keep all four aligned.
- Domain: `chartman2.fr` is lost (NXDOMAIN since late Oct 2026); the site is `chartman2-fr.ovh`. `chartman2.fr` still appears on purpose as DefectDojo product name, Serena project name and the contact Gmail.
- `tests/` — Vitest (`*.nuxt.spec.ts`) mirroring `app/` paths, plus Playwright smoke tests of the staging in `tests/e2e/smoke.spec.ts`.
- `Jenkinsfile`, `.ci/calver.sh`, `.zap/`, `.githooks/` — CI/CD and security tooling.
- `middlewares/`, `types/` — leftovers of a members/CRUD area backed by an external Rails API (`useBackendApi`, `plugins/api.ts`, `useAuthStore`); no matching pages exist under `app/pages` today.

## Invariants
- Article URL is `/blog/article/<article_id>` — resolved by frontmatter `article_id`, not by file path. Renaming a file is safe, changing `article_id` breaks links.
- Category URL is `/blog/category/<collection name>` — the route param is passed straight to `queryCollection()`, so it must be a collection key of `content.config.ts`.
- Every article listing must go through `useArticleQuery().applyPublishFilter` (hides `draft: true` and future `publishedAt` outside dev).
- Adding a category = new folder under `content/articles` AND a new collection in `content.config.ts`.

## Further memories
- Versions, modules and their quirks (Vuetify + UnoCSS icons, Sentry/Bugsink, HMR over wss): `mem:tech_stack`.
- How to run dev, tests, lint (everything goes through Docker + pnpm): `mem:suggested_commands`.
- Component naming, i18n, article frontmatter and MDC components, test style, git flow: `mem:conventions`.
- What to run and check before calling a change done, and what CI does per branch: `mem:task_completion`.
