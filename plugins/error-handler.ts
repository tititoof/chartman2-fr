export default defineNuxtPlugin((nuxtApp) => {
  // Also possible
  nuxtApp.hook('vue:error', (error, instance, info) => {
    console.log(error)
    throw new Error("Nuxt Button Error")
  })
})
