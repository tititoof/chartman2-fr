import * as fs from 'fs'
import * as path from 'path'
import { askForFields } from './../askForFields.js'
import { decapitalize } from './../stringUtils.js'
import { generateApiCrudIndex } from './generateApiCrudIndex.js'
import { generateApiCrudForm } from './generateApiCrudForm.js'
import { generateApiCrudFormSchema } from './generateApiCrudFormSchema.js'
import { generateApiCrudNew } from './generateApiCrudNew.js'
import { generateApiCrudEdit } from './generateApiCrudEdit.js'
import { generateApiCrudShow } from './generateApiCrudShow.js'
import { generateApiCrudTranslations } from './generateApiCrudTranslations.js'
import { generateApiCrudAuth } from './../auth/generateApiCrudAuth.js'
import { generateApiCrudStore } from './generateApiCrudStore.js'

export class generateApiCrudPages {
  constructor(dirname, apiName) {
    this.dirname = dirname
    this.apiName = apiName
    this.variableName = decapitalize(apiName)

    this.pagesDir = path.join(decapitalize(this.dirname), 'pages')
    this.composableName = `use${this.apiName}Api`
    this.pagesFilePath = path.join(this.pagesDir, `${this.composableName}.ts`)

    this.askForFields = new askForFields()
  }

  generate() {
    this.askForFields.ask()

    const translations = new generateApiCrudTranslations(this.dirname, this.apiName, this.askForFields)
    translations.create()
    const generateAuth = new generateApiCrudAuth(this.dirname, this.apiName, this.askForFields)
    generateAuth.generate()

    this.generateIndexPage()
    this.generateFormComponent()
    this.generateShowPage()
    this.generateNewPage()
    this.generateEditPage()
    this.writeTestsFiles()
    this.generateStore()
  }

  buildAttributeAccessString(items, base = 'item.attributes') {
    const keys = ['id', ...items.map(item => item.name)]
    return `{ ${keys.map(key => `${key}: ${base}.${key}`).join(', ')} }`
  }

  generateIndexPage() {
    const indexPage = new generateApiCrudIndex(this.dirname, this.apiName, this.askForFields)

    this.writeFile('index.vue', indexPage.generate())
  }

  generateShowPage() {
    const showPageString = new generateApiCrudShow(this.dirname, this.apiName, this.askForFields)

    this.writeFile('show-[id].vue', showPageString.generate())
  }

  generateFormComponent() {
    const formComponent = new generateApiCrudForm(this.dirname, this.apiName, this.askForFields)
    const formSchema = new generateApiCrudFormSchema(this.dirname, this.apiName, this.askForFields)

    this.writeFile('form.vue', formComponent.generate(), true)
    this.writeSchemaFile(`${this.variableName}.ts`, formSchema.generate())
  }

  generateNewPage() {
    const newPageString = new generateApiCrudNew(this.dirname, this.apiName, this.askForFields)

    this.writeFile('new.vue', newPageString.generate())
  }

  generateEditPage() {
    const editPageString = new generateApiCrudEdit(this.dirname, this.apiName, this.askForFields)

    this.writeFile('edit-[id].vue', editPageString.generate())
  }

  generateStore() {
    const storeGeneration = new generateApiCrudStore(this.dirname, this.apiName, this.askForFields)

    storeGeneration.generate()
  }

  writeFile(filename, fileString, isComponent) {
    // Chemin complet vers le répertoire cible
    const targetDir = path.join(this.dirname, 'pages', decapitalize(this.apiName))

    // Vérifiez si le répertoire existe, sinon créez-le
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    if (isComponent) {
      const componentsDir = path.join(targetDir, 'components')
      if (!fs.existsSync(componentsDir)) {
        fs.mkdirSync(componentsDir, { recursive: true })
      }

      fs.writeFileSync(path.join(componentsDir, filename), fileString)
    } else {
      fs.writeFileSync(path.join(targetDir, filename), fileString)
    }
  }

