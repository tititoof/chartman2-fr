# Tech stack

- Nuxt `^4.6` (srcDir `app/`), Vue 3.5, TypeScript, pnpm (`pnpm-lock.yaml`, `pnpm-workspace.yaml`).
- UI: Vuetify via `vuetify-nuxt-module` (options in `vuetify.config.ts`), UnoCSS (`unocss.config.ts`), typography tokens in `app/assets/css/tokens.css` (fluid `--text-*` scale, Inter).
- Icons: UnoCSS preset-icons with MDI, written `i-mdi:<name>` (also in article frontmatter `icon`).
- Content: `@nuxt/content` v3 (SQLite via `better-sqlite3`), `queryCollection`, zod schema in `content.config.ts`; Mermaid through `rehype-mermaid` + `plugins/mermaid.client.js`; Shiki langs whitelisted in `nuxt.config.ts` (`content.build.markdown.highlight.langs`) — a code fence in another language is not highlighted until added there.
- TOC depth is 5 because articles start sections at `####`.
- Runtime: Node 26 pinned in the Dockerfiles (not `lts`); pnpm 12 (same as CI). Server code imports from `nuxt/server` (portable to Nitro 3 / Nuxt 5); Nuxt 4 stays on Nitro 2 / h3 v1 — do not bump `h3` to v2. TypeScript capped at <6.1 by typescript-eslint; `typescript` must stay a devDependency or @nuxt/eslint-config skips TS rules.
- State: Pinia 4 + `@pinia/nuxt` 1 (0.11 broke every SSR page under Nuxt 4.6) + `pinia-plugin-persistedstate`. Utilities: VueUse, dayjs (fr, Europe/Paris).
- i18n: `@nuxtjs/i18n`, single locale `fr`, no route prefix.
- SEO: `@nuxtjs/seo` generates per-page meta; do not hand-add viewport/description/og tags in `app.head`.
- Errors: `@sentry/nuxt` pointed at a self-hosted Bugsink; module only loaded when `SENTRY_DSN` is set at build (test it with a fake DSN build); 4xx are filtered out; v11: `sourcemaps.disable: 'disable-upload'`, `telemetry: false`, no `autoInjectServerSentry`.
- Mail: `nuxt-resend` (contact form, `server/api`).
- Cookies: `@dargmuesli/nuxt-cookie-control`, colours bound to Vuetify theme CSS vars.
- Tests: Vitest 5 + `@nuxt/test-utils` (env `nuxt`, happy-dom), coverage v8/lcov, `vitest-sonar-reporter` in CI; Playwright for e2e.
- Lint: ESLint 10 flat config through `@nuxt/eslint` (`withNuxt`), stylistic enabled; blocking `Lint` stage in Jenkins. After a dependency change, run `nuxt prepare` before lint (stale `.nuxt/eslint.config.mjs` → ERR_MODULE_NOT_FOUND).
- Security headers + CSP (Report-Only) live in `nuxt.config.ts` `routeRules['/**']`; they answer ZAP baseline alerts — keep them when touching routeRules. New external origins (fonts, APIs, images) must be added to the CSP lists.
- Dev HMR is forced to `wss` on port 443 path `hmr/` (dev runs behind a reverse proxy in Docker); a plain `localhost:3000` session has no working HMR.
- `components` config also auto-registers `app/pages/*/components/**`, and a `pages:extend` hook drops any route whose path contains `component`.
