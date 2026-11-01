// Nuxt ajoute « X-Powered-By: Nuxt » aux pages rendues : inutile, et il
// annonce la techno du serveur (alerte ZAP 10037)
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response) => {
    delete response.headers['x-powered-by']
  })
})
