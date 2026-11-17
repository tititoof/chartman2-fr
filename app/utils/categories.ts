// Single source for blog categories: the URL slug, the folders under content/articles,
// and the card shown on the blog home. An article's color defaults to its category's.
export interface Category {
  slug: string
  dirs: string[]
  icon: string
  color: string
  title: string
  text: string
}

export const categories: Category[] = [
  {
    slug: 'ror',
    dirs: ['1.ruby', '1.ror'],
    icon: 'i-mdi:language-ruby',
    color: 'red',
    title: 'Ruby',
    text: 'Ruby & Ruby on Rails.',
  },
  {
    slug: 'nuxt',
    dirs: ['2.nuxt'],
    icon: 'i-mdi:nuxt',
    color: 'green',
    title: 'Nuxt',
    text: 'Framework Nuxt, Vuetify',
  },
  {
    slug: 'php',
    dirs: ['7.php'],
    icon: 'i-mdi:language-php',
    color: 'secondary',
    title: 'PHP',
    text: 'Articles autour de PHP.',
  },
  {
    slug: 'docker',
    dirs: ['5.docker'],
    icon: 'i-mdi:docker',
    color: 'blue',
    title: 'Docker',
    text: 'Conteneurisation, Traefik, CI/CD et infrastructure 100% self-hosted.',
  },
  {
    slug: 'todolist',
    dirs: ['4.to-do-list'],
    icon: 'i-mdi:checkbox-marked-circle-plus-outline',
    color: 'secondary',
    title: 'To-do list',
    text: 'Projet full-stack Nuxt 4 + Rails 8 : authentification BFF, API REST et tests.',
  },
  {
    slug: 'selfhosted',
    dirs: ['6-selfhosted'],
    icon: 'i-mdi:shield-home',
    color: 'teal',
    title: 'Self-Hosted',
    text: 'Divers services que l\'on peut auto-héberger.',
  },
  {
    slug: 'blackstaff',
    dirs: ['8.blackstaff'],
    icon: 'i-mdi:wizard-hat',
    color: 'purple',
    title: 'Blackstaff',
    text: 'Génération de code avec n8n, Ollama et un LLM local : architecture et retours de mesures.',
  },
  {
    slug: 'devsecops',
    dirs: ['9.devsecops'],
    icon: 'i-mdi:server-security',
    color: 'orange',
    title: 'Lab DevSecOps',
    text: 'Ansible, Terraform, k3s, DefectDojo et CloudNativePG : un lab d\'infrastructure as code, puis la migration de tout le homelab sous Kubernetes.',
  },
]

export const findCategory = (slug: string) => categories.find(category => category.slug === slug)

// Nuxt Content stems keep the folder's numeric prefix: articles/5.docker/01-docker
export const categoryStemPrefixes = (category: Category) => category.dirs.map(dir => `articles/${dir}/`)
