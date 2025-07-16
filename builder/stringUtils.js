export const capitalize = (word) => {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

export const decapitalize = (word) => {
  return word.charAt(0).toLowerCase() + word.slice(1)
}

export const isPlural = (word) => {
  const lowerWord = word.toLowerCase()

  // Pluriels irréguliers connus
  const irregularPlurals = {
    children: 'child',
    men: 'man',
    women: 'woman',
    mice: 'mouse',
    geese: 'goose',
    feet: 'foot',
    teeth: 'tooth',
    data: 'datum',
  }

  if (Object.keys(irregularPlurals).includes(lowerWord)) return true

  const pluralEndings = [
    /(?:s|es|ies|zes)$/, // mots qui prennent "s" au pluriel
    /(aux|auxs|auxes)$/, // nom féminin, -aux (e)
    /(eus|ies|ues$)/, // nom masculin, -eu
    /ies$/, /ves$/, /oes$/, /xes$/, /ses$/, /zes$/, /s$/,
  ]

  return pluralEndings.some(end => end.test(word))
}

export const isPascal = (word) => {
  const regex = /^([A-Z][a-z0-9]*)+$/

  return regex.test(word)
}

export const splitPascalCase = (str) => {
  return str.match(/([A-Z][a-z0-9]*)/g) || []
}

export const isPascalCasePlural = (pascalWord) => {
  const words = splitPascalCase(pascalWord)

  if (words.length === 0) return false

  const lastWord = words[words.length - 1]

  return isPlural(lastWord)
}

export const singularize = (word) => {
  const endings = {
    ves: 'fe',
    ies: 'y',
    i: 'us',
    zes: 'ze',
    ses: 's',
    es: 'e',
    s: '',
  }
  return word.replace(
    new RegExp(`(${Object.keys(endings).join('|')})$`),
    r => endings[r],
  )
}

export const buildAttributeAccessString = (items, base = 'item.attributes') => {
  const keys = ['id', ...items.map(item => item.name)]
  return `{ ${keys.map(key => `${key}: ${base}.${key}`).join(', ')} }`
}

export const buildSingleAttributeAccessString = (items, base = 'data.data.attributes') => {
  const keys = ['id', ...items.map(item => item.name)]
  return `{
    ${keys.map(key => `${key}: ${base}.${key}`).join(',\n    ')}
  }`
}