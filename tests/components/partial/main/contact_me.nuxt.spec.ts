// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/components/partial/main/contact_me.vue'

global.fetch = vi.fn()

function createFetchResponse(data) {
  return { json: () => new Promise((resolve) => resolve(data)) }
}

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

    fetch.mockResolvedValue(createFetchResponse(true))

    wrapper.vm.sendEmail()

    expect(fetch).toHaveBeenCalledTimes(0)
  })

  it('can send email', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true
    })

    fetch.mockResolvedValue(createFetchResponse(true))

    wrapper.vm.name = 'test name'
    wrapper.vm.email = 'test@ŧest.com'
    wrapper.vm.subject = 'subject'
    wrapper.vm.message = 'This is a message test'
    wrapper.vm.valid = true

    wrapper.vm.sendEmail()

    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
