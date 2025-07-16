<template>
  <v-row
    v-if="$apiErrors !== null && Object.keys($apiErrors).length > 0"
    v-aos="['animate__zoomIn']"
  >
    <v-col
      cols="12"
      md="12"
    >
      <v-alert
        border="top"
        type="warning"
        prominent
      >
        <v-row
          v-for="(messages, field) in $apiErrors"
          :key="field"
        >
          <v-col
            cols="4"
            class="text-right"
          >
            <strong>
              {{ props.fieldsName[field] }}
            </strong>
          </v-col>
          <v-col cols="8">
            <v-row
              v-for="(msg, i) in messages"
              :key="i"
            >
              <v-col
                cols="12"
                class="text-left"
              >
                {{ $t('default.form.errors.' + msg) }}
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-alert>
    </v-col>
  </v-row>
</template>

<script lang="ts" setup>
const props = defineProps({
  fieldsName: {
    type: Object,
    default: {},
  },
})

const { $apiErrors } = useNuxtApp()
</script>
