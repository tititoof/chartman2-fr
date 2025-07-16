import { buildSingleAttributeAccessString, decapitalize } from './../stringUtils.js'

export class generateApiCrudEdit {
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
      formData += `${field['name']}: '',`
    }

    const transformValues = buildSingleAttributeAccessString(this.askForFields.getFields())
    const editPageString = `
<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container class="text-center">
      <page-title
        :title="$t('pages.${this.variableName}.edit.title')"
        icon="i-mdi:pen"
        :links="titleLinks"
      />
      <section class="py-12">
        <formErrors />
        <template v-if="item !== null">
          <Lazy${this.apiName}ComponentsForm :form-data="item" @submit-form="handleSubmit" />
        </template>
      </section>
    </v-container>
  </v-row>
</template>
<script setup lang="ts">
  import { ${this.composableName} } from '~/composables/api/${this.composableName}'
  import { useApplicationStore } from '~/stores/application'

  const applicationStore = useApplicationStore()
  const route = useRoute()
  const router = useRouter()
  const itemId = computed(() => \`${this.variableName}-edit-\${route.params.id}\`)
  const { data: item, status } = await useAsyncData(itemId.value, () => ${this.composableName}('GET', null, route.params.id), {
    immediate: true,
    server: false,
    transform: (data) => {
      return ${transformValues}
    }
  })
  const titleLinks = reactive([
    {
      color: 'primary',
      icon: 'i-mdi:view-list',
      to: '/${this.variableName}',
      label: 'pages.${this.variableName}.list.title',
    },
    {
      color: 'secondary',
      icon: 'i-mdi:eye',
      to: \`/${this.variableName}/show-\${route.params.id}\`,
      label: 'pages.${this.variableName}.show.title',
    },
  ])

  const handleSubmit = async (payload) => {
    const { data: item, status } = await useAsyncData(JSON.stringify(payload), () => ${this.composableName}('PUT', payload, route.params.id), {
      immediate: true,
      server: false,
    })

    if (status.value == 'success') {
      applicationStore.showSnackbar('success', 'pages.${this.variableName}.edit.success')

      router.push('/${decapitalize(this.variableName)}')
    } else {
      applicationStore.showSnackbar('error', 'pages.${this.variableName}.edit.fail')
    }
  }
</script>`

    return editPageString
  }
}