// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/components/partial/main/skills.vue'
import { CSkills, CSkillsCICD } from '~/utils/common'

describe('Components - partial/main/skills', async () => {
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

    expect(wrapper.vm.skills).toEqual([...CSkills, CSkillsCICD])
  })
})
