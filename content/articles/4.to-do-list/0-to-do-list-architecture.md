---
title: 'Todo List — Nuxt & Ruby on Rails'
description: 'Architecture, stack technique et plan de la série'
icon: 'i-mdi:checkbox-marked-circle-plus-outline'
color: 'secondary'
article_id: '0-to-do-list-architecture'
---

#### 📌 Todo List — Nuxt & Ruby on Rails

Dans cette série, nous allons construire une application **Todo List** complète, de la conception du backend jusqu'à l'interface utilisateur : authentification, gestion des tâches, catégories, persistance des données, tests et déploiement.

L'objectif n'est pas simplement de réaliser une liste de tâches fonctionnelle. Ce projet servira de fil conducteur pour découvrir comment un frontend **Nuxt 4** et une API **Ruby on Rails 8** peuvent collaborer au sein d'une architecture moderne, sécurisée et entièrement conteneurisée avec Docker.

Au fil des articles, nous mettrons en place les différents mécanismes indispensables à une application métier : communication via API REST, gestion des utilisateurs, validation des données, protection des accès, organisation du code et automatisation du déploiement.

Les sources du projet sont disponibles publiquement sur GitHub :

- 🎨 **Frontend Nuxt** : `github.com/tititoof/todo-frontend`
- 🗄️ **Backend Rails** : `github.com/tititoof/todo-backend`

> 💡 Les développements sont réalisés sur une instance Forgejo privée hébergée dans mon homelab. Les dépôts GitHub sont synchronisés automatiquement via Jenkins et servent de miroirs publics pour cette série d'articles.

L'objectif est de partir d'une application simple pour explorer des pratiques professionnelles réutilisables sur des projets beaucoup plus ambitieux : architecture frontend/backend découplée, API sécurisée, conteneurisation, intégration continue et déploiement automatisé.

---

#### 🏗️ Architecture générale

<mermaid>
graph TD
  User["👤 Utilisateur\nNavigateur"] -->|HTTPS| Traefik["🚦 Traefik\nReverse proxy + TLS"]
  subgraph DH["🐳 Docker Host"]
    subgraph FE["🎨 todo-frontend — Nuxt 4"]
      Pages["📄 Pages\nindex / login / register / todo"]
      Components["🧩 Composants\nnew.vue / list.vue"]
      Stores["🗃️ Pinia Stores\napplication / todo"]
      ServerRoutes["⚡ Server Routes\nProxy + BFF"]
      Pages --- Components
      Pages --- Stores
      Pages --- ServerRoutes
    end
    subgraph BE["🗄️ todo-backend — Rails 8"]
      Controllers["🎮 Controllers\nItems / Scopes"]
      Services["⚙️ Services\nCreate / Update / Destroy"]
      Serializers["📦 Serializers\nItem / Scope"]
      Devise["🔐 Devise API\nTokens JWT"]
      Controllers --- Services
      Controllers --- Serializers
      Controllers --- Devise
    end
    subgraph DB["💾 Données"]
      PG["🐘 PostgreSQL\nusers / todo_items / todo_scopes"]
    end
    Traefik --> Pages
    ServerRoutes -->|"API REST — Bearer token"| Controllers
    Services --> PG
    Devise --> PG
  end
  classDef clusterStyle fill:#41dcce,stroke:#333,stroke-width:1.5px;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  classDef dbStyle fill:#ddf,stroke:#00d,stroke-width:2px;
  class User,DH,FE,BE,DB clusterStyle;
  class Traefik,Pages,Components,Stores,ServerRoutes,Controllers,Services,Serializers,Devise containerStyle;
  class PG dbStyle;
</mermaid>

---

#### 🔐 Flux d'authentification

L'authentification est souvent l'un des premiers sujets de sécurité rencontrés lors du développement d'une application web.

Dans ce projet, le frontend Nuxt ne communique jamais directement avec l'API Rails pour les opérations sensibles. Toutes les requêtes transitent par le serveur Nuxt, qui joue le rôle de **Backend For Frontend (BFF)**.

