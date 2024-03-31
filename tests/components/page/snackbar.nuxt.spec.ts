// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/components/page/snackbar.vue'

describe('Components - page/snackbar', async () => {
  it('is a Vue instance', async () => {
    const wrapper = await mountSuspended('<v-layout>' + TestResource + '</v-layout>', {})

    expect(wrapper.vm).toBeTruthy()
  })
})