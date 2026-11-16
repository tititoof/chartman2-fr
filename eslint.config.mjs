import withNuxt from './.nuxt/eslint.config.mjs'

// TypeScript support comes from @nuxt/eslint-config, which only enables it when
// `typescript` is resolvable from the project root: keep it in devDependencies.
export default withNuxt(
  // Global ignores must live in their own config object with no other keys,
  // otherwise ESLint treats `ignores` as a per-object file filter instead of
  // a project-wide exclusion (see https://eslint.org/docs/latest/use/configure/ignore).
  {
    ignores: [
      'pages/sentry-example-page.vue',
      'nuxt.config.ts',
      'app/layouts/default.vue',
      'app/components/content/ProsePre.vue',
      'app/components/partial/main/technologies.vue',
      'app/error.vue',
      'builder/askForFields.js',
      'builder/generateApiCrud.js',
      'builder/generateApiCrudComposable.js',
      'builder/generateApiCrudPages.js',
      'builder/stringUtils.js',
    ],
  },
  {
    rules: {
      // Tes règles personnalisées ici :
      'vue/multi-word-component-names': 'off',
      'no-console': 'warn',
      'brace-style': 'off',
    },
  },
  // Tests: Vitest globals (`globals: true`), `@ts-nocheck` to reach `wrapper.vm`,
  // and loosely typed mocks.
  {
    files: ['tests/**'],
    languageOptions: {
      globals: {
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
