// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/components/partial/main/technologies.vue'

describe('Components - partial/main/technologies', async () => {
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

    expect(wrapper.vm.stats).toEqual([
      {
        value: '199k+',
        title: 'VueJS',
        url: 'https://github.com/vuejs/vue',
        star_url: `https://api.github.com/repos/vuejs/vue`
      },
      {
        value: '41k+',
        title: 'NuxtJS',
        url: 'https://github.com/nuxt/nuxt.js/',
        star_url: `https://api.github.com/repos/nuxt/nuxt.js`
      },
      {
        value: '19k+',
        title: 'Ruby',
        url: 'https://github.com/ruby/ruby',
        star_url: `https://api.github.com/repos/ruby/ruby`
      },
      {
        value: '51k+',
        title: 'Ruby on Rails',
        url: 'https://github.com/rails/rails',
        star_url: `https://api.github.com/repos/rails/rails`
      },
      {
        value: '72k+',
        title: 'Laravel',
        url: 'https://github.com/laravel/laravel',
        star_url: `https://api.github.com/repos/laravel/laravel`
      },
      {
        value: '28k+',
        title: 'Symfony',
        url: 'https://github.com/symfony/symfony',
        star_url: `https://api.github.com/repos/symfony/symfony`
      },
    ])
  })
})