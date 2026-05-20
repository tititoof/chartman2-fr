// tests/composables/article/useArticleForm.spec.ts
import { describe, it, expect } from 'vitest'
import { useArticleForm } from '~/composables/article/useArticleForm'

const articleData = {
  name: 'Test Article',
  content: 'This is a test article.'
}

describe('useArticleForm', () => {
  it('initialise le formulaire avec les valeurs par défaut', () => {
    const { form } = useArticleForm()
    expect(form).toBeDefined()
  })

  it('fill() met à jour les valeurs du formulaire', () => {
    const { form, fill } = useArticleForm()
    fill(articleData)
    // Vérifie que les champs sont mis à jour
    Object.keys(articleData).forEach(key => {
      expect((form as any)[key]).toBe(articleData[key])
    })
  })

  it('reset() remet le formulaire à son état initial', () => {
    const { form, fill, reset } = useArticleForm()
    const initial = { ...form }
    fill({ name: 'Updated Article', content: 'This is an updated article.' } as any)
    reset()
    Object.keys(initial).forEach(key => {
      expect((form as any)[key]).toBe((initial as any)[key])
    })
  })

  it('isValid est false si les champs requis sont vides', () => {
    const { form, isValid } = useArticleForm()
    fill({ name: '', content: '' } as any)
    expect(isValid.value).toBe(false)
  })
})
