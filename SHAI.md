# SHAI.md

Ce document décrit en détail la structure, les objectifs et les instructions nécessaires pour permettre à SHAI (Smart Hosting Artificial Intelligence) d’OVH de comprendre, analyser et assister efficacement au développement et au déploiement du projet Chartman2-fr.

## 🧭 Présentation du projet

Chartman2-fr est le site web personnel de Christophe Hartmann, construit avec Nuxt 3.
Il sert à :

Présenter mon profil, compétences et expériences.

Publier des articles et du contenu technique.

Partager projets, guides, notes et mémos.

Servir de base cohérente pour une plateforme de publication moderne.

Le site utilise le framework Nuxt 3, l’écosystème Vue.js, et des outils modernes comme Docker et pnpm.

## 🧩 Stack technique (mise à jour avec les modules utilisés)

Le projet utilise Nuxt 3 accompagné d’un ensemble de modules qui enrichissent les fonctionnalités du site.
Voici la liste complète et expliquée des modules installés :

### 🎨 UI & Animations

vuetify-nuxt-module
Fournit l’intégration complète de Vuetify 3 dans Nuxt. Permet de gérer le design system, les composants UI et la personnalisation visuelle.

nuxt3-aos
Ajoute les animations AOS (Animate on Scroll) pour des effets d’apparition lors du scroll.

@nuxtjs/color-mode
Gestion du mode clair/sombre, stockage de la préférence utilisateur, intégration dans l’UI.

@unocss/nuxt
Système utility-first type Tailwind mais plus léger, configurable et génératif.
⚠️ Remplace TailwindCSS (pas utilisé dans ce projet).

### 🌐 Contenu & SEO

@nuxt/content
Utilisé pour gérer les articles, pages rédactionnelles et documents Markdown.
Permet un rendu rapide, la génération d’API interne et la recherche full-text.

@nuxtjs/i18n
Gestion multilingue du site.
Offre le routing par langue, la traduction des contenus et l'internationalisation automatique.

@nuxtjs/seo
Automatise divers aspects SEO :

Meta tags

Robots.txt

Sitemap

Données structurées

Optimisations OpenGraph / Twitter Cards

@nuxt/image
Optimisation des images, resizing dynamique, formats modernes (WEBP/AVIF).
Améliore fortement la performance et le SEO.

### 🧱 State management & données persistées

@pinia/nuxt
Ajout de Pinia pour la gestion de l’état global.

pinia-plugin-persistedstate/nuxt
Persistance automatique du store côté client via cookies ou localStorage.

### 🛠️ Développement & utils

@vueuse/nuxt
Fournit 200+ composables utiles (useDark, useFetch, useMouse, useStorage…).
Simplifie les interactions UI, la réactivité et l’état local.

dayjs-nuxt
Intégration de Day.js pour la gestion des dates (léger, compatible Moment.js).

@nuxt/eslint
Ajoute ESLint dans le workflow Nuxt pour garantir un code propre et cohérent.

@nuxt/test-utils/module
Fournit les utilitaires pour tester le projet Nuxt (unit tests & integrations).

### 🔒 Cookies et consentement

@dargmuesli/nuxt-cookie-control
Module complet de gestion du consentement RGPD, bannière cookie, catégorisation, activation conditionnelle des scripts.

### 📧 Envoi d’emails

nuxt-resend
Intégration de Resend pour l’envoi d’emails transationnels (contact, notifications…).
Utilisé côté serveur via Nitro.

### ✨ Effets graphiques & interactions

nuxt-particles
Intégration de tsParticles pour ajouter des animations interactives (ex : fond animé, particules, effets visuels).

nuxt-snackbar
Composant de notifications snackbars simple et configurable.


## 📦 Structure du projet

Voici l’organisation des fichiers et dossiers du projet, avec une explication claire pour SHAI :

/
├── components/
├── composables/
├── content/
├── layouts/
├── middleware/
├── pages/
├── plugins/
├── public/
├── README.md
├── LICENSE
└── package.json

Détails des dossiers :
./

Racine du projet.
Contient les fichiers de configuration Nuxt, les dépendances, et la base du code source.

components/

Composants Vue réutilisables, utilisés à travers différentes pages.

composables/

Fonctions partagées utilisant le Composition API.
Exemples : appels API, gestion de state local, utilitaires réutilisables.

middlewares/

Middlewares Nuxt exécutés avant le rendu d’une page.
Exemples : protection de routes, redirections, vérification de données.

layouts/

Modèles de pages (templates) pour structure globale : header, footer, menu.
Permet d’avoir plusieurs mises en page selon la nature du contenu.

plugins/

Initialisation et configuration de librairies externes.
Exemples : plugins Vue, configuration markdown, intégration analytics…

pages/

Pages accessibles via le router automatique de Nuxt (file-based routing).
Chaque fichier/dossier = une route.

public/

Fichiers statiques servis tels quels.
Ex : images publiques, favicons, assets non gérés par Nuxt.

content/

Dossier géré par Nuxt Content.
Contient les articles, pages rédactionnelles, billets techniques au format Markdown.

README.md

Documentation du projet, instructions de développement.

LICENSE

Licence MIT qui régit l’utilisation du code.

## 🚀 Instructions pour l’environnement de développement
Installation des dépendances
pnpm install

Lancer le serveur de développement
pnpm run dev


Le site sera disponible sur :

👉 http://localhost:3000

Build pour la production
pnpm run build

Prévisualisation de la version buildée
pnpm run preview

## 🛡️ Licence

Le projet est distribué sous licence MIT.
SHAI peut donc l’analyser en entier sans restriction.

## 📬 Contact / Références

Auteur : Christophe Hartmann

Site web : https://chartman2-fr.ovh

Dépôt GitHub : https://github.com/tititoof/chartman2-fr