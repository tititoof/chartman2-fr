import type { SQLOperator } from '@nuxt/content'

// Opérateur typé en SQLOperator : un « != » ne compile plus.
// La règle de base no-unused-vars (appliquée aux .ts, cf. eslint.config.mjs)
// prend les noms de paramètres d'une signature de type pour des variables.
interface Whereable<T> {

  where(field: string, op: SQLOperator, value: unknown): T
}

const today = () => new Date().toISOString().split('T')[0]!

// Une seule règle « publié », en SQL (listes) et en JS (page article) :
// pas brouillon et publishedAt (obligatoire dans le schéma) déjà passé.
export const useArticleQuery = ({ dev = import.meta.dev } = {}) => {
  const isPublished = (article: { draft: boolean, publishedAt: string }) =>
    dev || (!article.draft && article.publishedAt <= today())

  // Filtre standard à appliquer sur toutes les requêtes d'articles
  const applyPublishFilter = <T extends Whereable<T>>(query: T): T => {
    if (dev) return query // en dev, tout est visible

    // Uniquement des opérateurs de SQLOperator : Nuxt Content recopie l'opérateur
    // tel quel dans le SQL, et son contrôle (assertSafeQuery) refuse par exemple
    // « != », ce qui faisait échouer la requête côté serveur.
    // draft a false par défaut dans le schéma : jamais NULL.
    return query
      .where('draft', '=', false)
      .where('publishedAt', '<=', today())
  }

  return { applyPublishFilter, isPublished }
}
