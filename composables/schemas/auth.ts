import { z } from 'zod'

export const formSchema = z.object({
  email: z.string().email('default.form.error.string.email').max(255, 'default.form.error.string.max'),
  password: z.string().min(6, 'default.form.error.string.min_6').max(255, 'default.form.error.string.max'),
})

export type FormData = z.infer<typeof formSchema>