Cette approche présente plusieurs avantages :

- le token JWT n'est jamais exposé au JavaScript du navigateur
- aucun token n'est stocké dans le `localStorage` ou le `sessionStorage`
- les risques liés aux attaques XSS sont fortement réduits
- l'API Rails reste accessible uniquement via des requêtes authentifiées contrôlées par Nuxt

Pour cela, nous utilisons **nuxt-auth-utils**. Lors de la connexion, le token JWT retourné par Rails est stocké côté serveur dans une session sécurisée associée à un cookie `httpOnly`, inaccessible depuis le navigateur.

<mermaid>
%%{init: {'theme':'base','themeVariables':{
  'primaryColor': '#004c6c',
  'primaryTextColor': '#ffe08c',
  'primaryBorderColor': '#60a5fa',
  'actorBorder':'#85cfff',
  'actorTextColor':'#ffe08c',
  'actorLineColor':'#66f9ea',
  'signalColor':'#66f9ea',
  'signalTextColor':'#89fb8d',
  'labelBoxBorderColor':'#2563eb',
  'labelBoxBkgColor':'#41dcce',
  'labelTextColor':'#1e40af'
}}}%%
sequenceDiagram
  actor U as Utilisateur
  participant FE as Nuxt (Browser)
  participant NS as Nuxt Server
  participant BE as Rails API
  participant DB as PostgreSQL
  U->>FE: Email + mot de passe
  FE->>NS: POST /api/auth/login
  NS->>BE: POST /users/tokens/sign_in
  BE->>DB: Vérifie les credentials
  DB-->>BE: Utilisateur valide
  BE-->>NS: token + refresh_token
  Note over NS: Stocke le token dans la session scellée
  NS-->>FE: Cookie httpOnly (jamais le token brut)
  FE-->>U: Redirige vers /todo
  Note over FE,BE: Requêtes authentifiées suivantes
  FE->>NS: GET /api/todo/items + cookie
  NS->>BE: GET /api/v1/todo/items Bearer token
  BE->>DB: Items de l'utilisateur
  DB-->>BE: [...]
  BE-->>NS: data [...]
  NS-->>FE: data [...]
  FE->>FE: Met à jour le store Pinia
  FE-->>U: Affiche la liste
</mermaid>

> 💡 Du point de vue du navigateur, seul le cookie de session Nuxt existe. Le token JWT Rails reste entièrement côté serveur, ce qui rapproche cette architecture des mécanismes d'authentification utilisés dans de nombreuses applications professionnelles modernes.

---

#### 🧩 Ce que nous allons construire

Cette série s'appuie sur un projet volontairement simple : une Todo List. Derrière cette apparente simplicité se cachent pourtant la plupart des problématiques rencontrées dans une application web moderne.

Au fil des chapitres, nous ajouterons progressivement :

- **Authentification** : inscription, connexion et déconnexion via Devise API et nuxt-auth-utils
- **Gestion des tâches** : création, modification, suppression et marquage comme terminées
- **Catégories (Scopes)** : classement par contexte (Personnel, Travail, Famille, Autre)
- **Filtrage dynamique** : affichage des tâches selon leur catégorie
- **Persistance** : stockage sécurisé en PostgreSQL
- **Sécurité** : routes protégées, sessions sécurisées, tokens jamais exposés au navigateur
- **Tests** : couverture backend avec RSpec et frontend avec Vitest

À la fin de cette série, vous disposerez d'une base solide réutilisable pour des applications métier beaucoup plus ambitieuses.

---

#### 📡 Endpoints API

> 💡 Le browser n'appelle jamais Rails directement. Il appelle les **server routes Nuxt** (`/api/*`) qui proxient vers Rails avec le token depuis la session scellée.

