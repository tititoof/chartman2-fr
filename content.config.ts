import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    content: defineCollection({
      source: '**',
      type: 'page',
      schema: z.object({
        icon: z.string(),
        color: z.string(),
        article_id: z.string()
      })
    }),
    ror: defineCollection({
      source: 'articles/1.ror/**',
      type: 'page',
      schema: z.object({
        icon: z.string(),
        color: z.string(),
        article_id: z.string()
      })
    }),
    nuxt: defineCollection({
      source: 'articles/2.nuxt/**',
      type: 'page',
      schema: z.object({
        icon: z.string(),
        color: z.string(),
        article_id: z.string()
      })
    }),
    cicd: defineCollection({
      source: 'articles/3.ci-cd/**',
      type: 'page',
      schema: z.object({
        icon: z.string(),
        color: z.string(),
        article_id: z.string()
      })
    }),
    todolist: defineCollection({
      source: 'articles/4.to-do-list/**',
      type: 'page',
      schema: z.object({
        icon: z.string(),
        color: z.string(),
        article_id: z.string()
      })
    }),
    docker: defineCollection({
      source: 'articles/5.docker/**',
      type: 'page',
      schema: z.object({
        icon: z.string(),
        color: z.string(),
        article_id: z.string()
      })
    })
  }
})