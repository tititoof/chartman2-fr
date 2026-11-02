import { describe, expect, it } from 'vitest'
import { dropClientErrors } from '~/utils/sentry'

describe('dropClientErrors', () => {
  const event = { message: 'erreur' }

  it('écarte une page introuvable (404)', () => {
    const error = Object.assign(new Error('Page not found: /.env.remote'), { statusCode: 404 })
    expect(dropClientErrors(event, { originalException: error })).toBeNull()
  })

  it('écarte les autres erreurs 4xx', () => {
    expect(dropClientErrors(event, { originalException: { statusCode: 403 } })).toBeNull()
    expect(dropClientErrors(event, { originalException: { statusCode: '400' } })).toBeNull()
  })

  it('garde les erreurs serveur (5xx)', () => {
    expect(dropClientErrors(event, { originalException: { statusCode: 500 } })).toBe(event)
  })

  it('garde les exceptions sans code HTTP', () => {
    expect(dropClientErrors(event, { originalException: new TypeError('x is undefined') })).toBe(event)
    expect(dropClientErrors(event, { originalException: 'chaîne lancée' })).toBe(event)
    expect(dropClientErrors(event)).toBe(event)
  })
})
