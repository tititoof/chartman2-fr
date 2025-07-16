import * as fs from 'fs'
import * as path from 'path'
import { decapitalize, singularize } from './../stringUtils.js'

export class generateApiCrudTranslations {
  constructor(dirname, apiName, askForFields) {
    this.dirname = dirname
    this.apiName = apiName
    this.askForFields = askForFields
    this.variableName = decapitalize(apiName)
    this.targetDir = path.join(this.dirname, 'i18n', 'locales')
    this.frJson = JSON.parse(fs.readFileSync(path.join(this.targetDir, 'fr.json'), 'utf-8'))
    this.enJson = JSON.parse(fs.readFileSync(path.join(this.targetDir, 'en.json'), 'utf-8'))
  }

  addTranslationSection(json, sectionKey, translations) {
    if (!json || typeof json !== 'object') {
      throw new Error('Le fichier JSON est invalide.')
    }

    if (!json.pages) {
      json.pages = {}
    }

    if (json.pages.hasOwnProperty(sectionKey)) {
      console.warn(`La section "${sectionKey}" existe déjà. Elle sera remplacée.`)
    }

    json.pages[sectionKey] = translations

    return json
  }

  ensureDefaultSection(json) {
    if (!json.default) {
      json.default = {}
    }

    if (typeof json.default !== 'object') {
      throw new Error('"default" doit être un objet.')
    }

    // unknow
    if (!json.default.unknow) {
      json.default.unknow = 'Inconnu'
    }

    // form
    if (!json.default.form || typeof json.default.form !== 'object') {
      json.default.form = {}
    }

    if (!json.default.form.save) {
      json.default.form.save = 'Enregistrer'
    }

    if (!json.default.form.back) {
      json.default.form.back = 'Retour'
    }

    if (!json.default.form.cancel) {
      json.default.form.cancel = 'Annuler'
    }

    // Lists
    if (!json.default.lists || typeof json.default.lists !== 'object') {
      json.default.lists = {}
    }

    if (!json.default.lists.per) {
      json.default.lists.per = 'Nombre par page'
    }

    // buttons
    if (!json.default.buttons || typeof json.default.buttons !== 'object') {
      json.default.buttons = {}
    }

    if (!json.default.buttons.create) {
      json.default.buttons.create = 'Créer'
    }

    if (!json.default.buttons.show) {
      json.default.buttons.show = 'Visualiser'
    }

    if (!json.default.buttons.edit) {
      json.default.buttons.edit = 'Modifier'
    }

    if (!json.default.buttons.destroy) {
      json.default.buttons.destroy = 'Supprimer'
    }

    // Auth
    if (!json.default.auth || typeof json.default.auth !== 'object') {
      json.default.auth = {}
    }

    if (!json.default.auth.sign_in || typeof json.default.auth.sign_in !== 'object') {
      json.default.auth.sign_in = {}
    }

    if (!json.default.auth.sign_out || typeof json.default.auth.sign_out !== 'object') {
      json.default.auth.sign_out = {}
    }

    if (!json.default.auth.sign_out.title) {
      json.default.auth.sign_out.title = 'Déconnexion'
    }

    if (!json.default.auth.sign_out.text) {
      json.default.auth.sign_out.text = 'Déconnexion en cours, veuillez patienter.'
    }

    if (!json.default.auth.sign_out.success) {
      json.default.auth.sign_out.success = 'Déconnexion effectuée avec succès.'
    }

    if (!json.default.auth.sign_out.fail) {
      json.default.auth.sign_out.fail = 'Une erreur s\'est produite lors de la tentative de déconnexion.'
    }

    if (!json.default.auth.sign_in.title) {
      json.default.auth.sign_in.title = 'Connexion'
    }

    if (!json.default.auth.sign_in.success) {
      json.default.auth.sign_in.success = 'Connexion effectuée avec succès.'
    }

    if (!json.default.auth.sign_in.fail) {
      json.default.auth.sign_in.fail = 'Une erreur s\'est produite lors de la tentative de connexion.'
    }

    if (!json.default.auth.sign_in.email) {
      json.default.auth.sign_in.email = 'Email'
    }

    if (!json.default.auth.sign_in.password) {
      json.default.auth.sign_in.password = 'Mot de passe'
    }

    if (!json.default.auth.sign_in.submit) {
      json.default.auth.sign_in.submit = 'S\'identifier'
    }

    // Errors
    if (!json.default.form || typeof json.default.form !== 'object') {
      json.default.form = {}
    }

    if (!json.default.form.error || typeof json.default.form.error !== 'object') {
      json.default.form.error = {}
    }

    if (!json.default.form.error.string || typeof json.default.form.error.string !== 'object') {
      json.default.form.error.string = {}
    }

    if (!json.default.form.error.string.email) {
      json.default.form.error.string.email = 'Adresse e-mail invalide.'
    }

    if (!json.default.form.error.string.min) {
      json.default.form.error.string.min = 'Longueur minimale : 3 caractères.'
    }

    if (!json.default.form.error.string.min_6) {
      json.default.form.error.string.min_6 = 'Longueur minimale : 6 caractères.'
    }

    if (!json.default.form.error.string.max) {
      json.default.form.error.string.max = 'Longueur maximale : 255 caractères.'
    }
  }

