import type { SQLOperator } from '@nuxt/content'

// Opérateur typé en SQLOperator : un « != » ne compile plus.
// La règle de base no-unused-vars (appliquée aux .ts, cf. eslint.config.mjs)
// prend les noms de paramètres d'une signature de type pour des variables.
interface Whereable<T> {
  // eslint-disable-next-line no-unused-vars
  where(field: string, op: SQLOperator, value: unknown): T
}

export const useArticleQuery = ({ dev = import.meta.dev } = {}) => {
  // Filtre standard à appliquer sur toutes les requêtes d'articles
  const applyPublishFilter = <T extends Whereable<T>>(query: T): T => {
    if (dev) return query // en dev, tout est visible

    const today = new Date().toISOString().split('T')[0]

    // Uniquement des opérateurs de SQLOperator : Nuxt Content recopie l'opérateur
    // tel quel dans le SQL, et son contrôle (assertSafeQuery) refuse par exemple
    // « != », ce qui faisait échouer la requête côté serveur.
    // draft a false par défaut dans le schéma : jamais NULL.
    return query
      .where('draft', '=', false)
      .where('publishedAt', '<=', today)
  }

  return { applyPublishFilter }
}
