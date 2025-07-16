import { buildAttributeAccessString, decapitalize } from './../stringUtils.js'

export class generateApiCrudIndex {
  constructor(dirname, apiName, askForFields) {
    this.dirname = dirname
    this.apiName = apiName
    this.askForFields = askForFields
    this.variableName = decapitalize(apiName)
    this.composableName = `use${this.apiName}Api`
  }

  generate() {
    const headerValues = [
      ...this.askForFields.getFields().map(field => ({
        title: field.label,
        align: 'end',
        key: field.name,
      })),
      { title: 'Actions', align: 'end', key: 'actions' },
    ]

    const searchValues = [
      ...this.askForFields.getFields().map(field => ({
        name: field.name,
      })),
    ]

    const transformValues = buildAttributeAccessString(this.askForFields.getFields())

    const indexPageString
    = `<template>
  <v-row class="d-flex align-self-start py-12">
    <v-container class="text-center">
      <page-title
        :title="$t('pages.${this.variableName}.list.title')"
        icon="i-mdi:list-box"
        :links="titleLinks"
      />
      <section class="py-12">
        <v-row>
          <v-col cols="12">
            <lazy-lists-search :fields="searchFields" @submit-search="handleSearch" v-if="items !== null" />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
            <v-data-table-virtual
              v-if="items !== null"
              :headers="headers"
              :items="items.data"
              height="400"
              fixed-header
            >
            <template v-slot:item.actions="{ item }">
              <div class="d-flex ga-2 justify-end">
                <buttons-navigate 
                  :to="'/${this.variableName}/show-' + item.id"
                  color="info" 
                  :label="$t('default.form.show')" 
                  icon="i-mdi:eye"
                />
                <buttons-navigate 
                  :to="'/${this.variableName}/edit-' + item.id"
                  color="warning" 
                  :label="$t('default.form.edit')" 
                  icon="i-mdi:pen"
                />
                <buttons-action
                  color="error" 
                  :label="$t('default.form.destroy')" 
                  icon="i-mdi:trash-can"
                  :informations="{ id: item.id, name: item.name}"
                  @submit-action="handleConfirmDestroy"
                />
              </div>
            </template>
            <template v-slot:no-data>
                {{ $t('default.no_data') }}
              </template>
            </v-data-table-virtual>
          </v-col>
        </v-row>
         <v-row>
          <v-col cols="12">
            <lazy-lists-paginate 
              v-if="items !== null" 
              :pageNumber="paginateFilters.page" 
              :numberOfItems="items.count" 
              :numberPerPage="paginateFilters.per" 
              @submit-paginate="handlePaginate"
            />
          </v-col>
        </v-row>
        <lists-confirm
          icon="i-mdi:trash-can" 
          :title="$t('pages.ages.destroy.title')" 
          :text="$t('pages.ages.destroy.confirm', { name: destroyItem.name })" 
          :show="destroyItem.confirmDialog"
          :ok-text="$t('default.lists.destroy')"
          ok-icon="i-mdi:trash-can"
          ok-color="error"
          :cancel-text="$t('default.lists.cancel')"
          cancel-icon="i-mdi:cancel"
          cancel-color="info"
          @submit-close="destroyItem.confirmDialog = false"
          @submit-action="handleDestroy()"
        />
      </section>
    </v-container>
  </v-row>
</template>
<script setup lang="ts">
  import { ${this.composableName} } from '~/composables/api/${this.composableName}'
  import { useApplicationStore } from '~/stores/application'
  import { use${this.apiName}Store } from '~/stores/${this.variableName}'

  const applicationStore = useApplicationStore()
  const ${this.variableName}Store = use${this.apiName}Store()

  const searchFilters = computed(() => ${this.variableName}Store.getSearchFilters)
  const searchFields = computed(() => ${this.variableName}Store.getSearchFields)
  const paginateFilters = computed(() => ${this.variableName}Store.getPaginateFilters)
  const filters = computed(() => {
    return {
      ...(${this.variableName}Store.getSearchFilters || {}),
      ...${this.variableName}Store.getPaginateFilters
    }
  })
  const { data: items, status } = await useAsyncData('${this.variableName}-list', () => ${this.composableName}('GET', filters.value), {
    immediate: true,
    server: false,
    transform: (data) => {
      return {
        data: data.data.map((item: any) => (${transformValues})),
        count: data.meta.total_count
      }
    },
    watch: [searchFilters, paginateFilters]
  })
  const headers = reactive(${JSON.stringify(headerValues)})
  const titleLinks = reactive([
    {
      color: 'primary',
      icon: 'i-mdi:creation-outline',
      to: '/${decapitalize(this.variableName)}/new',
      label: 'pages.${decapitalize(this.variableName)}.new.title'
    }
  ])

  const destroyItem = reactive({
    id: null,
    name: '',
    confirmDialog: false
  })

  const handleConfirmDestroy = (item: { id: string, name: string }) => {
    destroyItem.id = item.id
    destroyItem.name = item.name

    destroyItem.confirmDialog = true
  }

  const handleDestroy = async (itemId: string) => {
    const dataDestroyId =  computed(() => 'ages-destroy-' + destroyItem.id)
    const { status } = await useAsyncData(dataDestroyId.value, () => ${this.composableName}('DELETE', null, destroyItem.id), {
      immediate: true,
      server: false,
    })

    destroyItem.confirmDialog = false

    if (status.value == 'success') {
      applicationStore.showSnackbar('success', 'pages.${decapitalize(this.variableName)}.destroy.success')
      
      refreshNuxtData('${this.variableName}-list')
    } else {
      applicationStore.showSnackbar('error', 'pages.${decapitalize(this.variableName)}.destroy.fail')
    }
  }

  const handleSearch = async (payload) => {
    ${this.variableName}Store.setSearchFilters(payload)

    refreshNuxtData('ages-list')
  }

  const handlePaginate = async (payload) => {
    ${this.variableName}Store.setPaginateFilters(payload)

    refreshNuxtData('ages-list')
  }
</script>`

    return indexPageString
  }
}