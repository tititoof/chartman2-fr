import { defineStore, acceptHMRUpdate } from 'pinia'

export const useAppVersionStore = defineStore('appVersion', {
  state: () => ({
    outdated: false,
    version: '0',
  }),
  getters: {
    getVersion: state => state.version,
    getOutdated: state => state.outdated
  },
  actions: {
    markOutdated(version: string) {
      this.outdated = true
      this.version = version
    },

    reload() {
      this.outdated = false
      window.location.reload()
    }
  },
  persist: true,
})

if (Object.hasOwn(import.meta, 'hot')) {
    // @ts-ignore
    import.meta.hot.accept(acceptHMRUpdate(useAppVersionStore, import.meta.hot))
}