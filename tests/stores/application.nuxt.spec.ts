
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
    expect(store.getIsDarkTheme).toEqual(true)
    expect(store.getIsThemeDefined).toEqual(false)
    expect(store.getIsPhone).toEqual(false)
    expect(store.getCategory).toEqual('')
    expect(store.getMessage).toEqual('')
    expect(store.getShow).toEqual(false)
  })
  
  it('can change isPhone value', () => {
    expect(store.getIsPhone).toEqual(false)

    store.setIsPhone(true)

    expect(store.getIsPhone).toEqual(true)
  })

  it('can change isDarkTheme value', () => {
    expect(store.getIsDarkTheme).toEqual(true)

    store.setIsDarkTheme(false)

    expect(store.getIsDarkTheme).toEqual(false)
  })

  it('can change category value', () => {
    expect(store.getCategory).toEqual('')

    store.setCategory('success')

    expect(store.getCategory).toEqual('success')
  })

  it('can change message value', () => {
    expect(store.getMessage).toEqual('')

    store.setMessage('test')

    expect(store.getMessage).toEqual('test')
  })

  it('can change show value', () => {
    expect(store.getShow).toEqual(false)

    store.setShow(true)

    expect(store.getShow).toEqual(true)
  })

  it('can toggle isDarkTheme value', () => {
    expect(store.getIsDarkTheme).toEqual(true)

    store.toggleDarkTheme()

    expect(store.getIsDarkTheme).toEqual(false)
  })
})
