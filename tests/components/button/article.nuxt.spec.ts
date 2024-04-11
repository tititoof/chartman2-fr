// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/components/button/article.vue'

describe('Components - button/article', async () => {
  it('is a Vue instance', async () => {
    const wrapper = await mountSuspended(TestResource, {})

    expect(wrapper.vm).toBeTruthy()
  })
})
