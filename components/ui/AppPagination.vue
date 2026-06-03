<script setup lang="ts">
interface Props {
  modelValue: number
  total:      number
  perPage?:   number
}

interface Emits {
  (e: 'update:modelValue', value: number): void
}

const props = withDefaults(defineProps<Props>(), {
  perPage: 10
})

const emit  = defineEmits<Emits>()
const pages = computed(() => Math.ceil(props.total / props.perPage))
</script>

<template>
  <v-pagination
    v-if="pages > 1"
    :model-value="props.modelValue"
    :length="pages"
    @update:model-value="emit('update:modelValue', $event)"
    class="mt-6"
  />
</template>