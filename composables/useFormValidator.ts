import { ref } from 'vue'
import type { ZodSchema } from 'zod'

export function useFormValidator<T extends Record<string, any>>(formSchema: ZodSchema<T>) {
  const errors = ref<Record<keyof T, string | null>>({} as any)

  const validate = (localData: T): boolean => {
    const result = formSchema.safeParse(localData)

    if (!result.success) {
      const formattedErrors = Object.fromEntries(
        result.error.errors.map(err => [err.path[0], err.message])
      )

      // Assure que chaque champ a une valeur null ou une erreur
      const allFields = Object.keys(localData) as (keyof T)[]
      errors.value = allFields.reduce((acc, key) => {
        acc[key] = formattedErrors[key] || null
        return acc
      }, {} as Record<keyof T, string | null>)

      console.log('erreur', result, localData)
      return false
    }

    // Reset les erreurs si tout va bien
    const allFields = Object.keys(localData) as (keyof T)[]
    errors.value = allFields.reduce((acc, key) => {
      acc[key] = null
      return acc
    }, {} as Record<keyof T, string | null>)

    return true
  }

  return {
    errors,
    validate
  }
}