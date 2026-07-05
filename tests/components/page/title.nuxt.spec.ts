// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/components/page/title.vue'

describe('Components - page/title', () => {
  it('is a Vue instance', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true
    })

    expect(wrapper.vm).toBeTruthy()
  })
})

// describe('Components - page/title', async () => {
//   afterEach(() => {
//     vi.clearAllTimers()
//   })

//   it('is a Vue instance', async () => {
//     const wrapper = await mountSuspended(TestResource, {
//       shallow: true
//     })

//     expect(wrapper.vm).toBeTruthy()
//   })
// })