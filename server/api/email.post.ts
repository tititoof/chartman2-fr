import { defineEventHandler, readValidatedBody } from 'nuxt/server'
import { z } from 'zod'

// nuxt/server instead of h3's auto-imported helpers: the same handler runs on
// Nitro 2 today and on Nitro 3 (Nuxt 5) without changes.

// Same rules as the contact form (app/components/partial/main/contact_me.vue):
// the form only checks them in the browser
const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  subject: z.string().trim().min(5),
  message: z.string().trim().min(15),
})

export default defineEventHandler(async (event) => {
  // Invalid input is rejected with a 400 listing the issues, before any call to Resend
  const body = await readValidatedBody(event, contactSchema)
  const { emails } = useResend()

  return await emails.send({
    from: 'onboarding@resend.dev',
    to: ['chartman2.fr@gmail.com'],
    subject: '[WEBSITE - Email]',
    text: 'Nom : ' + body.name + '\n'
      + 'Email : ' + body.email + '\n'
      + 'Sujet : ' + body.subject + '\n'
      + 'Message : ' + body.message + '\n',
  })
})
