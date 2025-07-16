import * as fs from 'fs'
import * as path from 'path'
import readlineSync from 'readline-sync'
import { decapitalize } from './../stringUtils.js'

export class generateApiCrudAuthComposable {
  constructor(dirname, apiName, askForFields) {
    this.dirname = dirname
    this.apiName = apiName
    this.askForFields = askForFields
    this.variableName = decapitalize(apiName)
    this.composablesDir = path.join(this.dirname, 'composables')
    this.composableName = `useAuthApi`
    this.composableFilePath = path.join(this.composablesDir, 'api', `${this.composableName}.ts`)
  }

  generate() {
    const content
= `import { useBackendApi } from '~/composables/useBackendApi'
export const useAuthApi = () => {
  const signIn = async (credentials: { email: string; password: string }) => {
    const endpoint = '/users/tokens/sign_in'

    return await useBackendApi(endpoint, 'POST', credentials, false)
  }

  const signOut = async () => {
    const endpoint = '/users/tokens/revoke'
    
    return await useBackendApi(endpoint, 'POST', null, false)
  }

  return { signIn, signOut }
}`
    return content
  }
}