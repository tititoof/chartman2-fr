import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  ignores: [
    'pages/sentry-example-page.vue',
    'nuxt.config.ts',
    'layouts/default.vue',
    'components/content/ProsePre.vue',
    'components/partial/main/technologies.vue',
    'error.vue',
    'builder/askForFields.js',
    'builder/generateApiCrud.js',
    'builder/generateApiCrudComposable.js',
    'builder/generateApiCrudPages.js',
    'builder/stringUtils.js',
  ],
  // parser: 'vue-eslint-parser',
  languageOptions: {
    parserOptions: {
      parser: '@typescript-eslint/parser',
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
  // extends: [
  //   'eslint:recommended',
  //   'plugin:vue/vue3-recommended',
  //   'plugin:@typescript-eslint/recommended',
  //   'plugin:nuxt/recommended'
  // ],
  // plugins: {}
  //   'vue',
  //   '@typescript-eslint',
  // ],
  rules: {
    // Tes règles personnalisées ici :
    'vue/multi-word-component-names': 'off',
    // '@typescript-eslint/no-unused-vars': ['warn'],
    'no-console': 'warn',
    'brace-style': ['error', '1tbs'],
  },
})