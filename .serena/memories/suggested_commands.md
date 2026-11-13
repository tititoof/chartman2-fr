# Suggested commands

Host has no usable `node_modules` (`task up` deletes it; deps are installed inside the container). Run pnpm/vitest/eslint inside the `frontend-dev` container, not on the host.

- `task up` / `task down` / `task ps` / `task logs` — dev stack (`docker-compose.dev.yml`; services `frontend-dev`, `vscode`). Container start runs `pnpm install && pnpm run dev`.
- `task f-restart` — recreate `frontend-dev` (needed after dependency or `nuxt.config.ts` module changes).
- `task f-ssh` — shell in the container. One-off: `docker compose -f docker-compose.dev.yml exec frontend-dev <cmd>`.
- Inside the container:
  - `pnpm run test:dev` — Vitest once with coverage (`vitest.config.ts`).
  - `pnpm exec vitest run tests/<path>.nuxt.spec.ts` — single file.
  - `pnpm run test:ci-cd` — what Jenkins runs (`vitest.ci-cd.config.mjs`, adds Sonar reporter + longer timeouts).
  - `pnpm exec eslint .` — lint (needs `.nuxt/eslint.config.mjs`, i.e. after `nuxt prepare`).
  - `pnpm build` — production build, also done by CI.
- Playwright: `pnpm exec playwright test` with `PLAYWRIGHT_BASE_URL` (default `http://localhost:3000`).
- Git hooks: `git config core.hooksPath .githooks` once per clone (gitleaks pre-commit; false positives go in `.gitleaksignore`).
- Shell is zsh: quote globs.
