import { globSync, readFileSync } from 'node:fs'

import { defineConfig, presetIcons } from 'unocss'

export default defineConfig({
  // Icons stored as data, outside the .vue files UnoCSS scans by default.
  content: {
    // Article icons: content frontmatter, rendered dynamically.
    filesystem: ['content/**/*.md'],
    // Category, skill and link icons in app/utils. `filesystem` files still go
    // through the pipeline filter, which drops .ts: `inline` is extracted as is.
    // Read once at startup: restart the dev server after adding an icon there.
    inline: globSync('app/utils/*.ts').map(file => readFileSync(file, 'utf8')),
  },
  // Icon names built at runtime only.
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
