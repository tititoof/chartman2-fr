import { buildSingleAttributeAccessString, decapitalize } from './../stringUtils.js'

export class generateApiCrudShow {
  constructor(dirname, apiName, askForFields) {
    this.dirname = dirname
    this.apiName = apiName
    this.askForFields = askForFields
    this.variableName = decapitalize(apiName)
    this.composableName = `use${this.apiName}Api`
  }

  generate() {
    const transformValues = buildSingleAttributeAccessString(this.askForFields.getFields())
    const showPageString 
= `<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container class="text-center">
      <page-title
        :title="$t('pages.${this.variableName}.show.title')"
        icon="i-mdi:eye"
        :links="titleLinks"
      />
        <template v-if="item !== null">
          <section class="py-12">
            ${this.getFieldsShowComponent()}
          </section>
        </template>
    </v-container>
  </v-row>
</template>
<script setup lang="ts">
  import { ${this.composableName} } from '~/composables/api/${this.composableName}'
  
  const route = useRoute()
  const itemId = computed(() => \`${this.variableName}-\${route.params.id}\`)
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
      to: \`/${this.variableName}/edit-\${route.params.id}\`,
      label: 'pages.${this.variableName}.edit.title',
    },
  ])

</script>`

    return showPageString
  }

  getFieldsShowComponent() {
    let fieldsString = ''

    for (const field of this.askForFields.getFields()) {
      fieldsString += `
        <v-row>
          <v-col
            cols="6"
          >
            {{ $t('pages.${this.variableName}.form.fields.${field['name']}') }}
          </v-col>
          <v-col
            cols="6"
          >
            {{ item.${field['name']} }}
          </v-col>
        </v-row>
        `
    }

    return fieldsString
  }
}