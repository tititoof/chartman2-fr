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
    '@nuxt/eslint',
    'nuxt3-aos',
    '@dargmuesli/nuxt-cookie-control'
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
  },
  content: {
    watch: false,
    highlight: {
      langs: [
        'c',
        'cpp',
        'ruby'
      ],
      // See the available themes on https://github.com/shikijs/shiki/blob/main/docs/themes.md#all-theme
      theme: {
        dark: 'github-dark',
        default: 'github-light',
      },
    },
    markdown: {
      tags: {
        code: 'code',
      },
    },
  },
  cookieControl: {
    cookies: {
      necessary: [
        {
          id: 'theme',
          name:  'Cookies par défaut',
          description:  'Préférence du thème (clair / sombre).'
        }
      ],
      optional: []
    },
  
    // typed module options
    // Component colors.
    // If you want to disable colors set colors property to false.
    // colors: {
    //   barBackground: '#ffdbd0',
    //   barButtonBackground: '#fff',
    //   barButtonColor: 'on-warning-container',
    //   barButtonHoverBackground: '#333',
    //   barButtonHoverColor: 'on-warning-container',
    //   barTextColor: '#fff',
    //   checkboxActiveBackground: '#000',
    //   checkboxActiveCircleBackground: '#fff',
    //   checkboxDisabledBackground: '#ddd',
    //   checkboxDisabledCircleBackground: '#fff',
    //   checkboxInactiveBackground: '#000',
    //   checkboxInactiveCircleBackground: '#fff',
    //   controlButtonBackground: '#fff',
    //   controlButtonHoverBackground: '#000',
    //   controlButtonIconColor: '#000',
    //   controlButtonIconHoverColor: '#fff',
    //   focusRingColor: '#808080',
    //   modalBackground: '#fff',
    //   modalButtonBackground: '#000',
    //   modalButtonColor: '#fff',
    //   modalButtonHoverBackground: '#333',
    //   modalButtonHoverColor: '#fff',
    //   modalOverlay: '#000',
    //   modalOverlayOpacity: 0.8,
    //   modalTextColor: '#000',
    //   modalUnsavedColor: '#fff',
    // },
    // The locales to include.
    locales: ['fr'],
    localeTexts: {
      fr: {
        bannerDescription: 'Nous utilisons des cookies d’origine. Ces cookies sont destinés à vous offrir une navigation optimisée sur ce site web. En poursuivant votre navigation, nous considérons que vous acceptez l’usage des cookies.'
      }
    }
    // Translations to override.
    // localeTexts: {
    //   fr: {
    //     accept: 'Accapter',
    //     save: 'Se souvenir',
    //   }
    // }
  }
})
