import readlineSync from 'readline-sync'
import { capitalize } from './stringUtils.js'

export class askForFields {
  constructor() {
    this.fields = []
  }

  ask() {
    let continueFields = true

    while (continueFields) {
      let fieldName = readlineSync.question('Saisissez le nom du champ (q pour arrêter):').toLowerCase()
      if (fieldName === 'q') break

      let fieldLabel = readlineSync.question('Saisissez le label du champ (q pour arrêter):').toLowerCase()
      if (fieldLabel === 'q') break

      let fieldType = readlineSync.question('Saisissez le type de champ (text, select, checkbox) :').toLowerCase()
      let options = []

      if (fieldType === 'select' || fieldType === 'checkbox') {
        options = this.askFieldOptions()
      }

      this.fields.push({
        name: fieldName,
        label: capitalize(fieldLabel),
        type: fieldType,
        options: options,
      })

      let test = readlineSync.question('voulez vous continuer ?(q pour arrêter):').toLowerCase()
      if (test === 'q') continueFields = false
    }
  }

  askFieldOptions() {
    let options = []
    let continueOptions = true

    while (continueOptions) {
      let optionName = readlineSync.question('Saisissez le nom de l\'option :')

      if (optionName === 'q') break

      let optionValue = readlineSync.question('Saisissez la valeur de l\'option :')

      options.push({ title: optionName, value: optionValue })

      let test = readlineSync.question('voulez vous continuer ?(q pour arrêter):')

      if (test === 'q') continueOptions = false
    }

    return options
  }

  getFields() {
    return this.fields
  }
}
