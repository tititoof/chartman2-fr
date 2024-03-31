// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/components/partial/main/articles.vue'

describe('Components - partial/main/articles', async () => {
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

    expect(wrapper.vm.articles).toEqual([
      {
        type: "icon",
        src: 'i-mdi:language-ruby-on-rails',
        color: "red",
        title: "Design pattern",
        text: "Mon design pattern utilisé au quotidien avec Ruby on Rails.",
        link: "/blog/my_ror_design",
      },
      {
        type: "icon",
        src: 'i-mdi:nuxt',
        color: "green",
        title: "Nuxt 3",
        text: "Petite introduction sur le framework Nuxt.",
        link: "/blog/nuxt_3_introduction",
      },
    ])
  })
})