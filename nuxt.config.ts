import type { NuxtPage } from "nuxt/schema"

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
    '@dargmuesli/nuxt-cookie-control',
    'nuxt-resend',
    '@nuxt/image',
    'nuxt-particles',
    'nuxt-snackbar',
    process.env.APP_ENVIRONMENT === 'production' && '@sentry/nuxt/module',
  ],
  vuetify: {
    moduleOptions: {
      /* module specific options */
    },
    vuetifyOptions: './vuetify.config.ts'
  },
  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'title', content: 'chartman2.fr' },
        { name: 'description', content: 'A personal site on web development, infrastructure and DevOps tools and technologies. Discover how to create robust applications with Nuxt.js, Ruby on Rails and Jenkins. Learn how to use Docker to create isolated environments. web development - Nuxt.js- Ruby on Rails- Jenkins- Forgejo- SonarQube- OpenProject - Docker - DevOps - code quality' },
        { name: 'image', content: process.env.APP_URL + '/logo.webp' },
        { name: 'og:title', content: 'chartman2.fr' },
        { name: 'og:description', content: 'A personal site on web development, infrastructure and DevOps tools and technologies. Discover how to create robust applications with Nuxt.js, Ruby on Rails and Jenkins. Learn how to use Docker to create isolated environments. web development - Nuxt.js- Ruby on Rails- Jenkins- Forgejo- SonarQube- OpenProject - Docker - DevOps - code quality' },
        { name: 'og:image', content: process.env.APP_URL + '/logo.webp' },
        { name: 'og:url', content: process.env.APP_URL },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
  },
  site: {
    url: process.env.APP_URL,
    name: 'chartman2.fr',
    description: 'A personal site on web development, infrastructure and DevOps tools and technologies. Discover how to create robust applications with Nuxt.js, Ruby on Rails and Jenkins. Learn how to use Docker to create isolated environments. web development - Nuxt.js- Ruby on Rails- Jenkins- Forgejo- SonarQube- OpenProject - Docker - DevOps - code quality',
    defaultLocale: 'fr', // not needed if you have @nuxtjs/i18n installed
    image: process.env.APP_URL + '/logo.webp',
  },
  content: {
    watch: {
      enabled: false,
    },
    build: {
      markdown: {
        toc: {
          depth: 3, // include h3 headings
        },
        highlight: {
          theme: {
            // Default theme (same as single string)
            default: 'material-theme-darker',
            // Theme used if `html.dark`
            dark: 'github-dark',
            // Theme used if `html.sepia`
            sepia: 'monokai',
          },
          langs: [
            'c',
            'cpp',
            'ruby',
            'shell',
            'yaml',
            'json',
            'js',
            'ts',
            'html',
            'css',
            'vue',
          ],
        },
      },
    },
  },
  runtimeConfig: {
    public: {
      appUrl: process.env.APP_URL,
      appDomain: process.env.APP_DOMAIN,
      apiBaseUrl: process.env.API_BASE_URL,
      appName: process.env.APP_NAME,
      environment: process.env.APP_ENVIRONMENT,
    },
  },
  sourcemap: { client: 'hidden' },
  vite: { // @see https://github.com/nuxt/nuxt/issues/27558
    server: {
      hmr: {
        protocol: 'wss',
        clientPort: 443,
        path: 'hmr/',
      },
      allowedHosts: [process.env.APP_URL, process.env.APP_WS_URL, process.env.API_BASE_URL],
    },
  },
  hooks: { // @see https://github.com/nuxt/nuxt/issues/27558
    'vite:extendConfig': (config) => {
      if (typeof config.server === 'object' && typeof config.server.hmr === 'object') {
        config.server.hmr.protocol = 'wss'
        config.server.hmr.clientPort = 443
        config.server.hmr.path = 'hmr/'
      }
    },
    'pages:extend'(pages) {
      const pagesToRemove: NuxtPage[] = []
      pages.forEach((page) => {
        if (page.path.includes('component')) pagesToRemove.push(page)
      })
  
      pagesToRemove.forEach((page: NuxtPage) => {
        pages.splice(pages.indexOf(page), 1)
      })
    }
  },
  cookieControl: {
    cookies: {
      necessary: [
        {
          id: 'theme',
          name: 'Cookies par défaut',
          description: 'Préférence du thème (clair / sombre).',
        },
      ],
      optional: [],
    },

    // The locales to include.
    locales: ['fr'],
    localeTexts: {
      fr: {
        bannerDescription: 'Nous utilisons des cookies d’origine. Ces cookies sont destinés à vous offrir une navigation optimisée sur ce site web. En poursuivant votre navigation, nous considérons que vous acceptez l’usage des cookies.',
      },
    },
  },
  dayjs: {
    locales: ['fr', 'en'],
    plugins: ['relativeTime', 'utc', 'timezone'],
    defaultLocale: 'fr',
    defaultTimezone: 'Europe/Paris',
  },
  eslint: {
    config: {
      stylistic: true,

    },
  },
  i18n: {
    locales: 
    [
      { "code": "en", "language": "en-US", "file": "en.json", "dir": "ltr" },
      { "code": "fr", "language": "fr-FR", "file": "fr.json" }
    ],
    defaultLocale: 'fr',
    defaultLocaleRouteNameSuffix: 'false',
    vueI18n: 'i18n.config.js',
    langDir: './locales'
  },
  particles: {
    mode: 'full', // 'full' | 'slim' | 'basic' | 'custom'
    lazy: true,
  },
  sentry: {
    autoInjectServerSentry: 'experimental_dynamic-import',
  },
  vuetify: {
    moduleOptions: {
      /* module specific options */
    },
    vuetifyOptions: './vuetify.config.ts',
  },
  components: [
    '~/components', {
      path: '~/pages',
      pattern: '*/components/**',
      pathPrefix: true
    }
  ],
  experimental: {
    cookieStore: true
  }
})