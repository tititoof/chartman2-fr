import VueParticles from '@tsparticles/vue3'
import { loadFull } from 'tsparticles'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueParticles, {
    init: async (engine) => {
      await loadFull(engine)
    },
  })
})
