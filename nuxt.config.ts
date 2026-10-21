import type { NuxtPage } from "nuxt/schema"

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: {
    enabled: process.env.DEBUG
  },
  app: {
    head: {
      meta: [
        // viewport, description, og:title/description/url : générés page par page par @nuxtjs/seo
        { property: 'og:image', content: '/img/logo.png' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
      ],
      noscript: [
        // <noscript>JavaScript is required</noscript>
        { children: 'JavaScript is required' },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
  },
  css: ['~/assets/css/tokens.css'],
  modules: [
    'vuetify-nuxt-module',
    '@vueuse/nuxt',
    'dayjs-nuxt',
    '@pinia/nuxt',
    // '@pinia-plugin-persistedstate/nuxt',
    'pinia-plugin-persistedstate/nuxt',
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
    'nuxt-snackbar',
    '@nuxt/image',
    process.env.APP_ENVIRONMENT === 'production' && '@sentry/nuxt/module',
  ],
  vuetify: {
    moduleOptions: {
      /* module specific options */
    },
    vuetifyOptions: './vuetify.config.ts'
  },
  site: {
    url: process.env.APP_URL,
    name: 'chartman2.fr',
    description: 'Christophe Hartmann, développeur Ruby on Rails / Nuxt et DevOps : applications maintenables, CI/CD, Docker et infrastructure auto-hébergée. Articles et retours d\'expérience.',
    defaultLocale: 'fr', // not needed if you have @nuxtjs/i18n installed
    image: '/img/logo.png',
  },
  content: {
    watch: {
      enabled: true,
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
            'php',
            'python'
          ],
        },
        rehypePlugins: {
          'rehype-mermaid': {
            simple: true
          }
        },
      },
    },
  },
  runtimeConfig: {
    public: {
      appUrl: process.env.APP_URL,
      appDomain: process.env.APP_DOMAIN,
      apiBaseUrl: process.env.API_BASE_URL,
      railsApiBase: process.env.API_BASE_URL || 'http://localhost:3001/api/v1',
      appName: process.env.APP_NAME,
      environment: process.env.APP_ENVIRONMENT,
      appVersion: process.env.APP_VERSION,
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
        {
          id: 'auth',
          name: 'Session',
          description: 'Maintien de la connexion à l’espace membre (uniquement si vous vous connectez).',
          targetCookieIds: ['token', 'refresh_token'],
        },
      ],
      optional: [],
    },

    // The locales to include.
    locales: ['fr'],
    localeTexts: {
      fr: {
        bannerDescription: 'Ce site utilise uniquement les cookies nécessaires à son fonctionnement (thème et session). Aucun cookie publicitaire ou de mesure d’audience.',
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
      // Contenu uniquement en français : en.json est conservé mais la locale
      // "en" est désactivée pour éviter des pages /en mêlant interface anglaise et articles français
      { "code": "fr", "language": "fr-FR", "file": "fr.json" }
    ],
    defaultLocale: 'fr',
    detectBrowserLanguage: false,
    defaultLocaleRouteNameSuffix: 'false',
    vueI18n: 'i18n.config.js',
    langDir: './locales'
  },
  sentry: {
    autoInjectServerSentry: 'experimental_dynamic-import',
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
