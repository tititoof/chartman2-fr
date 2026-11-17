import { defineCollection, defineContentConfig, z } from '@nuxt/content'

// One collection: an article's category is its folder (stem prefix), described once in
// app/utils/categories.ts. One table per category would store every article twice.
const articleSchema = z.object({
  icon: z.string(),
  // Optional: overrides the category color (app/utils/categories.ts)
  color: z.string().optional(),
  article_id: z.string(),
  // Required: an undated article would be hidden from lists (NULL <= today is not true)
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  draft: z.boolean().default(false),
})

export default defineContentConfig({
  collections: {
    content: defineCollection({
      source: '**',
      type: 'page',
      schema: articleSchema,
    }),
  },
})
