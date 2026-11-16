# Playwright smoke tests (tests/e2e/smoke.spec.ts)

- Run against a production build (`node .output/server/index.mjs`), never `nuxt dev`: the Vite HMR websocket raises `WebSocket closed without opened.` page errors.
- Locally: start the build in `frontend-dev` on port 3001, then run the pinned image `mcr.microsoft.com/playwright:v1.65.1-noble` on the compose network with `PLAYWRIGHT_BASE_URL=http://frontend-chartman2-fr:3001`; install only `@playwright/test@<same version>` in /tmp and symlink `node_modules`.
- Any action on a hydrated widget (contact form, cookie banner) must be wrapped in `expect(async () => {...}).toPass()`: input or clicks before hydration are lost (about 1 run in 8).
- Cookie-control consent cookies are `Secure` outside development: over plain HTTP the consent is never kept, so the reload check only runs on https (staging).
- Stopping the preview: `pkill -f "[n]ode .output/server/index.mjs"` (a bare pattern kills the calling `sh -c` too).
- `@playwright/test` and lab-iac `var.playwright_image` must be bumped together.
