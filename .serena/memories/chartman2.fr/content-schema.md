# Blog content schema (Nuxt Content)

- One collection only: `content` (content.config.ts). Never add one collection per category: every article would be stored twice.
- Categories: single source `app/utils/categories.ts` (slug, dirs[], icon, color, title, text). A new category = one entry there + its folder under content/articles. `ror` covers `1.ruby` and `1.ror`.
- Category page filters `content` by stem prefix (`categoryStemPrefixes`); stems keep the folder's numeric prefix (`articles/5.docker/01-docker`). Unknown slug → 404.
- Frontmatter: `publishedAt` required (YYYY-MM-DD), `color` optional (overrides the category color), `draft` defaults to false.
- Publish rule: `useArticleQuery().isPublished` (page) and `applyPublishFilter` (SQL lists) are the same rule; an undated article would be hidden from lists (NULL <= today).
- tests/content/articles.nuxt.spec.ts guards: unique article_id, required date, category folders exist, case_studies.vue links to real articles.
