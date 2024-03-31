// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  app: {
    head: {
      meta: [
        // <meta name="viewport" content="width=device-width, initial-scale=1">
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'title', content: '[title]' },
        { name: 'description', content: '[description]' },
        { name: 'og:title', content: '[og:title]' },
        { name: 'og:description', content: '[og:description]' },
        { name: 'og:image', content: '[og:image]' },
        { name: 'og:url', content: '[og:url]' },
        { name: 'twitter:title', content: '[twitter:title]' },
        { name: 'twitter:description', content: '[twitter:description]' },
        { name: 'twitter:image', content: '[twitter:image]' },
        { name: 'twitter:card', content: 'summary' },
      ],
      noscript: [
        // <noscript>JavaScript is required</noscript>
        { children: 'JavaScript is required' },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
  },
  site: {
    url: 'https://chartman2.fr',
    name: 'chartman2.fr',
    description: 'Mon site personnel',
    defaultLocale: 'fr', // not needed if you have @nuxtjs/i18n installed
  },
  modules: [
    'vuetify-nuxt-module',
    '@vueuse/nuxt',
    'dayjs-nuxt',
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
    '@unocss/nuxt',
    '@nuxtjs/i18n',
    '@nuxtjs/seo',
    '@nuxt/test-utils/module',
    '@nuxtjs/color-mode',
    '@nuxt/content',
    '@nuxt/eslint'
  ],
  vuetify: {
    moduleOptions: {
      /* module specific options */
    },
    vuetifyOptions: './vuetify.config.ts'
  },
  i18n: {
    vueI18n: './i18n.config.ts' // if you are using custom path, default
  },
  dayjs: {
    locales: ['fr', 'en'],
    plugins: ['relativeTime', 'utc', 'timezone'],
    defaultLocale: 'fr',
    defaultTimezone: 'Europe/Paris',
  },
  eslint: {
    config: {
      stylistic: true // <---
    }
  }
})
