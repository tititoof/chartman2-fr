import tsParser from '@typescript-eslint/parser'
import withNuxt from './.nuxt/eslint.config.mjs'

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
  // Workaround: @nuxt/eslint-config@1.5.2 (pulled in transitively by the
  // @nuxt/eslint module, independently of the ^1.16.0 devDependency pin)
  // fails to keep the TypeScript parser assigned for plain .ts/.mts/.cts
  // files — only most .vue files end up parsed correctly. Verified with a
  // minimal repro against createConfigForNuxt() alone. Re-assert the
  // parser explicitly here until the upstream module bundles a fixed
  // version of @nuxt/eslint-config.
  {
    files: ['**/*.ts', '**/*.mts', '**/*.cts'],
    languageOptions: {
      parser: tsParser,
    },
  },
  // Same root cause for .vue files: vue-eslint-parser needs an explicit
  // parserOptions.parser telling it which parser to delegate <script>
  // blocks to. Without it, TS-only syntax (e.g. a top-level `interface`)
  // fails even though simpler type annotations happen to parse leniently.
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
  },
  {
    rules: {
      // Tes règles personnalisées ici :
      'vue/multi-word-component-names': 'off',
      // '@typescript-eslint/no-unused-vars': ['warn'],
      'no-console': 'warn',
      'brace-style': ['error', '1tbs'],
    },
  },
)
