import { describe, it, expect } from 'vitest'
// Fichier interne (pas dans les « exports » du paquet) : on teste contre le vrai contrôle
import { assertSafeQuery } from '../../node_modules/@nuxt/content/dist/runtime/internal/security.js'

// Reproduit la sérialisation du query builder de Nuxt Content
// (collectionQueryGroup) : opérateur recopié tel quel, booléen converti en 0/1
const recordingQuery = () => {
  const conditions: string[] = []
  const query = {
    conditions,
    where(field: string, op: string, value: unknown) {
      const v = typeof value === 'boolean' ? Number(value) : value
      conditions.push(`("${field}" ${op} '${String(v).replaceAll('\'', '\'\'')}')`)
      return query
    },
  }
  return query
}

describe('Composable: useArticleQuery', () => {
  it('produit un WHERE accepté par le contrôle de sécurité de Nuxt Content', () => {
    const query = recordingQuery()
    useArticleQuery({ dev: false }).applyPublishFilter(query)

    expect(query.conditions).toHaveLength(2)
    const sql = `SELECT * FROM _content_content WHERE ${query.conditions.join(' AND ')} ORDER BY stem ASC`
    expect(assertSafeQuery(sql, 'content')).toBe(true)
  })

  it('ne filtre rien en développement', () => {
    const query = recordingQuery()
    useArticleQuery({ dev: true }).applyPublishFilter(query)
    expect(query.conditions).toHaveLength(0)
  })
})
