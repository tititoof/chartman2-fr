import * as Sentry from '@sentry/nuxt'

// Erreurs envoyées à Bugsink (beshaba.chartman2-fr.ovh), qui accepte le
// protocole Sentry. Le DSN n'est pas un secret : il finit de toute façon dans
// le JavaScript envoyé au navigateur.
const config = useRuntimeConfig()

if (config.public.sentryDsn) {
  Sentry.init({
    dsn: config.public.sentryDsn,
    environment: config.public.environment,
    release: config.public.appVersion,
    // Bugsink ne garde que les erreurs : inutile d'envoyer des traces de performance
    tracesSampleRate: 0,
    // Ni IP ni cookies dans les événements
    sendDefaultPii: false,
  })
}
