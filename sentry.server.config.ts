import * as Sentry from '@sentry/nuxt'
import { dropClientErrors } from './app/utils/sentry'

// Chargé par Nitro au démarrage du serveur, avant useRuntimeConfig() :
// le DSN vient donc directement de l'environnement du conteneur.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.APP_ENVIRONMENT,
    release: process.env.APP_VERSION,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    // Pas d'issue (ni d'email) pour les 4xx : robots, liens morts
    beforeSend: dropClientErrors,
  })
}