  vuetifyFr() {
    return {
      badge: 'Badge',
      open: 'Ouvrir',
      close: 'Fermer',
      dismiss: 'Ignorer',
      confirmEdit: {
        ok: 'OK',
        cancel: 'Annuler',
      },
      dataIterator: {
        noResultsText: 'Aucun enregistrement correspondant trouvé',
        loadingText: `Chargement de l'élément...`,
      },
      dataTable: {
        itemsPerPageText: 'Lignes par page :',
        ariaLabel: {
          sortDescending: 'Tri décroissant.',
          sortAscending: 'Tri croissant.',
          sortNone: 'Non trié.',
          activateNone: 'Activer pour supprimer le tri.',
          activateDescending: 'Activer pour trier par ordre décroissant.',
          activateAscending: 'Activer pour trier par ordre croissant.',
        },
        sortBy: 'Trier par',
      },
      dataFooter: {
        itemsPerPageText: 'Éléments par page :',
        itemsPerPageAll: 'Tous',
        nextPage: 'Page suivante',
        prevPage: 'Page précédente',
        firstPage: 'Première page',
        lastPage: 'Dernière page',
        pageText: '{0}-{1} de {2}',
      },
      dateRangeInput: {
        divider: 'à',
      },
      datePicker: {
        itemsSelected: '{0} sélectionné(s)',
        range: {
          title: 'Sélectionner des dates',
          header: 'Entrer des dates',
        },
        title: 'Sélectionner une date',
        header: 'Entrer une date',
        input: {
          placeholder: 'Entrer une date',
        },
      },
      noDataText: 'Aucune donnée disponible',
      carousel: {
        prev: 'Visuel précédent',
        next: 'Visuel suivant',
        ariaLabel: {
          delimiter: 'Diapositive {0} de {1}',
        },
      },
      calendar: {
        moreEvents: '{0} de plus',
        today: 'Aujourd\'hui',
      },
      input: {
        clear: 'Vider {0}',
        prependAction: '{0} action avant',
        appendAction: '{0} action après',
        otp: 'Caractère {0} du mot de passe à usage unique',
      },
      fileInput: {
        counter: '{0} fichier(s)',
        counterSize: '{0} fichier(s) ({1} au total)',
      },
      fileUpload: {
        title: 'Glissez-déposez des fichiers ici',
        divider: 'ou',
        browse: 'Parcourir les fichiers',
      },
      timePicker: {
        am: 'AM',
        pm: 'PM',
        title: 'Sélectionner une heure',
      },
      pagination: {
        ariaLabel: {
          root: 'Navigation de pagination',
          next: 'Page suivante',
          previous: 'Page précédente',
          page: 'Aller à la page {0}',
          currentPage: 'Page actuelle, Page {0}',
          first: 'Première page',
          last: 'Dernière page',
        },
      },
      stepper: {
        next: 'Suivant',
        prev: 'Précédent',
      },
      rating: {
        ariaLabel: {
          item: 'Note de {0} sur {1}',
        },
      },
      loading: 'Chargement...',
      infiniteScroll: {
        loadMore: 'Charger plus',
        empty: 'Aucune donnée supplémentaire',
      },
      rules: {
        required: 'Ce champ est requis',
        email: 'Veuillez entrer une adresse email valide',
        number: 'Ce champ ne peut contenir que des chiffres',
        integer: 'Ce champ ne peut contenir que des valeurs entières',
        capital: 'Ce champ ne peut contenir que des lettres majuscules',
        maxLength: 'Vous devez entrer un maximum de {0} caractères',
        minLength: 'Vous devez entrer un minimum de {0} caractères',
        strictLength: 'La longueur du champ entré est invalide',
        exclude: 'Le caractère {0} n’est pas autorisé',
        notEmpty: 'Veuillez choisir au moins une valeur',
        pattern: 'Format invalide',
      },
    }
  }

  create() {
    const translations = Object.fromEntries(
      this.askForFields.getFields()
        .filter(f => f.name && f.label)
        .map(f => [f.name, f.label]),
    )
    const newSection = {
      list: {
        title: `Liste des ${singularize(this.variableName)}`,
      },
      new: {
        title: `Création d'un ${singularize(this.variableName)}`,
        success: `Création du ${singularize(this.variableName)} effectuée`,
        fail: `Erreur lors de la création du ${singularize(this.variableName)}`,
      },
      edit: {
        title: `Modification d'un ${singularize(this.variableName)}`,
        success: `Modification du ${singularize(this.variableName)} effectuée`,
        fail: `Erreur lors de la modification du ${singularize(this.variableName)}`,
      },
      show: {
        title: `Visualisation d'un ${singularize(this.variableName)}`,
      },
      destroy: {
        title: `Suppression d'un ${singularize(this.variableName)}`,
        confirm: 'Êtes vous sûr de vouloir supprimer \'{ name }\'',
        success: `Suppression du ${singularize(this.variableName)} effectuée`,
        fail: `Erreur lors de la suppression du ${singularize(this.variableName)}`,
      },
      form: {
        fields: translations,
      },
    }
    let updatedJsonFr = this.ensureDefaultSection(this.frJson)

    updatedJsonFr = this.addTranslationSection(this.frJson, this.variableName, newSection)
    const mergedFr = {
      ...updatedJsonFr,
      $vuetify: this.vuetifyFr()
    }
    // Sauvegarde dans le fichier (optionnel, en Node.js)
    fs.writeFileSync(path.join(this.targetDir, 'fr.json'), JSON.stringify(mergedFr, null, 2), 'utf-8')

    let updatedJsonEn = this.ensureDefaultSection(this.enJson)
    updatedJsonEn = this.addTranslationSection(this.enJson, this.variableName, newSection)
    const mergedEn = {
      ...updatedJsonEn,
      $vuetify: this.vuetifyFr()
    }
    fs.writeFileSync(path.join(this.targetDir, 'en.json'), JSON.stringify(mergedEn, null, 2), 'utf-8')
  }
}