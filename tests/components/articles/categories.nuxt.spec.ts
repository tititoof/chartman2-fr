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
        text: 'Framework Nuxt, Vuetify',
        link: '/blog/category/nuxt',
      },
      {
        type: 'icon',
        src: 'i-mdi:language-php',
        color: 'secondary',
        title: 'PHP',
        text: 'Articles autour de PHP.',
        link: '/blog/category/php',
      },
      {
        type: 'icon',
        src: 'i-mdi:docker',
        color: 'blue',
        title: 'Docker',
        text: 'Conteneurisation, Traefik, CI/CD et infrastructure 100% self-hosted.',
        link: '/blog/category/docker',
      },
      {
        type: 'icon',
        src: 'i-mdi:checkbox-marked-circle-plus-outline',
        color: 'secondary',
        title: 'To-do list',
        text: 'Projet full-stack Nuxt 4 + Rails 8 : authentification BFF, API REST et tests.',
        link: '/blog/category/todolist',
      },
      {
        type: 'icon',
        src: 'i-mdi:shield-home',
        color: 'teal',
        title: 'Self-Hosted',
        text: 'Divers services que l\'on peut self hosted.',
        link: '/blog/category/selfhosted',
      },
    ])
  })
})
