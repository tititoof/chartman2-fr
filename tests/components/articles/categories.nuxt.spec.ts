// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/components/articles/categories.vue'

describe('Components - articles/categories', async () => {
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
        src: 'i-mdi:language-ruby',
        color: "red",
        title: "Ruby",
        text: "Articles autour du langage Ruby.",
        link: "/blog/category/ruby",
      },
      {
        type: "icon",
        src: 'i-mdi:language-javascript',
        color: "green",
        title: "Javascript",
        text: "Articles autour du langage Javascript.",
        link: "/blog/category/javascript",
      },
    ])
  })
})