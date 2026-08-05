export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('vue:error', (error, instance, info) => {
    console.log(error, instance, info)
    throw new Error("Nuxt Button Error")
  })
})
