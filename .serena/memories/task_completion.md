# Task completion

Run inside the `frontend-dev` container (see `mem:suggested_commands` for how to get in):

1. `pnpm exec eslint <changed files>` — no new errors.
2. `pnpm run test:dev` (or the single matching `*.nuxt.spec.ts`) — green. A changed component/composable/store needs its mirror spec updated; specs assert literal `wrapper.vm` values (e.g. menu item arrays), so data changes break them.
3. Article-only change: the `tests/content` spec is enough (frontmatter + unique `article_id`); check the article renders in dev, since drafts/future dates are only visible there.
4. Change to `nuxt.config.ts`, modules, or `content.config.ts`: `pnpm build` must pass.

Do not commit or push unless asked.

## What CI does (Jenkinsfile, multibranch)
- All branches: Secrets (gitleaks) → Build (`pnpm install && pnpm build`) → Test (`pnpm run test:ci-cd`) → SonarQube + Quality Gate.
- `develop`: mirror to GitHub, image build, deploy staging, then DAST (ZAP baseline, rules in `.zap/rules.tsv`).
- `main`: mirror, image build, deploy production, CalVer release tag.
- Quality gate failures on coverage are common after adding untested code under `app/components`, `composables`, `stores`, `pages`.
- Vitest on Jenkins starts slowly (many parallel workers): timeouts in `vitest.ci-cd.config.mjs` are deliberately high; a random hook timeout is infra, not a test bug.
