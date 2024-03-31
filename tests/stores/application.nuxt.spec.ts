
// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useApplicationStore } from '~/stores/application.ts'

describe('Store: User', () => {
    let store = null

    beforeEach(() => {
        // create a fresh Pinia instance and make it active so it's automatically picked
        // up by any useStore() call without having to pass it to it:
        // useStore(pinia)
        setActivePinia(createPinia())

        // create an instance of the data store
        store = useApplicationStore()
    })

    it('initializes with correct values', () => { 
    })
    
    it.todo('unimplemented test')
})
