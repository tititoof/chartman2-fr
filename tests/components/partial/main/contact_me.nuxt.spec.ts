// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'

import TestResource from '~~/components/partial/main/contact_me.vue'

describe('Components - partial/main/contact_me', async () => {
  it('is a Vue instance', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true,
    })

    expect(wrapper.vm).toBeTruthy()
  })

  it('has initialized values', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true,
    })

    expect(wrapper.vm.valid).toEqual(false)
    expect(wrapper.vm.name).toEqual('')
    expect(wrapper.vm.email).toEqual('')
    expect(wrapper.vm.subject).toEqual('')
    expect(wrapper.vm.message).toEqual('')
    expect(wrapper.vm.nameRules).toBeDefined()
    expect(wrapper.vm.nameRules).toHaveLength(2)
  })

  it('cannot send email', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true,
    })

    const handler = vi.fn(() => ({ error: null }))
    registerEndpoint('/api/email', { method: 'POST', handler })
    wrapper.vm.form = { validate: vi.fn().mockResolvedValue({ valid: false }) }

    await wrapper.vm.sendEmail()

    expect(wrapper.vm.form.validate).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledTimes(0)
    expect(wrapper.vm.isSubmitting).toEqual(false)
  })

  it('can send email', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true
    })

    const handler = vi.fn(async event => {
      return { body: await readBody(event), error: null }
    })
    registerEndpoint('/api/email', { method: 'POST', handler })

    wrapper.vm.name = 'test name'
    wrapper.vm.email = 'test@ŧest.com'
    wrapper.vm.subject = 'subject'
    wrapper.vm.message = 'This is a message test'
    wrapper.vm.form = { validate: vi.fn().mockResolvedValue({ valid: true }) }

    await wrapper.vm.sendEmail()

    expect(handler).toHaveBeenCalledTimes(1)
    expect(await handler.mock.results[0].value).toEqual({
      body: {
        name: 'test name',
        email: 'test@ŧest.com',
        subject: 'subject',
        message: 'This is a message test'
      },
      error: null,
    })
    expect(wrapper.vm.isSubmitting).toEqual(false)
  })
})
