// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/components/bar/top.vue'

describe('Components - bar/top', async () => {
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

    expect(wrapper.vm.menuItems).toEqual([
      {
        name: 'legal_notices.title',
        icon: 'i-mdi:scale-balance',
        to: '/legal_notices',
      },
      {
        name: 'default.auth.sign_in.title',
        icon: 'i-mdi:login-variant',
        to: '/auth/sign-in',
      },
      {
        icon: 'i-mdi:logout-variant',
        name: 'default.auth.sign_out.title',
        to: '/auth/sign-out',
      },
    ])
  })
})
