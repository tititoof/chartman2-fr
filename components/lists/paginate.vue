<template>
  <v-sheet color="secondary-container" height="65" rounded="lg">
    <v-row class="mt-1">
      <v-col cols="2">
        <v-select
          class="ml-4"
          v-model="localData.numberPerPage"
          :items="numbersPerPage"
          density="compact"
          :label="$t('default.lists.per')"
        />
      </v-col>
      <v-col
        cols="10"
        class="d-flex justify-end"
      >
        <v-pagination
          class="pr-4"
          v-model="localData.pageNumber"
          :length="totalPages"
          :total-visible="totalPages"
          density="compact"
          rounded="circle"
        />
      </v-col>
    </v-row>
  </v-sheet>
</template>

<script setup lang="ts">
const props = defineProps({
  numberPerPage: {
    type: String,
    default: 15,
  },
  pageNumber: {
    type: Number,
    default: 1,
  },
  numberOfItems: {
    type: Number,
    default: 1,
  },
})
const emit = defineEmits(['submit-paginate'])
const localData = reactive({ ...props })

const numbersPerPage = reactive(['5', '15', '25', '50', '100', '200'])
const totalPages = computed(() => {
  return Math.ceil(props.numberOfItems / props.numberPerPage)
})

const handleChange = () => {
  emit('submit-paginate', { page: localData.pageNumber, per: localData.numberPerPage })
}

watch(
  () => [localData.numberPerPage, localData.numberOfItems, localData.pageNumber],
  (
    newValues: [number, number, number], oldValues: [number, number, number]
  ) => {
    const [newNumberPerPage, newNumberOfItems, newPageNumber] = newValues
    const [oldNumberPerPage, oldNumberOfItems, oldPageNumber] = oldValues || []
    const recalculatedTotalPages = Math.max(1, Math.ceil(props.numberOfItems / props.numberPerPage))

    if (localData.pageNumber > recalculatedTotalPages) {
      localData.pageNumber = 1
    }

    if (oldValues === undefined) {
      return
    }

    if (
      newNumberPerPage !== oldNumberPerPage ||
      newNumberOfItems !== oldNumberOfItems ||
      newPageNumber !== oldPageNumber
    ) {
      handleChange()
    }
  },
  { immediate: true },
)

watch(() => [props.numberPerPage, props.numberOfItems, props.pageNumber],
  (
    newValues: [number, number, number], 
    oldValues: [number, number, number]
  ) => {
    const [newNumberPerPage, newNumberOfItems, newPageNumber] = newValues
    const [oldNumberPerPage, oldNumberOfItems, oldPageNumber] = oldValues || []

    const recalculatedTotalPages = Math.max(1, Math.ceil(newNumberOfItems / newNumberPerPage))

    if (localData.pageNumber > recalculatedTotalPages) {
      localData.pageNumber = 1
    }
})
</script>