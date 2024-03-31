#!/bin/bash

# Choix du type

function create-directory {
    local dir=$(dirname "$1")
    local parent_dir=$(pwd)

    echo "dir : ${parent_dir}/${dir}"
    if [ -d "$dir" ]; then
        echo "Répertoire existant"
    else
        mkdir -p "${parent_dir}/${dir}"
    fi
}

function create-file {
    local parent_dir=$(pwd)

    touch "${parent_dir}/$1"
}

function initialize-page {
    local parent_dir=$(pwd)

    echo "
<template>
</template>
<script setup>
</script>" >> "${parent_dir}/$1"
}

function initialize-component {
    local parent_dir=$(pwd)

    echo "
<template>
</template>
<script setup>
</script>" >> "${parent_dir}/$1"
}

function initialize-composable {
    local parent_dir=$(pwd)
    local name=$(basename "$1")

    echo "
export const ${name} = () => {

}" >> "${parent_dir}/$1.ts"
}

function initialize-store {
    local parent_dir=$(pwd)
    local name=$(basename "$1")

    echo "
import { defineStore, acceptHMRUpdate } from 'pinia'

export const use${name^}Store = defineStore('${name}', {
    state: () => ({

    }),
    getters: {

    },
    actions: {

    },
    persist: {
        storage: persistedState.localStorage,
    },
})

if (Object.hasOwn(import.meta, 'hot')) {
    // @ts-ignore
    import.meta.hot.accept(acceptHMRUpdate(useApplicationStore, import.meta.hot))
}" >> "${parent_dir}/$1.ts"
}

function initialize-test {
    local parent_dir=$(pwd)
    local name=$(basename "$1")

    echo "
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/$1.vue'

describe('$1', () => {
    it('is a Vue instance', async () => {

        const wrapper = await mountSuspended(TestResource, {})

        expect(wrapper.vm).toBeTruthy()
    })
})" >> "${parent_dir}/$2"
}

function initialize-store-test {
    local parent_dir=$(pwd)
    local name=$(basename "$1")

    echo "
// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { use${name^}Store } from '~/stores/${name}.ts'

describe('Store: ${name^}', () => {
    let store = null

    beforeEach(() => {
        // create a fresh Pinia instance and make it active so it's automatically picked
        // up by any useStore() call without having to pass it to it:
        // useStore(pinia)
        setActivePinia(createPinia())

        // create an instance of the data store
        store = use${name^}Store()
    })

    it('initializes with correct values', () => { 
    })

    it.todo('unimplemented test')
})"  >> "${parent_dir}/tests/$1.nuxt.spec.ts"
}

function initialize-composable-test {
    local parent_dir=$(pwd)
    local name=$(basename "$1")

    echo "
import { describe, it, expect, beforeEach } from 'vitest'

describe('Composable: ${name^}', () => {
    it.todo('unimplemented test')
})" >> "${parent_dir}/tests/$1.nuxt.spec.ts"
}

echo "Quel type de fichier voulez vous créer ?"
read -p "Sélection : " choice

case $choice in
    "page")
        read -p "Nom de la page : " name

        create-directory pages/${name}
        create-directory tests/pages/${name}

        create-file pages/${name}.vue
        initialize-page pages/${name}.vue

        create-file tests/pages/${name}.nuxt.spec.ts
        initialize-test pages/${name} tests/pages/${name}.nuxt.spec.ts
        ;;
    "component")
        read -p "Nom du component : " name
        
        create-directory components/${name}
        create-directory tests/components/${name}

        create-file components/${name}.vue
        initialize-component components/${name}.vue

        create-file tests/components/${name}.nuxt.spec.ts
        initialize-test components/${name} tests/components/${name}.nuxt.spec.ts
        ;;
    "composable")
        read -p "Nom du composable : " name
        
        create-directory composables/${name}
        create-directory tests/composables/${name}

        create-file composables/${name}.ts
        initialize-composable composables/${name}

        create-file tests/composables/${name}.nuxt.spec.ts
        initialize-composable-test composables/${name} tests/composables/${name}.nuxt.spec.ts
        ;;
    "store")
        read -p "Nom du store : " name
        
        create-directory stores/${name}
        create-directory tests/stores/${name}

        create-file stores/${name}.ts
        initialize-store stores/${name}

        create-file tests/stores/${name}.nuxt.spec.ts
        initialize-store-test stores/${name}
        ;;
    *)
        echo "Option invalide"
        ;;
esac

