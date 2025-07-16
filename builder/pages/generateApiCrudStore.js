import * as fs from 'fs'
import * as path from 'path'
import { decapitalize } from './../stringUtils.js'

export class generateApiCrudStore {
  constructor(dirname, apiName, askForFields) {
    this.dirname = dirname
    this.apiName = apiName
    this.askForFields = askForFields
    this.variableName = decapitalize(apiName)
    this.composableName = `use${this.apiName}Api`
  }

  generate() {
    const searchValues = [
      ...this.askForFields.getFields().map(field => ({
        name: field.name,
      })),
    ]
    const storeCode 
= `import { defineStore, acceptHMRUpdate } from 'pinia'

export const use${this.apiName}Store = defineStore('${this.variableName}Store', {
  state: () => ({
    searchFilters: null,
    searchFields: ${JSON.stringify(searchValues)},
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
  persist: {
    storage: persistedState.localStorage,
  },
})

if (Object.hasOwn(import.meta, 'hot')) {
  // @ts-ignore
  import.meta.hot.accept(acceptHMRUpdate(use${this.apiName}Store, import.meta.hot))
}`
    const targetDir = path.join(this.dirname, 'stores')

    fs.writeFileSync(path.join(targetDir, `${this.variableName}.ts`), storeCode.trim(), 'utf-8')
    console.log(` ✅ Store généré` )
  }
}