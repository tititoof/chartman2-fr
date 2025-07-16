import * as fs from 'fs'
import * as path from 'path'
import readlineSync from 'readline-sync'
import { decapitalize } from './../stringUtils.js'

export class generateApiCrudAuthSignInForm {
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
= `<template>
  <v-form
    v-model="formData.valid"
  >
    <v-card
      class="mx-auto my-12"
      color="secondary-container"
      rounded="lg"
    >
      <v-card-text>
        <v-text-field
          v-model="formData.email"
          :label="$t('default.auth.sign_in.email')"
          prepend-inner-icon="i-mdi:email-outline"
          :error-messages="errors.email != null ? $t(errors.email) : null"
        />
        <v-text-field
          v-model="formData.password"
          :label="$t('default.auth.sign_in.password')"
          :append-icon="formData.showPassword ? 'i-mdi:eye' : 'i-mdi:eye-off'"
          :type="formData.showPassword ? 'text' : 'password'"
          prepend-inner-icon="i-mdi:lock-outline"
          @click:append="formData.showPassword = !formData.showPassword"
          :error-messages="errors.password != null ? $t(errors.password) : null"
        />
      </v-card-text>
      <v-card-actions>
        <v-btn
          color="info"
          block
          variant="outlined"
          rounded="lg"
          @click="submitForm"
        >
          {{ $t('default.auth.sign_in.submit') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-form>
</template>
<script setup lang="ts">
import { defineEmits, reactive, toRefs } from 'vue'
import { formSchema, type FormData } from '~/composables/schemas/auth.ts'
import { useFormValidator } from '~/composables/useFormValidator'

const { errors, validate } = useFormValidator(formSchema)
const formData = reactive({ email: '', password: '', valid: false, showPassword: false })
const emit = defineEmits(['submit-form'])

const validateForm = () => {
  if (!validate({ email: formData.email, password: formData.password })) {
    return false
  }

  return true
}

const submitForm = () => {
  if (validateForm()) {
    emit('submit-form', {
      email: formData.email,
      password: formData.password
    })
  }
}
</script>`

    return content
  }
}
