import { buildAttributeAccessString, decapitalize } from './../stringUtils.js'

export class generateApiCrudNew {
  constructor(dirname, apiName, askForFields) {
    this.dirname = dirname
    this.apiName = apiName
    this.askForFields = askForFields
    this.variableName = decapitalize(apiName)
    this.composableName = `use${this.apiName}Api`
  }

  generate() {
    let formData = ''
    for (const field of this.askForFields.getFields()) {
      if (field['type'] == 'text') {
        formData += `${field['name']}: '',`
      } else {
        formData += `${field['name']}: null,`
      }
    }
    const newPageString
= `<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container class="text-center">
      <page-title
        :title="$t('pages.${this.variableName}.new.title')"
        icon="i-mdi:creation-outline"
        :links="titleLinks"
      />
      <section class="py-12">
        <formErrors />
        <Lazy${this.apiName}ComponentsForm :form-data="formData" @submit-form="handleSubmit" />
      </section>
    </v-container>
  </v-row>
</template>
<script setup lang="ts">
  import { ${this.composableName} } from '~/composables/api/${this.composableName}'
  import { useApplicationStore } from '~/stores/application'

  const route = useRoute()
  const router = useRouter()
  const applicationStore = useApplicationStore()
  const formData = reactive({
    ${formData}
  })
  const titleLinks = reactive([
    {
      color: 'primary',
      icon: 'i-mdi:view-list',
      to: '/${this.variableName}',
      label: 'pages.${this.variableName}.list.title',
    },
  ])

  const handleSubmit = async (payload) => {
    const { data, status } = await useAsyncData(JSON.stringify(payload), () => ${this.composableName}('POST', payload), {
      immediate: true,
      server: false,
    })

    if (status.value == 'success') {
      applicationStore.showSnackbar('success', 'pages.${decapitalize(this.variableName)}.new.success')

      router.push('/${decapitalize(this.variableName)}')
    }
    else {
      applicationStore.showSnackbar('error', 'pages.${decapitalize(this.variableName)}.new.fail')
    }
  }
</script>`

    return newPageString
  }
}