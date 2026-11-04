import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  // any custom Vitest config you require
  plugins: [
  ],
  test: {
    environment: 'nuxt',
    // L'environnement Nuxt met 9 à 10 s à démarrer par fichier sur l'agent Jenkins
    // (21 workers en parallèle) : le délai par défaut des hooks (10 s) faisait échouer
    // des fichiers au hasard (main #39 et #40)
    hookTimeout: 30000,
    // Le montage Nuxt dépasse parfois le timeout de test par défaut sur les
    // workers Jenkins fortement parallélisés.
    testTimeout: 15000,
    mockReset: true,
    // server: {
    //     deps: { inline: ['vuetify'] },
    // },

    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
        mock: {
          intersectionObserver: true,
          indexedDb: true,
        },
      },
    },
    globals: true,
    include: ['tests/**/*.nuxt.spec.ts'],
    exclude: ['api', '.nuxt', 'server', 'middleware', 'layouts', 'pages', 'tests', '*.config.ts', '*.d.ts', 'app.vue'],
    // setupFiles: ['tests/setup/init.ts'],
    // unstubGlobals: true,
    // default : le détail des tests dans le journal de Jenkins ; le rapport Sonar
    // seul n'affichait rien, même quand vitest sortait en erreur
    reporters: ['default', 'vitest-sonar-reporter'],
    outputFile: { 'vitest-sonar-reporter': 'sonar-report.xml' },
    coverage: {
      reporter: 'lcov',
      provider: 'v8',
      include: ['components', 'composables', 'stores', 'pages', 'app'],
      all: true,
    },
    alias: [
      {
        find: /^\/.*\.(svg|png|jpg|webp|gif)$/,
        replacement: '/tests/mocks/assets.ts',
      }
    ]
  },
})
