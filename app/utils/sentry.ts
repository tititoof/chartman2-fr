// Filtre des événements envoyés à Bugsink, commun au client et au serveur
// (sentry.client.config.ts, sentry.server.config.ts).
//
// Les erreurs HTTP 4xx ne sont pas des pannes : un robot qui teste /.env.remote
// ou /wp-login.php reçoit un 404, et c'est le comportement voulu. Sans ce
// filtre, chaque chemin essayé crée une issue et un email d'alerte. Seules les
// erreurs 5xx et les exceptions sans code HTTP sont gardées.
export function dropClientErrors<T>(event: T, hint?: { originalException?: unknown }): T | null {
  const error = hint?.originalException
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const status = Number((error as { statusCode: unknown }).statusCode)
    if (status >= 400 && status < 500) {
      return null
    }
  }
  return event
}
