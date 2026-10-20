// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/components/partial/main/hero.vue'

describe('Components - partial/main/hero', async () => {
  it('is a Vue instance', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true,
    })

    expect(wrapper.vm).toBeTruthy()
  })
})
