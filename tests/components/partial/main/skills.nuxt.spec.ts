// @ts-nocheck
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import TestResource from '~~/components/partial/main/skills.vue'

describe('Components - partial/main/skills', async () => {
  it('is a Vue instance', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true
    })

    expect(wrapper.vm).toBeTruthy()
  })

  it('has initialized values', async () => {
    const wrapper = await mountSuspended(TestResource, {
      shallow: true
    })

    expect(wrapper.vm.skills).toEqual([
      {
        title: "Frontend",
        text: "Tous les éléments du site que l’on voit à l’écran et avec lesquels on peut interagir. Ces éléments sont composés de HTML, CSS et de Javascript contrôlés par le navigateur web de l’utilisateur.",
        skill: [
          {
            type: "icon",
            src: 'i-mdi:vuejs',
            title: "VueJS",
            text: "Progressive JavaScript framework",
          },
          {
            type: "icon",
            src: 'i-mdi:nuxt',
            title: "NuxtJS",
            text: "Frontend framework",
          },
          {
            type: "icon",
            src: 'i-mdi:vuetify',
            title: "Vuetify",
            text: "Material design framework",
          },
        ],
      },
      {
        title: "Backend",
        text: "C'est la partie invisible pour les visiteurs mais qui donne vie au site. Le backend conserve toutes les données du webmaster et de ses clients, un peu comme un grand tableau. les langages comme PHP, Ruby, Python, SQL etc...",
        skill: [
          {
            type: "icon",
            src: 'i-mdi:language-ruby',
            title: "Ruby",
            text: "Dynamic language",
          },
          {
            type: "icon",
            src: 'i-mdi:language-ruby-on-rails',
            title: "Ruby on Rails",
            text: "Web framework",
          },
          {
            type: "icon",
            src: 'i-mdi:laravel',
            title: "Laravel",
            text: "Web framework",
          },
          {
            type: "icon",
            src: 'i-mdi:symfony',
            title: "Symfony",
            text: "Web framework",
          },
          {
            type: "icon",
            src: 'i-mdi:database',
            title: "Database design",
            text: "MySQL / PostgreSQL",
          },
        ],
      },
      {
        title: "CI/CD",
        text: "L'intégration continue (CI) est un ensemble de pratiques utilisées en génie logiciel consistant à vérifier à chaque modification de code source que le résultat des modifications ne produit pas de régression dans l'application développée. Le déploiement continu ou Continuous deployment (CD) en anglais, est une approche d'ingénierie logicielle dans laquelle les fonctionnalités logicielles sont livrées fréquemment par le biais de déploiements automatisés.",
        skill: [
          {
            type: "image",
            src: "/img/gitea.png",
            title: "Gitea",
            text: "Code hosting",
          },
          {
            type: "image",
            src: "/img/jenkins.png",
            title: "Jenkins",
            text: "Automation",
          },
          {
            type: "image",
            src: "/img/sonarqube.png",
            title: "SonarQube",
            text: "Code quality and security",
          },
          {
            type: "image",
            src: "/img/openproject.jpg",
            title: "Openproject",
            text: "Project managment",
          },
        ],
      },
    ])
  })
})