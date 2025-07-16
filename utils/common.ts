export const CSocial = [
  {
    name: 'Facebook',
    route: 'https://www.facebook.com/christophe.hartmann1/',
    icon: 'i-mdi:facebook',
  },
  {
    name: 'Linkedin',
    route: 'https://www.linkedin.com/in/christophe-hartmann-3a297a42/',
    icon: 'i-mdi:linkedin',
  },
]

export const CLinks = [
  {
    name: 'NuxtJS',
    icon: 'i-mdi:nuxt',
    href: 'https://nuxt.com/',
  },
  {
    name: 'Vuetify',
    icon: 'i-mdi:vuetify',
    href: 'https://vuetifyjs.com/en/',
  },
  {
    name: 'RoR',
    icon: 'i-mdi:language-ruby-on-rails',
    href: 'https://rubyonrails.org/',
  },
]


export const CSkills = [
  {
    title: 'Frontend',
    text: 'Tous les éléments du site que l’on voit à l’écran et avec lesquels on peut interagir. Ces éléments sont composés de HTML, CSS et de Javascript contrôlés par le navigateur web de l’utilisateur.',
    skill: [
      {
        type: 'icon',
        src: 'i-mdi:vuejs',
        title: 'VueJS',
        text: 'Progressive JavaScript framework - Construction d\'interfaces utilisateur interactives et réactives, qui permet de développer des applications web modulaires grâce à un système de composants.',
      },
      {
        type: 'icon',
        src: 'i-mdi:nuxt',
        title: 'NuxtJS',
        text: 'Frontend framework - Basé sur VueJS, facilitant le développement d’applications web universelles (server-side rendered), statiques ou monopages, en offrant une configuration simplifiée.',
      },
      {
        type: 'icon',
        src: 'i-mdi:vuetify',
        title: 'Vuetify',
        text: 'Material design framework - Basé sur VueJS, proposant une large collection de composants prêts à l’emploi respectant les principes du Material Design.',
      },
    ],
  },
  {
    title: 'Backend',
    text: 'C\'est la partie invisible pour les visiteurs mais qui donne vie au site. Le backend conserve toutes les données du webmaster et de ses clients, un peu comme un grand tableau. les langages comme PHP, Ruby, Python, SQL etc...',
    skill: [
      {
        type: 'icon',
        src: 'i-mdi:language-ruby-on-rails',
        title: 'Ruby on Rails',
        text: 'Web framework - développement d’applications grâce à une architecture MVC, une convention sur la configuration, outils intégrés pour la gestion des bases de données, l’authentification et les tests.',
      },
      {
        type: 'icon',
        src: 'i-mdi:laravel',
        title: 'Laravel',
        text: 'Web framework - développement d’applications en proposant une syntaxe élégante, une architecture MVC (Modèle-Vue-Contrôleur), des outils puissants comme l’ORM Eloquent, la gestion des migrations.',
      },
      {
        type: 'icon',
        src: 'i-mdi:symfony',
        title: 'Symfony',
        text: 'Web framework - Développement d\'applications robustes et modulaires, en fournissant un ensemble complet de composants réutilisables, une architecture MVC',
      },
      {
        type: 'icon',
        src: 'i-mdi:database',
        title: 'Database design',
        text: 'MySQL / PostgreSQL - Conception de la structure logique des bases de données relationnelles.',
      },
    ],
  },
]


export const CSkillsCICD = {
  title: 'CI/CD',
  text: 'L\'intégration continue (CI) est un ensemble de pratiques utilisées en génie logiciel consistant à vérifier à chaque modification de code source que le résultat des modifications ne produit pas de régression dans l’application développée. Le déploiement continu ou Continuous deployment (CD) en anglais, est une approche d\'ingénierie logicielle dans laquelle les fonctionnalités logicielles sont livrées fréquemment par le biais de déploiements automatisés.',
  skill: [
    {
      type: 'image',
      src: '/img/Forgejo_logo.svg',
      title: 'Forgejo',
      text: 'Système de gestion de projet et de code source open-source qui est un fork de Gitea. Il permet aux développeurs de gérer leurs codes sources.',
    },
    {
      type: 'image',
      src: '/img/jenkins.png',
      title: 'Jenkins',
      text: 'Outil de build automation qui permet aux développeurs de automatiser les processus de construction, de test et de déploiement de leurs applications.',
    },
    {
      type: 'image',
      src: '/img/sonarqube.png',
      title: 'SonarQube',
      text: 'Outil de qualité logicielle qui permet aux développeurs de mesurer et d’améliorer la qualité de leur code.',
    },
    {
      type: 'image',
      src: '/img/openproject.jpg',
      title: 'Openproject',
      text: 'Système de gestion de projet qui permet aux développeurs de gérer leurs projets.',
    },
    {
      type: 'image',
      src: '/img/coolify-transparent.svg',
      title: 'Coolify',
      text: 'Outil d’automatisation des processus de déploiement d\'applications avec la configuration.',
    },
    {
      type: 'image',
      src: '/img/glitchtip.svg',
      title: 'GlitchTip',
      text: 'Outil de debugging qui permet aux développeurs de résoudre les problèmes de code.',
    },
  ],
}


export const CStats = [
  {
    value: '199k+',
    title: 'VueJS',
    url: 'https://github.com/vuejs/vue',
    star_url: `https://api.github.com/repos/vuejs/vue`,
  },
  {
    value: '41k+',
    title: 'NuxtJS',
    url: 'https://github.com/nuxt/nuxt.js/',
    star_url: `https://api.github.com/repos/nuxt/nuxt.js`,
  },
  {
    value: '19k+',
    title: 'Ruby',
    url: 'https://github.com/ruby/ruby',
    star_url: `https://api.github.com/repos/ruby/ruby`,
  },
  {
    value: '51k+',
    title: 'Ruby on Rails',
    url: 'https://github.com/rails/rails',
    star_url: `https://api.github.com/repos/rails/rails`,
  },
  {
    value: '72k+',
    title: 'Laravel',
    url: 'https://github.com/laravel/laravel',
    star_url: `https://api.github.com/repos/laravel/laravel`,
  },
  {
    value: '28k+',
    title: 'Symfony',
    url: 'https://github.com/symfony/symfony',
    star_url: `https://api.github.com/repos/symfony/symfony`,
  },
]