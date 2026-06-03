<script setup lang="ts">
interface Props {
  modelValue: string
  label?:     string
  debounce?:  number
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  label:    'Rechercher',
  debounce: 300
})

const emit    = defineEmits<Emits>()
const local   = ref(props.modelValue)
let   timer: ReturnType<typeof setTimeout>

watch(local, (val) => {
  clearTimeout(timer)
  timer = setTimeout(() => emit('update:modelValue', val), props.debounce)
})
</script>

<template>
  <v-text-field
    v-model="local"
    :label="props.label"
    append-inner-icon="mdi-magnify"
    clearable
    class="mb-6"
  />
</template>