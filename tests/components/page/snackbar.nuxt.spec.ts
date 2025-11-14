// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'

import TestResource from '~~/components/page/snackbar.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'fr',
  messages: { fr: { 'test.message': 'Message traduit' } },
})

describe('Components - page/snackbar', async () => {
  it('is a Vue instance', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true,
      global: {
        plugins: [i18n]
      }
    })

    expect(wrapper.vm).toBeTruthy()
  })
})