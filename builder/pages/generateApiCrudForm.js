import { decapitalize, singularize } from './../stringUtils.js'

export class generateApiCrudForm {
  constructor(dirname, apiName, askForFields) {
    this.dirname = dirname
    this.apiName = apiName
    this.askForFields = askForFields
    this.variableName = decapitalize(apiName)
    this.composableName = `use${this.apiName}Api`
  }

  generate() {
    const fieldsArray = this.getFieldsFormComponent()

    const formComponentString
= `<template>
  <v-form>
    <v-container>
      ${fieldsArray['view']}

      <v-row>
        <v-btn
          class="mt-2"
          :text="$t('default.form.save')"
          @click="submitForm"
          variant="outlined"
          color="success"
          block
        />
      </v-row>
    </v-container>
  </v-form>
</template>
<script setup lang="ts">
  ${fieldsArray['script']}
</script>`

    return formComponentString
  }

  getFieldsFormComponent() {
    let errors = ''

    for (const field of this.askForFields.getFields()) {
      errors += `${field['name']}: null,`
    }

    let fieldsString = ``
    let fieldsOptions
= `import { defineProps, defineEmits, reactive, toRefs } from 'vue'
import { formSchema, type FormData } from '~/composables/schemas/${this.variableName}'
import { useFormValidator } from '~/composables/useFormValidator'

const props = defineProps({
  formData: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['submit-form'])

const localData = reactive({ ...props.formData })
const { errors, validate } = useFormValidator(formSchema)

const validateForm = () => {
  if (!validate(localData)) {
    return false
  }

  return true
}

const submitForm = () => {
  if (validateForm()) {
    emit('submit-form', { ${singularize(this.variableName)}: {...localData }})
  }
}`
    for (const field of this.askForFields.getFields()) {
      switch (field['type']) {
        case 'text':
          fieldsString += `
      <v-row>
        <v-col
          cols="12"
        >
          <v-text-field
            v-model="localData.${field['name']}"
            :label="$t('pages.${this.variableName}.form.fields.${field['name']}')"
            :error-messages="errors.${field['name']} != null ? $t(errors.${field['name']}) : null"
          ></v-text-field>
        </v-col>
      </v-row>`

          break
        case 'select':
          fieldsString += `
      <v-row>
        <v-col
          cols="12"
        >
          <v-select
            v-model="localData.${field['name']}"
            :label="$t('pages.${this.variableName}.form.fields.${field['name']}')"
            :items="${field['name']}Items"
            :error-messages="errors.${field['name']} != null ? $t(errors.${field['name']}) : null"
            item-title="title"
            item-value="value"
          ></v-select>
        </v-col>
      </v-row>`

          const tmpOptions = field['options'].map(option => `[name: '${option[name]}', value: '${option[value]}']`).join(', ')
          fieldsOptions += `const ${field['name']}Items = [${tmpOptions}]`

          break
        case 'checkbox':
          fieldsString += `
        <v-row>
          <v-col
            cols="12"
          >`
          for (const checkbox in field['options']) {
            fieldsString += `
            <v-checkbox
              v-model="localData.${field['name']}"
              :label="$t('pages.${this.variableName}.form.fields.${checkbox['name']}')"
              value="${checkbox['value']}"
              :error-messages="errors.${field['name']} != null ? $t(errors.${field['name']}) : null"
              hide-details
            ></v-checkbox>
            `
          }
          fieldsString += `
          </v-col>
        </v-row>`

          break
        case 'number':
          fieldsString += `
        <v-row>
          <v-col
            cols="12"
          >
            <v-number-input
              v-model="localData.${field['name']}"
              :label="$t('pages.${this.variableName}.form.fields.${field['name']}')"
              control-variant="hidden"
              :error-messages="errors.${field['name']} != null ? $t(errors.${field['name']}) : null"
            ></v-number-input>
          </v-col>
        </v-row>`
          break
        default:
          break
      }
    }

    return { view: fieldsString, script: fieldsOptions }
  }
}