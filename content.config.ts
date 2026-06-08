import { defineCollection, defineContentConfig, z } from '@nuxt/content'

// Schéma commun à toutes les collections
const articleSchema = z.object({
  icon:        z.string(),
  color:       z.string(),
  article_id:  z.string(),
  publishedAt: z.string().optional(), // format 'YYYY-MM-DD'
  draft:       z.boolean().default(false),
})

export default defineContentConfig({
  collections: {
    content: defineCollection({
      source: '**',
      type: 'page',
      schema: articleSchema
    }),
    ror: defineCollection({
      source: 'articles/1.ror/**',
      type: 'page',
      schema: articleSchema
    }),
    nuxt: defineCollection({
      source: 'articles/2.nuxt/**',
      type: 'page',
      schema: articleSchema
    }),
    cicd: defineCollection({
      source: 'articles/3.ci-cd/**',
      type: 'page',
      schema: articleSchema
    }),
    todolist: defineCollection({
      source: 'articles/4.to-do-list/**',
      type: 'page',
      schema: articleSchema
    }),
    php: defineCollection({
      source: 'articles/7.php/**',
      type: 'page',
      schema: articleSchema
    }),
    docker: defineCollection({
      source: 'articles/5.docker/**',
      type: 'page',
      schema: articleSchema
    }),
    selfhosted: defineCollection({
      source: 'articles/6-selfhosted/**',
      type: 'page',
      schema: articleSchema
    }),
  }
})