// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/components/articles/categories.vue'

describe('Components - articles/categories', async () => {
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

    expect(wrapper.vm.articles).toEqual([
      {
        type: 'icon',
        src: 'i-mdi:language-ruby',
        color: 'red',
        title: 'Ruby',
        text: 'Ruby & Ruby on Rails.',
        link: '/blog/category/ror',
      },
      {
        type: 'icon',
        src: 'i-mdi:nuxt',
        color: 'green',
        title: 'Nuxt',
        text: 'Framework Nuxt, Vuetify...',
        link: '/blog/category/nuxt',
      },
      {
        type: 'icon',
        src: 'i-mdi:docker',
        color: 'blue',
        title: 'Docker',
        text: 'Docker, les containers, docker compose...',
        link: '/blog/category/docker',
      },
      {
        type: 'icon',
        src: 'i-mdi:checkbox-marked-circle-plus-outline',
        color: 'secondary',
        title: 'To-do list',
        text: 'Construction d\'une To-do liste avec Nuxt & Rails.',
        link: '/blog/category/todolist',
      },
    ])
  })
})
