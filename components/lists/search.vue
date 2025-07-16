<template>
  <v-card
    class=" mb-4 mx-auto"
    elevation="1"
    color="secondary-container"
    rounded="lg"
    prepend-icon="i-mdi:magnify"
    density="compact"
  >
    <template v-slot:append>
      <v-icon :icon="show ? 'i-mdi:chevron-up' : 'i-mdi:chevron-down'" @click="show = !show"/>
    </template>
    <template v-slot:title>
      <div class="d-flex justify-start">
        {{ $t('default.lists.search') }}
      </div>
    </template>
    <v-expand-transition>
      <section v-show="show" class="pl-3">
        <v-row dense>
          <v-col
            v-for="field in fields"
            :key="field.name"
            cols="12"
            md="3"
          >
            <v-text-field
              v-model="localData[field.name]"
              :label="$t(`pages.ages.form.fields.${field.name}`)"
              clearable
              density="compact"
              prepend-inner-icon="i-mdi:magnify"
            />
          </v-col>
        </v-row>
        <v-card-actions>
          <v-row
            dense
            class="d-flex justify-end"
          >
            <v-col
              cols="12"
              md="2"
            >
              <buttons-action
                color="error"
                :label="$t('default.buttons.reset')"
                icon="i-mdi:restore-alert"
                block
                @submit-action="handleReset"
              />
            </v-col>
            <v-col
              cols="12"
              md="2"
            >
              <buttons-action
                color="success"
                :label="$t('default.buttons.search')"
                icon="i-mdi:magnify"
                block
                @submit-action="handleSearch"
              />
            </v-col>
          </v-row>
        </v-card-actions>
      </section>
    </v-expand-transition>
  </v-card>
</template>

<script setup lang="ts">
const props = defineProps({
  fields: {
    type: Object,
    default: {},
  },
})

const emit = defineEmits(['submit-search'])

const localData = reactive({})
const show = ref(false)

const handleSearch = () => {
  emit('submit-search', { filters: { ...localData } })
}

const handleReset = () => {
  for (const key in localData) {
    localData[key] = ''
  }

  emit('submit-search', { filters: { ...localData } })
}
</script>
