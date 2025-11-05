import { defineStore, acceptHMRUpdate } from 'pinia'

export const useAgesStore = defineStore('agesStore', {
  state: () => ({
    searchFilters: null,
    searchFields: [{"name":"name"},{"name":"minimum"},{"name":"maximum"}],
    paginateFilters: {
      page: 1,
      per: '15'
    }
  }),
  getters: {
    getSearchFilters: state => state.searchFilters,
    getSearchFields: state => state.searchFields,
    getPaginateFilters: state => state.paginateFilters,
  },
  actions: {
    setSearchFilters(filters) {
      this.searchFilters = filters
    },
    setPaginateFilters(paginateFilters) {
      this.paginateFilters = paginateFilters
    },
  },
  persist: true,
  // persist: {
  //   storage: persistedState.localStorage,
  // },
})

if (Object.hasOwn(import.meta, 'hot')) {
  // @ts-ignore
  import.meta.hot.accept(acceptHMRUpdate(useAgesStore, import.meta.hot))
}