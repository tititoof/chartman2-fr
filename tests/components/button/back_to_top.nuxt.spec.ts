// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/components/button/back_to_top.vue'

describe('Components - button/back_to_top', async () => {
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

    expect(wrapper.vm.showBackToTop).toEqual(false)
  })

  it('has functions worked', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true,
    })

    expect(wrapper.vm.showBackToTop).toEqual(false)

    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    wrapper.vm.scrollToTop()

    expect(window.scrollTo).toHaveBeenCalled()

    wrapper.vm.showBackToTop = true

    expect(wrapper.vm.showBackToTop).toEqual(true)

    wrapper.vm.handleScroll()

    expect(wrapper.vm.showBackToTop).toEqual(false)
  })
})
