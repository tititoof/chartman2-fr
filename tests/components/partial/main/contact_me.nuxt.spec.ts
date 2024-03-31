// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/components/partial/main/contact_me.vue'
import { mount } from '@vue/test-utils'

global.fetch = vi.fn()

function createFetchResponse(data) {
  return { json: () => new Promise((resolve) => resolve(data)) }
}

describe('Components - partial/main/contact_me', async () => {
  it('is a Vue instance', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true
    })

    expect(wrapper.vm).toBeTruthy()
  })

  it('has initialized values', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true
    })

    expect(wrapper.vm.valid.value).toEqual(false)
    expect(wrapper.vm.name.value).toEqual('')
    expect(wrapper.vm.email.value).toEqual('')
    expect(wrapper.vm.subject.value).toEqual('')
    expect(wrapper.vm.message.value).toEqual('')
    expect(wrapper.vm.nameRules).toBeDefined()
    expect(wrapper.vm.nameRules).toHaveLength(2)
  })

  it('cannot send email', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true
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

    wrapper.vm.name.value = 'test name'
    wrapper.vm.email.value = 'test@ŧest.com'
    wrapper.vm.subject.value = 'subject'
    wrapper.vm.message.value = 'This is a message test'
    wrapper.vm.valid.value = true
    
    wrapper.vm.sendEmail()
    
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})