import * as fs from 'fs'
import * as path from 'path'
import readlineSync from 'readline-sync'
import { decapitalize } from './../stringUtils.js'
import { generateApiCrudAuthSignInForm } from './generateApiCrudAuthSignInForm.js'
import { generateApiCrudAuthSchema } from './generateApiCrudAuthSchema.js'
import { generateApiCrudAuthComposable } from './generateApiCrudAuthComposable.js'
import { generateApiCrudAuthSignInPage } from './generateApiCrudAuthSignInPage.js'
import { generateApiCrudAuthSignOutPage } from './generateApiCrudAuthSignOutPage.js'

export class generateApiCrudAuth {
  constructor(dirname, apiName, askForFields) {
    this.dirname = dirname
    this.apiName = apiName
    this.askForFields = askForFields
    this.variableName = decapitalize(apiName)
    this.composablesDir = path.join(this.dirname, 'composables')
    this.composableName = `useAuthApi`
    this.composableFilePath = path.join(this.composablesDir, 'api', `${this.composableName}.ts`)
  }

  generate() {
    let createSignIn = readlineSync.question('Création de l\'authentification (o/N) : ')

    if (createSignIn === 'o') {
      this.generateComposable()
      this.generateSignInSchema()
      this.generateSignInForm()
      this.ganerateSignInPage()
      this.generateSignOutPage()
    }
  }

  generateComposable() {
    const authComposable = new generateApiCrudAuthComposable(this.dirname, this.apiName, this.askForFields)

    fs.writeFileSync(this.composableFilePath, authComposable.generate())
  }

  generateSignInForm() {
    const authSignIn = new generateApiCrudAuthSignInForm(this.dirname, this.apiName, this.askForFields)

    this.writeFile('form.vue', authSignIn.generate(), true)
  }

  generateSignInSchema() {
    const authSchema = new generateApiCrudAuthSchema(this.dirname, this.apiName, this.askForFields)

    fs.writeFileSync(path.join(this.composablesDir, 'schemas', `auth.ts`), authSchema.generate())
  }

  ganerateSignInPage() {
    const authSignInPage = new generateApiCrudAuthSignInPage(this.dirname, this.apiName, this.askForFields)

    this.writeFile('sign-in.vue', authSignInPage.generate())
  }

  generateSignOutPage() {
    const authSignOutPage = new generateApiCrudAuthSignOutPage(this.dirname, this.apiName, this.askForFields)

    this.writeFile('sign-out.vue', authSignOutPage.generate())
  }

  generateDashboard() {
    const content
= `<template>

</template>
<script setup lang="ts">
</script>`
  }

  writeFile(filename, fileString, isComponent) {
    // Chemin complet vers le répertoire cible
    const targetDir = path.join(this.dirname, 'pages', 'auth')

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
}