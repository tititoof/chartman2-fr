import * as Sentry from '@sentry/nuxt'

// Chargé par Nitro au démarrage du serveur, avant useRuntimeConfig() :
// le DSN vient donc directement de l'environnement du conteneur.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.APP_ENVIRONMENT,
    release: process.env.APP_VERSION,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  })
}
