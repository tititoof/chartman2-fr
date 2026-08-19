---
title: 'Todo List — Frontend : initialisation'
description: 'Mise en place du projet Nuxt 4 avec Docker et Traefik : dépôt Git, configuration et conteneurisation.'
icon: 'i-mdi:checkbox-marked-circle-plus-outline'
color: 'secondary'
article_id: '1-to-do-list-initialisation'
draft: false
publishedAt: '2026-07-01'
---

#### 🎨 Frontend — Initialisation

Dans cet article, nous allons créer de zéro la structure du projet Nuxt 4,
fichier par fichier. Pas de générateur — chaque fichier est créé manuellement
pour comprendre exactement ce qu'il contient et pourquoi il est là.

À la fin, vous aurez une application Nuxt fonctionnelle, accessible via Traefik,
prête à accueillir les prochaines fonctionnalités.

> 💡 Le dépôt est disponible sur
> [Forgejo](https://forgejo.chartman-fr.ovh/tititoof/todo-frontend){:target="_blank"}
> et en miroir sur [GitHub](https://github.com/tititoof/todo-frontend){:target="_blank"}
> (synchronisé automatiquement via Jenkins).
> Chaque article correspond à un commit identifié dans l'historique.

---

#### ⚙️ Prérequis

::tool-table
| Outil | Version | Rôle |
|-------|---------|------|
| Docker | ≥ 24.x | Conteneurisation |
| Docker Compose | ≥ 2.x | Orchestration |
| Traefik | ≥ 3.x | Reverse proxy + TLS |
| Git | ≥ 2.x | Versioning |
| Réseau `projects_local_dev` | — | Réseau partagé pour Traefik |
::

> ⚠️ Le réseau Docker `projects_local_dev` doit exister avant de démarrer.
> S'il n'est pas encore créé :
> ```bash
> docker network create --driver bridge --name projects_local_dev
> ```
> Consultez l'[article Traefik](/blog/article/3-docker-traefik-introduction).

---

#### 📌 Nuxt 4 — la nouvelle structure

Avant de commencer, il est important de comprendre le changement majeur de Nuxt 4 :
**tout le code applicatif vit dans un répertoire `app/`**, séparé des fichiers
de configuration.

```
todo-frontend/
├── app/          ← NOUVEAU : pages, composants, layouts, middleware, plugins
├── public/       ← assets statiques (inchangé)
├── server/       ← API serveur Nuxt (inchangé)
└── (racine)      ← nuxt.config.ts, package.json, Dockerfile…
```

Dans Nuxt 3, `app.vue` était à la racine. Dans Nuxt 4, il se trouve dans `app/`.
C'est la seule grande rupture structurelle — tout le reste fonctionne pareil.

---

#### 📦 Création du dépôt

Choisissez la plateforme que vous utilisez.

##### Forgejo (self-hosted)

Dans Forgejo → **+** → **New Repository** :

- **Repository name** : `todo-frontend`
- **Visibility** : Public
- **Initialize repository** : ✅

```bash
git clone git@forgejo.chartman-fr.ovh:tititoof/todo-frontend.git
cd todo-frontend
```

> 💡 Le miroir vers GitHub est géré automatiquement par Jenkins à chaque push.
> Consultez l'[article Jenkins](/blog/article/7-docker-jenkins-init).

##### GitHub

Sur [github.com](https://github.com){:target="_blank"} → **+** → **New repository** :

- **Repository name** : `todo-frontend`
- **Visibility** : Public
- **Initialize this repository** : ✅ (avec un README)

```bash
git clone git@github.com:votre-utilisateur/todo-frontend.git
cd todo-frontend
```

##### GitLab

Sur [gitlab.com](https://gitlab.com){:target="_blank"} → **+** → **New project** →
**Create blank project** :

- **Project name** : `todo-frontend`
- **Visibility Level** : Public
- **Initialize repository with a README** : ✅

```bash
git clone git@gitlab.com:votre-utilisateur/todo-frontend.git
cd todo-frontend
```

> 💡 Quelle que soit la plateforme, la suite de l'article est identique —
> seule l'URL du dépôt change.

---

#### 🏗️ Construction du projet

Nous allons créer les fichiers dans un ordre logique :
d'abord les dépendances, ensuite Docker, puis la configuration Nuxt,
et enfin le code applicatif.

---

##### 1. `package.json` — les dépendances

C'est le point de départ de tout projet Node. Il définit les dépendances
et les scripts disponibles. Créez-le à la racine :

```json [package.json]
{
  "name": "todo-frontend",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "typecheck": "nuxt typecheck"
  },
  "dependencies": {
    "@mdi/font": "^7.4.47",
    "@nuxtjs/i18n": "^9.5.5",
    "@pinia/nuxt": "^0.11.1",
    "@vueuse/core": "^12.7.0",
    "@vueuse/nuxt": "^12.7.0",
    "nuxt": "^4.5.0",
    "pinia": "^3.0.2",
    "pinia-plugin-persistedstate": "^4.3.0",
    "vue": "^3.5.40",
    "vue-router": "^5.2.0",
    "vuetify": "^3.8.5",
    "vuetify-nuxt-module": "^0.18.4"
  },
  "devDependencies": {
    "@nuxt/test-utils": "^4.1.0",
    "@types/node": "^22.13.0",
    "@vue/test-utils": "^2.4.6",
    "happy-dom": "^20.11.2",
    "typescript": "^5.8.3",
    "vitest": "^4.0.2",
    "vue-tsc": "^2.2.10"
  }
}

```

Le script `dev` utilise `--host` pour que Nuxt soit accessible depuis
l'extérieur du conteneur Docker — sans ça, le serveur écoute uniquement
sur `localhost` et Traefik ne peut pas l'atteindre.

Le `postinstall` exécute `nuxt prepare` automatiquement après chaque
`pnpm install`, ce qui génère les types TypeScript de Nuxt.

---

##### 2. `pnpm.json` — configuration pnpm v11

Depuis pnpm v11, la configuration spécifique à pnpm a été sortie de
`package.json` dans un fichier dédié. Créez-le à la racine :

```json [pnpm.json]
{
  "onlyBuiltDependencies": [
    "@parcel/watcher",
    "esbuild",
    "unrs-resolver"
  ],
  "supportedArchitectures": {
    "os": ["linux"],
    "cpu": ["x64"],
    "libc": ["glibc"]
  }
}
```

`onlyBuiltDependencies` autorise uniquement ces packages à exécuter des
scripts de build natifs (`postinstall`). C'est une mesure de sécurité —
on n'autorise pas n'importe quel package à exécuter du code sur votre machine.

`supportedArchitectures` indique à pnpm de télécharger les binaires pour Linux
x64 avec glibc — c'est l'architecture de notre conteneur Docker, même si vous
développez sur macOS ou Windows.

---

##### 3. `Dockerfile.dev` — l'image de développement

Ce fichier décrit comment construire l'image Docker qui va faire tourner Nuxt.
Créez-le à la racine :

```dockerfile [Dockerfile.dev]
FROM node:lts-slim

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="/root/.local/share/pnpm:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@latest

WORKDIR /app

COPY package.json pnpm.json ./

RUN pnpm config set store-dir /root/.local/share/pnpm/store --global \
    && pnpm install

EXPOSE 3000
CMD ["pnpm", "dev"]
```

Quelques choix importants à noter.

On utilise `node:lts-slim` (image Debian allégée) plutôt que `node:lts-alpine`.
pnpm v11 utilise un binaire natif compilé pour glibc — or Alpine Linux utilise
musl, une libc incompatible. Résultat : pnpm ne démarre pas sur Alpine.

On copie `package.json` et `pnpm.json` **avant** le reste du code. C'est
une optimisation Docker : si ces fichiers ne changent pas entre deux builds,
Docker réutilise le layer `pnpm install` depuis son cache. Modifier un composant
Vue ne déclenche donc pas une réinstallation complète des dépendances.

Il n'y a pas de `COPY . .` ici — en développement, le volume Docker monte
le répertoire local directement dans le conteneur. Les fichiers de l'hôte
sont synchronisés en temps réel.

---

##### 4. `.dockerignore` — ce que Docker ne doit pas copier

Sans ce fichier, Docker embarque l'intégralité du répertoire local dans le
build context — y compris `node_modules/` qui peut peser plusieurs centaines
de mégaoctets. Créez-le à la racine :

```bash [.dockerignore]
node_modules/
.nuxt/
.output/
dist/
.env
*.log
.git/
coverage/
```

Ce fichier est l'équivalent du `.gitignore` mais pour Docker. Il réduit
considérablement le temps de chaque `docker compose build`.

---

##### 5. `.env.example` — le template des variables d'environnement

Ce fichier documente les variables nécessaires au projet sans exposer
les vraies valeurs. Il est versionné dans Git. Créez-le à la racine :

```bash [.env.example]
# Application
APP_NAME=Todo List
APP_URL=todo-frontend.domain.tld

# Docker
HMR_PORT=443

# Dev tools
DEVTOOLS_ENABLE=false
```

`HMR_PORT` mérite une explication : le Hot Module Replacement (rechargement
automatique lors d'une modification de code) utilise une WebSocket. Derrière
Traefik en HTTPS, cette WebSocket doit passer par le port 443. Sans cette
variable, le HMR tente de se connecter sur le port par défaut de Nuxt et
échoue silencieusement.

Copiez maintenant ce fichier en `.env` et adaptez les valeurs :

```bash
cp .env.example .env
```

> ⚠️ Le fichier `.env` ne doit **jamais** être commité. Vérifiez qu'il est
> bien dans votre `.gitignore`.

Les variables d'authentification (`NUXT_SESSION_PASSWORD`, `RAILS_API_URL`)
seront ajoutées en article 2 avec `nuxt-auth-utils`.

---

##### 6. `.gitignore` — ce que Git ne doit pas versionner

```bash [.gitignore]
# Nuxt
.nuxt/
.output/
.data/
.nitro/
dist/

# Dépendances
node_modules/

# Environnement — NE JAMAIS COMMITTER
.env
!.env.example

# Logs
logs/
*.log

# Tests
coverage/

# OS
.DS_Store
Thumbs.db
```

---

##### 7. `docker-compose.yml` — orchestration et Traefik

C'est le fichier qui orchestre le démarrage du conteneur et configure
l'intégration avec Traefik. Créez-le à la racine :

```yaml [docker-compose.yml]
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: todo-frontend
    restart: unless-stopped
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - APP_NAME=${APP_NAME}
      - HMR_PORT=${HMR_PORT:-443}
      - DEVTOOLS_ENABLE=${DEVTOOLS_ENABLE:-false}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.todo-frontend.rule=Host(`${APP_URL}`)"
      - "traefik.http.routers.todo-frontend.entrypoints=http"
      - "traefik.http.middlewares.todo-frontend-redirect.redirectscheme.scheme=https"
      - "traefik.http.routers.todo-frontend.middlewares=todo-frontend-redirect"
      - "traefik.http.routers.todo-frontend-secure.service=todo-frontend-secure"
      - "traefik.http.routers.todo-frontend-secure.rule=Host(`${APP_URL}`)"
      - "traefik.http.routers.todo-frontend-secure.entrypoints=https"
      - "traefik.http.routers.todo-frontend-secure.tls=true"
      - "traefik.http.services.todo-frontend-secure.loadbalancer.server.port=3000"
    networks:
      homelab:
        aliases:
          - ${APP_URL}

networks:
  homelab:
    name: projects_local_dev
    driver: bridge
    external: true
```

Le volume `/app/node_modules` mérite une attention particulière. Le premier
volume (`. :/app`) monte tout le répertoire local dans le conteneur — y compris
un éventuel `node_modules/` local. Le second (`/app/node_modules`) crée un
volume Docker anonyme qui "masque" ce dossier : les dépendances utilisées sont
celles installées dans le conteneur (Linux, avec les bons binaires), pas celles
de votre machine hôte.

---

##### 8. `tsconfig.json` — configuration TypeScript

```json [tsconfig.json]
{
  "extends": "./.nuxt/tsconfig.json"
}
```

Nuxt génère sa propre configuration TypeScript dans `.nuxt/tsconfig.json`
lors du build. On se contente d'en hériter — cela inclut automatiquement
les types des modules Nuxt, de Vue Router, de Pinia, etc.

---

##### 9. `nuxt.config.ts` — la configuration centrale

C'est le cœur du projet. Créez-le à la racine :

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: process.env.DEVTOOLS_ENABLE === 'true' },

  modules: [
    'vuetify-nuxt-module',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/i18n',
    '@vueuse/nuxt',
  ],

  runtimeConfig: {
    public: {
      appName: process.env.APP_NAME || 'Todo List',
    },
  },

  vuetify: {
    moduleOptions: { importComposables: true },
    vuetifyOptions: {
      icons: { defaultSet: 'mdi' },
      theme: {
        defaultTheme: 'dark',
        themes: {
          dark: {
            colors: {
              primary: '#41dcce',
              secondary: '#424242',
              error: '#FF5252',
              info: '#2196F3',
              success: '#4CAF50',
              warning: '#FFC107',
            },
          },
        },
      },
    },
  },

  i18n: {
    restructureDir: false,
    locales: [
      { code: 'fr', name: 'Français' },
      { code: 'en', name: 'English' },
    ],
    defaultLocale: 'fr',
    vueI18n: './i18n.config.ts',
  },

  vite: {
    server: {
      hmr: { protocol: 'wss', port: parseInt(process.env.HMR_PORT || '443') },
    },
  },

  typescript: { strict: true, typeCheck: false },
})
```

::tool-table
| Module | Rôle |
|--------|------|
| `vuetify-nuxt-module` | Intègre Vuetify 3 avec auto-import des composants |
| `@pinia/nuxt` | State management réactif |
| `pinia-plugin-persistedstate/nuxt` | Persiste automatiquement le store dans localStorage |
| `@nuxtjs/i18n` | Gestion des traductions FR/EN |
| `@vueuse/nuxt` | Composables utilitaires dont `useLocalStorage` |
::

`compatibilityDate` indique à Nuxt d'utiliser les comportements introduits
jusqu'à cette date. C'est le mécanisme de Nuxt 4 pour gérer les breaking
changes progressivement.

`runtimeConfig.public` expose des variables au client. Les variables
d'authentification seront ajoutées en article 2 — on garde ce fichier
minimal pour l'instant.

---

##### 10. `i18n.config.ts` — les traductions

```ts [i18n.config.ts]
export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'fr',
  messages: {
    fr: {
      global: {
        name: 'Todo List',
        home: 'Accueil',
        login: 'Connexion',
        register: 'Inscription',
        logout: 'Déconnexion',
      },
    },
    en: {
      global: {
        name: 'Todo List',
        home: 'Home',
        login: 'Login',
        register: 'Register',
        logout: 'Logout',
      },
    },
  },
}))
```

`legacy: false` active la Composition API de vue-i18n, cohérente avec
le style `<script setup>` de Nuxt 4. Les clés de traduction seront
enrichies au fur et à mesure des articles.

---

##### 11. `vitest.config.ts` — la configuration des tests

```ts [vitest.config.ts]
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.nuxt/',
        '.output/',
        'vitest.config.ts',
        'nuxt.config.ts',
      ],
    },
  },
})
```

`environment: 'nuxt'` demande à Vitest de simuler l'environnement Nuxt
pendant les tests — auto-imports, composables, etc. fonctionnent comme
dans l'application réelle.

---

##### 12. `app/app.vue` — le layout principal

Créez d'abord le répertoire `app/` :

```bash
mkdir -p app/pages
```

Puis créez `app/app.vue` — c'est le composant racine de toute l'application,
celui qui contient la barre de navigation et dans lequel s'affichent les pages :

```vue [app/app.vue]
<template>
  <v-app :theme="theme">
    <v-app-bar flat border="b">
      <v-app-bar-title>
        <nuxt-link to="/" class="text-decoration-none text-primary">
          {{ $t('global.name') }}
        </nuxt-link>
      </v-app-bar-title>

      <template #append>
        <v-btn
          :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          variant="text"
          @click="toggleTheme"
        />
      </template>
    </v-app-bar>

    <v-main>
      <nuxt-page />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
