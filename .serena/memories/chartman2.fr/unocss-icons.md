# UnoCSS icons

- Icons (`i-mdi:*`) get CSS only if UnoCSS finds the class in a scanned file. By default it scans .vue-like modules, not plain `.ts` files nor Nuxt Content Markdown.
- `unocss.config.ts` therefore scans `app/utils/**/*.ts` (category icons) and `content/**/*.md` (article frontmatter icons) via `content.filesystem`.
- The safelist only holds icons found in no scanned file (names built at runtime). Before adding one, check it is not already in a .vue, app/utils .ts or content .md file.
- Check after a change: `nuxi build`, then grep `i-mdi\:` in `.output/public/_nuxt/*.css`.
