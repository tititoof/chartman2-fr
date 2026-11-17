import { defineConfig, presetIcons } from 'unocss'

export default defineConfig({
  // Icons stored as data, outside the .vue files UnoCSS scans by default: category icons
  // (app/utils/*.ts) and article icons (content frontmatter, rendered dynamically).
  content: {
    filesystem: ['app/utils/**/*.ts', 'content/**/*.md'],
  },
  safelist: [
    'i-mdi:content-copy',
    'i-mdi:cloud-cog-outline',
    'i-mdi:karate',
    'i-mdi:school-outline',
    'i-mdi:server',
  ],
  presets: [
    presetIcons({
      scale: 1.2, // scale the icons
    }),
  ],
})