const isDark = useLocalStorage<boolean>('theme-dark', true)
const theme = computed(() => isDark.value ? 'dark' : 'light')

const toggleTheme = () => {
  isDark.value = !isDark.value
}
</script>
```

`useLocalStorage` vient de VueUse (auto-importé via `@vueuse/nuxt`). Il
synchronise la variable avec localStorage — le thème choisi est donc persisté
entre les rechargements de page, sans aucune logique supplémentaire.

`<nuxt-page />` est le slot dans lequel Nuxt injecte la page active selon
la route courante.

---

##### 13. `app/pages/index.vue` — la page d'accueil

Nuxt utilise le **file-based routing** : chaque fichier dans `app/pages/`
devient automatiquement une route. `index.vue` correspond à la route `/`.

```vue [app/pages/index.vue]
<template>
  <v-container class="py-12">
    <v-row justify="center">
      <v-col cols="12" md="8" class="text-center">
        <v-icon
          icon="mdi-format-list-checks"
          size="64"
          color="primary"
          class="mb-4"
        />
        <h1 class="text-h3 font-weight-bold mb-4">
          {{ $t('global.name') }}
        </h1>
        <div class="d-flex gap-4 justify-center">
          <v-btn color="primary" size="large" to="/login" variant="flat">
            {{ $t('global.login') }}
          </v-btn>
          <v-btn size="large" to="/register" variant="outlined">
            {{ $t('global.register') }}
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>
```

Les routes `/login` et `/register` n'existent pas encore — elles seront
créées en article 2. Les boutons sont là pour valider que la navigation
fonctionne.

---

#### 🚀 Premier lancement

La structure est en place. Avant de démarrer, il reste une étape si vous
développez en local : déclarer le domaine dans votre fichier `hosts`.

##### Configurer le fichier hosts (développement local)

Traefik route les requêtes en se basant sur le nom de domaine. Si vous
utilisez un domaine fictif comme `todo-frontend.domain.tld`, votre machine
doit savoir vers quelle IP le résoudre.

Éditez le fichier `hosts` avec les droits administrateur :

**Linux / macOS**

```bash
sudo nano /etc/hosts
```

**Windows** (PowerShell en administrateur)

```powershell
notepad C:\Windows\System32\drivers\etc\hosts
```

Ajoutez la ligne suivante à la fin du fichier :

```
127.0.0.1 todo-frontend.domain.tld
```

Remplacez `127.0.0.1` par l'IP de votre serveur si vous développez sur
une machine distante (VPS, homelab).

> 💡 Si vous utilisez un vrai nom de domaine pointant déjà vers votre
> serveur via un enregistrement DNS, cette étape n'est pas nécessaire.

##### Construire et démarrer

```bash
# Construire l'image (installe les dépendances via pnpm install)
docker compose build

