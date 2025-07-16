import * as fs from 'fs'
import * as path from 'path'
import readlineSync from 'readline-sync'
import { decapitalize } from './../stringUtils.js'

export class generateApiCrudAuthSchema {
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
= `import { z } from 'zod'

export const formSchema = z.object({
  email: z.string().email('default.form.error.string.email').max(255, 'default.form.error.string.max'),
  password: z.string().min(6, 'default.form.error.string.min_6').max(255, 'default.form.error.string.max'),
})

export type FormData = z.infer<typeof formSchema>`
    return content
  }
}