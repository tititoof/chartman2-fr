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
    'i-mdi:docker'
  ],
  presets: [
    presetIcons({
      scale: 1.2, // scale the icons
    }),
  ]
})