# Démarrer en mode développement
docker compose up
```

Nuxt démarre, compile l'application et affiche quelque chose comme :

```
✔ Nuxt 4.4.7 with Nitro 2.x
  ➜ Local:    http://localhost:3000/
  ➜ Network:  http://0.0.0.0:3000/
```

L'application est accessible sur `https://todo-frontend.domain.tld`.
Vous devriez voir la page d'accueil avec les deux boutons et le basculeur
de thème dans la barre de navigation.

> 💡 Pour suivre les logs en temps réel :
> ```bash
> docker compose logs -f frontend
> ```

---

#### 🔖 Commit

```bash
git add .
git commit -m "chore: initialisation du projet"
git push origin main
```

> 💡 Jenkins pousse automatiquement vers GitHub après chaque push sur Forgejo.

---

#### ✅ Résumé

::tool-table
| Fichier | Rôle |
|---------|------|
| `package.json` | Dépendances et scripts |
| `pnpm.json` | Configuration pnpm v11 |
| `Dockerfile.dev` | Image Docker (node:lts-slim + pnpm) |
| `.dockerignore` | Exclut node_modules du build context |
| `.env.example` | Template des variables d'environnement |
| `.gitignore` | Fichiers exclus du versioning |
| `docker-compose.yml` | Orchestration Docker + Traefik |
| `tsconfig.json` | Configuration TypeScript |
| `nuxt.config.ts` | Modules, thème, i18n, HMR |
| `i18n.config.ts` | Traductions FR/EN |
| `vitest.config.ts` | Configuration des tests |
| `app/app.vue` | Layout principal avec bascule de thème |
| `app/pages/index.vue` | Page d'accueil |
::

---

Dans le prochain article, nous ajoutons l'authentification avec **nuxt-auth-utils** :
sessions sécurisées côté serveur, pages de connexion et d'inscription,
et protection des routes.

[Article 2 — Authentification →](/blog/article/2-to-do-list-auth)

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::