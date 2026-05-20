// composables/article/useArticleForm.ts
import type { CreateArticlePayload, UpdateArticlePayload } from '~/types/Article'

export const useArticleForm = (initialData?: Partial<CreateArticlePayload>) => {
  const initialState: CreateArticlePayload = {
    name: '',
    content: ''
    ...initialData
  }

  const form = reactive<CreateArticlePayload>({ ...initialState })

  const rules = {
    name: [
      (v: unknown) => !!v || 'Nom de l'article est requis',
      (v: unknown) => Number(v.length) >= 6 || 'Minimum 6 caractères',
      (v: unknown) => Number(v.length) <= 255 || 'Maximum 255 caractères'
    ],
    content: [
      (v: unknown) => !!v || 'Contenu de l'article est requis',
      (v: unknown) => Number(v.length) >= 20 || 'Minimum 20 caractères',
      (v: unknown) => Number(v.length) <= 5000 || 'Maximum 5000 caractères'
    ]
  }

  const reset = () => Object.assign(form, initialState)

  const isValid = computed(() =>
    Object.entries(rules).every(([key, fieldRules]) =>
      (fieldRules as Array<(v: unknown) => true | string>)
        .every(rule => rule((form as Record<string, unknown>)[key]) === true)
    )
  )

  const fill = (data: Partial<CreateArticlePayload | UpdateArticlePayload>) =>
    Object.assign(form, data)

  return { form, rules, reset, isValid, fill }
}