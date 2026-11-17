# UnoCSS icons

- Icons (`i-mdi:*`) get CSS only if UnoCSS finds the class in a scanned file. By default it scans .vue-like modules, not plain `.ts` files nor Nuxt Content Markdown.
- `content.filesystem` files still go through the pipeline filter: `.md` passes, `.ts` is dropped. So `unocss.config.ts` reads `content/**/*.md` with `filesystem` (article frontmatter icons) and `app/utils/*.ts` with `content.inline` (categories, skills, links), which is extracted without filter.
- `inline` is read once at startup: restart the dev server after adding an icon in app/utils.
- The safelist only holds icons whose names are built at runtime.
- An icon in an unused component is not generated (never bundled, never scanned).
- Check with a CLEAN build (`rm -rf .output .nuxt node_modules/.cache` then `nuxi build`), then grep `i-mdi\:` in `.output/public/_nuxt/entry.*.css`: a cached build can show icons the CI build lacks.
