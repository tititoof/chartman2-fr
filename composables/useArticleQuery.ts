export const useArticleQuery = () => {
  const isDev = process.dev

  // Filtre standard à appliquer sur toutes les requêtes d'articles
  const applyPublishFilter = <T>(query: T & {
    where: (field: string, op: string, value: any) => T
  }): T => {
    if (isDev) return query // en dev, tout est visible

    const today = new Date().toISOString().split('T')[0]

    return query
      .where('draft', '!=', true)
      .where('publishedAt', '<=', today)
  }

  return { applyPublishFilter }
}