  writeSchemaFile(filename, fileString) {
    const targetDir = path.join(this.dirname, 'composables', 'schemas')

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    fs.writeFileSync(path.join(targetDir, filename), fileString)
  }

  generatePageTest(variableName, pageName, pagePath, filename, expectedText) {
    return `
// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/pages/${variableName}/${filename}.vue'

describe('${pageName}', async () => {
  it('is a Vue instance', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true
    })

    expect(wrapper.vm).toBeTruthy()
  })
})
`
  }

  generatePageFormTest(variableName, pageName, pagePath, filename, expectedText) {
    const formData = this.askForFields.getFields().map((field) => {
      let defaultValue = '\'\''

      switch (field.type) {
        case 'number':
          defaultValue = '0'
          break
        case 'checkbox':
          defaultValue = 'false'
          break
        case 'select':
          defaultValue = '\'\'' // tu peux aussi mettre `null` si tu préfères
          break
        // Ajoute d'autres types si besoin
        default:
          defaultValue = '\'\''
      }

      return `    ${field.name}: ${defaultValue}`
    }).join(',\n')

    const formDataAssignments = this.askForFields.getFields().map((field) => {
      let testValue

      switch (field.type) {
        case 'number':
          // Génère un nombre aléatoire entre 1 et 100
          testValue = Math.floor(Math.random() * 100) + 1
          break
        case 'checkbox':
          testValue = Math.random() < 0.5 ? 'false' : 'true'
          break
        case 'select':
          testValue = `'test'`
          break
        default:
          testValue = `'testing ${field.name}'`
      }

      return `wrapper.vm.localData.${field.name} = ${testValue}`
    }).join('\n')

    return `
// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/pages/${variableName}/components/${filename}.vue'

describe('${pageName}', async () => {
  const props = {
    formData: {
      ${formData}
    }
  }

  it('is a Vue instance', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true,
      props
    })

    expect(wrapper.vm).toBeTruthy()
  })

  it('emits submit-form on submit', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true,
      props
    })
    
    await wrapper.vm.submitForm()

    expect(wrapper.emitted('submit-form')).toBeUndefined()
  })

  it('emits submit-form on submit', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true,
      props
    })

    ${formDataAssignments}

    await wrapper.vm.submitForm()

    expect(wrapper.emitted('submit-form')).toBeTruthy()
  })
})
`
  }

  writeTestsFiles() {
    const variableName = decapitalize(this.apiName)
    const pages = [
      { page: variableName, filename: 'index', name: variableName + ' - index', path: '/' + variableName, text: '$t(\'pages.${this.variableName}.list.title\')', form: false },
      { page: variableName, filename: 'new', name: variableName + ' - new', path: '/' + variableName + '/new', text: '$t(\'pages.${this.variableName}.new.title\')', form: true },
      { page: variableName, filename: 'show-[id]', name: variableName + ' - show', path: '/' + variableName + '/show', text: '$t(\'pages.${this.variableName}.show.title\')', form: false },
      { page: variableName, filename: 'edit-[id]', name: variableName + ' - edit', path: '/' + variableName + '/edit', text: '$t(\'pages.${this.variableName}.edit.title\')', form: true },
    ]
    const targetDir = path.join(this.dirname, 'tests', 'unit', 'pages', variableName)

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    for (const page of pages) {
      const testContent = this.generatePageTest(page.page, page.name, page.path, page.filename, page.text)

      fs.writeFileSync(
        path.join(targetDir, `${page.filename}.nuxt.spec.ts`),
        testContent,
        'utf-8',
      )
    }

    const testFormContent = this.generatePageFormTest(variableName, variableName, '', 'form', '')

    fs.writeFileSync(
      path.join(targetDir, `form.nuxt.spec.ts`),
      testFormContent,
      'utf-8',
    )
  }
}