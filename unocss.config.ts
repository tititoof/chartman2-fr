import { defineConfig, presetIcons } from 'unocss'

export default defineConfig({
  safelist: [
    'i-mdi:facebook',
    'i-mdi:linkedin',
    'i-mdi:language-ruby-on-rails',
    'i-mdi:laravel',
    'i-mdi:symfony',
    'i-mdi:database',
    'i-mdi:nuxt',
    'i-mdi:vuetify',
    'i-mdi:language-ruby-on-rails',
    'i-mdi:vuejs',
    'i-mdi:docker',
    'i-mdi:file-account-outline',
    'i-mdi:table-large',
    'i-mdi:sitemap-outline',
    'i-mdi:robot-outline',
    'i-mdi:content-copy',
    'i-mdi:note-multiple-outline',
    'i-mdi:link-variant',
    'i-mdi:database-eye',
    'i-mdi:book-open-page-variant',
  ],
  presets: [
    presetIcons({
      scale: 1.2, // scale the icons
    }),
  ],
})