::tool-table
| Méthode | Endpoint Nuxt | → Rails | Auth |
|---------|--------------|---------|------|
| `POST` | `/api/auth/login` | `/users/tokens/sign_in` | ❌ |
| `POST` | `/api/auth/register` | `/users/tokens/sign_up` | ❌ |
| `DELETE` | `/api/auth/logout` | `/users/tokens/revoke` | ✅ |
| `GET` | `/api/todo/items` | `/api/v1/todo/items` | ✅ |
| `POST` | `/api/todo/items` | `/api/v1/todo/items` | ✅ |
| `PUT` | `/api/todo/items/:id` | `/api/v1/todo/items/:id` | ✅ |
| `DELETE` | `/api/todo/items/:id` | `/api/v1/todo/items/:id` | ✅ |
| `GET` | `/api/todo/scopes` | `/api/v1/todo/scopes` | ✅ |
| `POST` | `/api/todo/scopes` | `/api/v1/todo/scopes` | ✅ |
| `PUT` | `/api/todo/scopes/:id` | `/api/v1/todo/scopes/:id` | ✅ |
| `DELETE` | `/api/todo/scopes/:id` | `/api/v1/todo/scopes/:id` | ✅ |
::

---

#### 🛠️ Stack technique

Cette Todo List s'appuie sur une stack moderne largement utilisée dans les projets professionnels. L'objectif n'est pas uniquement d'apprendre à utiliser chaque technologie individuellement, mais surtout de comprendre comment elles collaborent au sein d'une architecture complète.

::tool-table
| Couche | Technologie |
|--------|-------------|
| Frontend | Nuxt |
| UI | Vuetify |
| Auth frontend | nuxt-auth-utils |
| State management | Pinia |
| Backend | Ruby on Rails |
| Authentification | Devise + devise-api |
| Sérialisation | jsonapi-serializer |
| Base de données | PostgreSQL |
| Reverse proxy | Traefik |
| Containerisation | Docker + Compose |
| Tests frontend | Vitest + Vue Test Utils |
| Tests backend | RSpec + FactoryBot |
::

---

#### 📚 Plan de la série

Nous allons construire l'application étape par étape, en faisant évoluer simultanément le frontend et le backend jusqu'à obtenir une application complète, sécurisée et testée.

::tool-table
| Article | Sujet | Dépôt |
|---------|-------|-------|
| **0 — Architecture** (cet article) | Vue d'ensemble, stack, plan | — |
| [**1 — Frontend : initialisation**](/blog/article/1-to-do-list-initialisation) | Dépôt Git, Docker, Nuxt 4 | `todo-frontend` |
| [**2 — Frontend : authentification**](/blog/article/2-to-do-list-auth) | nuxt-auth-utils, server routes, login/register | `todo-frontend` |
| [**3 — Frontend : gestion locale des tâches**](/blog/article/3-to-do-list-taches) | Composants, Pinia, persistance locale | `todo-frontend` |
| [**4 — Backend : initialisation**](/blog/article/4-to-do-list-backend) | Dépôt Git, Docker, Rails 8 API | `todo-backend` |
| [**5 — Backend : authentification**](/blog/article/5-to-do-list-backend-auth) | Devise, devise-api, User, migrations, RSpec | `todo-backend` |
| [**6 — Backend : gestion des tâches**](/blog/article/6-to-do-list-backend-todo) | Models, services, serializers, contrôleurs | `todo-backend` |
| [**7 — Connexion frontend/backend**](/blog/article/7-to-do-list-frontend-backend) | Proxy Nuxt, API REST, flux complet | `todo-frontend` |
::

---

#### 🚀 En route

L'architecture est maintenant définie. Nous savons où vont vivre les données, comment les utilisateurs vont s'authentifier, comment le frontend dialoguera avec l'API Rails et quelles technologies nous utiliserons pour construire l'ensemble.

Il est temps de passer à la pratique.

Dans le prochain article, nous allons créer le dépôt Git, mettre en place l'environnement Docker et initialiser notre projet Nuxt 4 afin de poser les premières fondations de l'application.

[Article 1 — Initialisation du frontend →](/blog/article/1-to-do-list-initialisation)

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::