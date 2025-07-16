import { decapitalize } from './../stringUtils.js'

export class generateApiCrudFormSchema {
  constructor(dirname, apiName, askForFields) {
    this.dirname = dirname
    this.apiName = apiName
    this.askForFields = askForFields
    this.variableName = decapitalize(apiName)
    this.composableName = `use${this.apiName}Api`
  }

  generate() {
    let schema = `import { z } from 'zod'\n\n`

    schema += `export const formSchema = z.object({\n`

    for (const field of this.askForFields.getFields()) {
      if (field['type'] === 'text') {
        schema += `  ${field['name']}: z.string()`
        schema += `.min(3, 'default.form.string.min')`
        schema += `.max(255, 'default.form.string.max')`
      } else if (field['type'] === 'number') {
        schema += `  ${field['name']}: z.number({ message: 'default.form.number' })`
        if (field['min']) schema += `.min(${field['min']}, 'default.form.number.min')`
      }
      schema += ',\n'
    }

    schema += `})`

    schema += `\n\nexport type FormData = z.infer<typeof formSchema>\n`

    return schema
  }
}