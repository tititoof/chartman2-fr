import * as fs from 'fs'
import * as path from 'path'
import readlineSync from 'readline-sync'
import { decapitalize } from './../stringUtils.js'

export class generateApiCrudAuthSignInPage {
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
  <v-row class="d-flex align-self-start py-12">
    <v-container class="text-center">
      <page-title
        :title="$t('default.auth.sign_in.title')"
        icon="i-mdi:login-variant"
        :links="titleLinks"
      />
      <section class="py-12">
        <LazyAuthComponentsForm 
          @submit-form="handleSubmit" 
        />
      </Section>
    </v-container>
  </v-row>
</template>
<script setup lang="ts">
  import { useCookies } from '@vueuse/integrations/useCookies'
  import { useAuthApi } from '~/composables/api/useAuthApi'
  import { useApplicationStore } from '~/stores/application'
  
  const applicationStore = useApplicationStore()

  const { signIn } = useAuthApi()
  
  const handleSubmit = async (payload) => {
    const {data: response, status } = await useAsyncData('sign-in', () =>  signIn(payload), {
      immediate: true,
      server: false,
    })

    if (status.value == 'success') {
      applicationStore.showSnackbar('success', 'default.auth.sign_in.success')
      
      const cookies = useCookies('token', {
        maxAge: 60 * 60 * 24 * 7,
        secure: true,
        httpOnly: true
      })
      
      cookies.set('token', response.value.token)
      cookies.set('refresh_token', response.value.refresh_token)
    } else {
      applicationStore.showSnackbar('error', 'default.auth.sign_in.fail')
    }
  }
</script>`

    return content
  }
}