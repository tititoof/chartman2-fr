// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/components/bar/bottom.vue'

describe('Components - bar/bottom', async () => {
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
    const dayjs = useDayjs()

    expect(wrapper.vm.currentYear.value).toEqual(dayjs().year())
    expect(wrapper.vm.currentRangeYears.value).toEqual('2022-' + dayjs().year())

    expect(wrapper.vm.social).toEqual([
      {
        name: "Facebook",
        route: "https://www.facebook.com/christophe.hartmann1/",
        icon: 'i-mdi:facebook',
      },
      {
        name: "Linkedin",
        route: "https://www.linkedin.com/in/christophe-hartmann-3a297a42/",
        icon: 'i-mdi:linkedin',
      },
    ])

    expect(wrapper.vm.links).toEqual([
      {
        name: 'NuxtJS',
        icon: 'i-mdi:nuxt',
        href: 'https://nuxt.com/',
      },
      {
        name: 'Vuetify',
        icon: 'i-mdi:vuetify',
        href: 'https://vuetifyjs.com/en/',
      },
      {
        name: 'RoR',
        icon: 'i-mdi:language-ruby-on-rails',
        href: 'https://rubyonrails.org/',
      },
    ])
  })
})