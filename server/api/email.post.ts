export default defineEventHandler(async (event) => {
  const { emails } = useResend()
  const body = await readBody(event)

  const result = await emails.send({
    from: 'onboarding@resend.dev',
    to: ['chartman2.fr@gmail.com'],
    subject: '[WEBSITE - Email]',
    text: "Nom : " + body.name + "\n" +
    "Email : " + body.email + "\n" +
    "Sujet : " + body.subject + "\n" +
    "Message : " + body.message + "\n"
  })

  return result
})