import * as fs from 'fs'
import * as path from 'path'
import readlineSync from 'readline-sync'
import { isPascalCasePlural } from './stringUtils.js'
import { generateApiCrudComposable } from './pages/generateApiCrudComposable.js'
import { generateApiCrudPages } from './pages/generateApiCrudPages.js'

const __dirname = new URL('..', import.meta.url).pathname

let apiName = readlineSync.question('Saisissez le nom de l\'API : ')
let apiEndPoint = readlineSync.question('Saisissez l\'endpoint l\'API : ')

if (apiName === null || apiName.trim() === '' || !isPascalCasePlural(apiName)) {
  console.log('Nom de l\'API vide. Arrêt.')
  console.log(apiName)
  process.exit(1)
}

const composableGenerator = new generateApiCrudComposable(__dirname, apiName, apiEndPoint)

composableGenerator.ensureUsePluginApi()
composableGenerator.ensureUseBackendApi()
composableGenerator.generateComposable()

const pagesGenerator = new generateApiCrudPages(__dirname, apiName)

pagesGenerator.generate()
