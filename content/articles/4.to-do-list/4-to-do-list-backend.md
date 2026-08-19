---
title: 'Todo List — Backend : initialisation'
description: 'Mise en place du projet Rails 8 API avec Docker et PostgreSQL'
icon: 'i-mdi:checkbox-marked-circle-plus-outline'
color: 'secondary'
article_id: '4-to-do-list-backend'
draft: false
publishedAt: '2026-07-01'
---

#### 🗄️ Backend — Initialisation

Dans cet article, nous créons le dépôt backend et mettons en place
la structure du projet Rails 8 en mode API, conteneurisé avec Docker
et connecté à PostgreSQL.

> 💡 Commit correspondant :
> [`chore: initialisation du projet`](https://forgejo.chartman-fr.ovh/tititoof/todo-backend){:target="_blank"}

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

---

#### 📌 Rails 8 en mode API

Rails 8 en mode `--api` retire tout ce qui ne sert pas à une API REST :
pas de vues, pas d'assets, pas de sessions, pas de cookies. Le résultat
est une application plus légère et plus rapide.

Les nouveautés de Rails 8 notables pour ce projet :

- **Solid Queue** : gestionnaire de jobs asynchrones intégré (remplace Sidekiq/Redis pour la plupart des cas)
- **Authentification native** : `rails generate authentication` disponible, mais on utilisera Devise pour rester dans l'écosystème habituel

---

#### 📦 Création du dépôt

Choisissez votre plateforme.

##### Forgejo (self-hosted)

Dans Forgejo → **+** → **New Repository** :

- **Repository name** : `todo-backend`
- **Visibility** : Public
- **Initialize repository** : ✅

```bash
git clone git@forgejo.chartman-fr.ovh:tititoof/todo-backend.git
cd todo-backend
```

##### GitHub

Sur [github.com](https://github.com){:target="_blank"} → **+** → **New repository** :

- **Repository name** : `todo-backend`
- **Visibility** : Public
- **Initialize this repository** : ✅

```bash
git clone git@github.com:votre-utilisateur/todo-backend.git
cd todo-backend
```

##### GitLab

Sur [gitlab.com](https://gitlab.com){:target="_blank"} → **+** → **New project** → **Create blank project** :

- **Project name** : `todo-backend`
- **Visibility Level** : Public
- **Initialize repository with a README** : ✅

```bash
git clone git@gitlab.com:votre-utilisateur/todo-backend.git
cd todo-backend
```

---

#### 🏗️ Construction

---

##### 1. Créer `Gemfile`

Le `Gemfile` définit les dépendances Ruby. Créez-le à la racine :

```ruby [Gemfile]
source "https://rubygems.org"

gem "rails", "~> 8.0"
gem "pg", "~> 1.1"
gem "puma", ">= 5.0"
gem "rack-cors"
gem "bootsnap", require: false

# Authentification
gem "devise", "~> 4.9"
gem "devise-api", "~> 0.1"

# Sérialisation JSON:API
gem "jsonapi-serializer"

group :development, :test do
  gem "debug", platforms: %i[mri windows]
  gem "rspec-rails", "~> 7.0"
  gem "factory_bot_rails"
  gem "faker"
  gem "shoulda-matchers"
end

group :development do
  gem "rubocop-rails-omakase", require: false
end
```

::tool-table
| Gem | Rôle |
|-----|------|
| `devise` + `devise-api` | Authentification + tokens JWT |
| `jsonapi-serializer` | Sérialisation des réponses en JSON:API |
| `rack-cors` | Configuration CORS pour le frontend Nuxt |
| `rspec-rails` | Framework de tests |
| `factory_bot_rails` | Factories pour les objets de test |
| `shoulda-matchers` | Matchers RSpec pour les validations Rails |
::

---

##### 2. Créer `Dockerfile.dev`

```dockerfile [Dockerfile.dev]
FROM ruby:3.3-slim

RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
      build-essential \
      libpq-dev \
      git \
      curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Gemfile Gemfile.lock* ./

RUN bundle install

EXPOSE 3001
CMD ["bin/rails", "server", "-b", "0.0.0.0", "-p", "3001"]
```

On utilise `ruby:3.3-slim` (image Debian allégée) pour les mêmes raisons
que côté frontend : les extensions natives Ruby (comme `pg` pour PostgreSQL)
nécessitent glibc, incompatible avec Alpine.

Le pattern `COPY Gemfile Gemfile.lock* ./` avant `bundle install` optimise
le cache Docker : si le `Gemfile` ne change pas, ce layer est réutilisé.

---

##### 3. Créer `.dockerignore`

```bash [.dockerignore]
vendor/bundle
.bundle
tmp/
log/
.git/
.env
coverage/
*.log
```

---

##### 4. Créer `docker-compose.yml`

```yaml [docker-compose.yml]
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: todo-backend
    restart: unless-stopped
    volumes:
      - .:/app
      - /app/vendor/bundle
      - /app/tmp
    environment:
      - RAILS_ENV=development
      - DATABASE_URL=${DATABASE_URL}
      - CORS_ORIGINS=${CORS_ORIGINS}
      - SECRET_KEY_BASE=${SECRET_KEY_BASE}
    depends_on:
      postgresql:
        condition: service_healthy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.todo-backend.rule=Host(`${APP_URL}`)"
      - "traefik.http.routers.todo-backend.entrypoints=http"
      - "traefik.http.middlewares.todo-backend-redirect.redirectscheme.scheme=https"
      - "traefik.http.routers.todo-backend.middlewares=todo-backend-redirect"
      - "traefik.http.routers.todo-backend-secure.service=todo-backend-secure"
      - "traefik.http.routers.todo-backend-secure.rule=Host(`${APP_URL}`)"
      - "traefik.http.routers.todo-backend-secure.entrypoints=https"
      - "traefik.http.routers.todo-backend-secure.tls=true"
      - "traefik.http.services.todo-backend-secure.loadbalancer.server.port=3001"
    networks:
      homelab:
        aliases:
          - ${APP_URL}

  postgresql:
    image: postgres:17
    container_name: todo-backend-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - ./.docker/postgresql:/var/lib/postgresql/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      homelab:
        aliases:
          - ${POSTGRES_HOST:-postgresql}

networks:
  homelab:
    name: projects_local_dev
    driver: bridge
    external: true
```

Le service `backend` utilise `depends_on` avec `condition: service_healthy`
pour s'assurer que PostgreSQL est prêt avant que Rails démarre.
La `healthcheck` de PostgreSQL vérifie que le service accepte les connexions.

Les volumes `/app/vendor/bundle` et `/app/tmp` isolent les gems et les
fichiers temporaires Rails dans le conteneur.

---

##### 5. Créer `.env.example` et `.env`

```bash [.env.example]
# Application
APP_URL=todo-backend.domain.tld
RAILS_ENV=development

# Base de données
DATABASE_URL=postgresql://todo_user:todo_password@postgresql:5432/todo_backend_development
POSTGRES_HOST=postgresql
POSTGRES_USER=todo_user
POSTGRES_PASSWORD=todo_password
POSTGRES_DB=todo_backend_development

# CORS — URL du frontend Nuxt
CORS_ORIGINS=https://todo-frontend.domain.tld

# Rails — générez avec : docker compose run --rm backend bundle exec rails secret
SECRET_KEY_BASE=change_me_with_bundle_exec_rails_secret
```

Copiez le fichier et générez `SECRET_KEY_BASE` :

```bash
cp .env.example .env
```

Nous reviendrons générer la clé après le premier build.

---

##### 6. Initialiser le projet Rails via Docker

Maintenant que `Gemfile` et `Dockerfile.dev` sont en place, construisez
l'image puis utilisez le conteneur pour initialiser Rails :

```bash
# Construire l'image (installe les gems)
docker compose build

# Initialiser Rails dans le répertoire courant
docker compose run --rm backend bundle exec rails new . \
  --api \
  --database=postgresql \
  --skip-active-storage \
  --skip-action-text \
  --skip-cable \
  --skip-hotwire \
  --force
```

Le flag `--force` écrase les fichiers générés par notre `Gemfile` — Rails
en crée un également lors de `rails new`. Relancez ensuite un build pour
installer les dépendances ajoutées par Rails :

```bash
docker compose build
```

---

##### 7. Personnaliser `config/application.rb`

Rails a généré ce fichier. Remplacez son contenu par :

```ruby [config/application.rb]
require_relative "boot"
require "rails/all"

Bundler.require(*Rails.groups)

module TodoBackend
  class Application < Rails::Application
    config.load_defaults 8.0
    config.api_only = true
    config.time_zone = "Paris"
    config.active_record.default_timezone = :local
  end
end
```

`api_only: true` supprime les middlewares inutiles pour une API (cookies,
sessions, flash…). `time_zone` configure le fuseau horaire pour les
timestamps stockés en base.

---

##### 8. Personnaliser `config/database.yml`

Remplacez le contenu généré par :

```yaml [config/database.yml]
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  url: <%= ENV["DATABASE_URL"] %>

development:
  <<: *default

test:
  <<: *default
  url: <%= ENV.fetch("DATABASE_URL_TEST",
         ENV["DATABASE_URL"].to_s.sub("_development", "_test")) %>

production:
  <<: *default
```

On centralise toute la configuration PostgreSQL dans `DATABASE_URL` — host,
port, utilisateur, mot de passe et nom de base en une seule variable.
L'URL de test se déduit automatiquement de l'URL de développement.

---

##### 9. Créer `config/initializers/cors.rb`

```ruby [config/initializers/cors.rb]
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch("CORS_ORIGINS", "http://localhost:3000").split(",")

    resource "*",
      headers: :any,
      methods: %i[get post put patch delete options head],
      credentials: false
  end
end
```

`CORS_ORIGINS` accepte plusieurs origines séparées par des virgules —
utile pour autoriser à la fois `todo-frontend.domain.tld` et
`localhost:3000` en développement.

---

##### 10. Personnaliser `config/routes.rb`

```ruby [config/routes.rb]
Rails.application.routes.draw do
  # Health check — utilisé par les load balancers et les healthchecks Docker
  get "up", to: "rails/health#show", as: :rails_health_check

  # Les routes API seront ajoutées en article 5 et 6
  namespace :api do
    namespace :v1 do
    end
  end
end
```

---

##### 11. Créer les classes de base des Services (`ApplicationService` + `ServiceResult`)

Tout appel à un Service renvoie un objet `ServiceResult` — jamais une
exception pour un échec métier attendu (validation ratée, règle métier
non respectée). Le controller n'a qu'à interroger `success?`, `data`
et `errors`.

```bash
mkdir -p app/services
```

```ruby [app/services/service_result.rb]
class ServiceResult
  attr_reader :data, :errors

  def initialize(success:, data: nil, errors: [])
    @success = success
    @data = data
    @errors = Array(errors)
  end

  def success?
    @success
  end

  def failure?
    !success?
  end
end
```

```ruby [app/services/application_service.rb]
class ApplicationService
  def self.call(...)
    new(...).call
  end

  private

  def success(data = nil)
    ServiceResult.new(success: true, data: data)
  end

  def failure(errors)
    ServiceResult.new(success: false, errors: errors)
  end
end
```

Tous les services héritent de `ApplicationService` et implémentent
`#call`, qui doit toujours se terminer par `success(...)` ou
`failure(...)`. `.call` en méthode de classe permet d'écrire
`Todos::CreateService.call(params)` depuis le controller sans jamais
instancier l'objet explicitement :

```ruby
module Todos
  class CreateService < ApplicationService
    def initialize(params)
      @params = params
    end

    def call
      todo = Todo::Item.new(@params)

      if todo.save
        success(todo)
      else
        failure(todo.errors.full_messages)
      end
    end
  end
end
```

---

##### 12. Créer `app/controllers/application_controller.rb`

Ce controller de base ajoute un helper `serializer_response` utilisé
par tous les controllers API pour transformer un `ServiceResult` en
réponse JSON:API :

```ruby [app/controllers/application_controller.rb]
class ApplicationController < ActionController::API
  # Sérialise la réponse à partir d'un ServiceResult (voir app/services/service_result.rb)
  def serializer_response(result, serializer_class, success_status: :ok)
    if result.success?
      payload = result.data

      if payload.nil?
        render json: {}, status: success_status
      else
        render json: serializer_class.new(payload).serializable_hash, status: success_status
      end
    else
      render json: { errors: result.errors }, status: :unprocessable_entity
    end
  end
end
```

Tous les controllers l'utiliseront ainsi :

```ruby
def create
  result = Todos::CreateService.call(todo_params)
  serializer_response(result, Todo::ItemSerializer, success_status: :created)
end
```

---

##### 13. Configurer RSpec

Générez la configuration RSpec via Docker :

```bash
docker compose run --rm backend bundle exec rails generate rspec:install
```

Puis personnalisez `spec/rails_helper.rb` :

```ruby [spec/rails_helper.rb]
require "spec_helper"

ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rspec/rails"

require "shoulda/matchers"
Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end

RSpec.configure do |config|
  config.fixture_paths = ["#{::Rails.root}/spec/fixtures"]
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!
  config.include FactoryBot::Syntax::Methods
end
```

`use_transactional_fixtures: true` encapsule chaque test dans une transaction
annulée à la fin — la base reste propre entre les tests sans avoir à
la réinitialiser.

---

#### 🚀 Premier démarrage

##### Configurer le fichier hosts (développement local)

Ajoutez le domaine dans votre fichier `hosts` pour que Traefik puisse
le résoudre en local.

**Linux / macOS**

```bash
sudo nano /etc/hosts
```

**Windows** (PowerShell en administrateur)

```powershell
notepad C:\Windows\System32\drivers\etc\hosts
```

Ajoutez :

```
127.0.0.1 todo-backend.domain.tld
```

> 💡 Remplacez `127.0.0.1` par l'IP de votre serveur si vous développez
> sur une machine distante.

##### Générer `SECRET_KEY_BASE` et créer la base

```bash
# Générer SECRET_KEY_BASE et l'ajouter dans .env
docker compose run --rm backend bundle exec rails secret

# Créer la base de données
docker compose run --rm backend bin/rails db:create

# Démarrer
docker compose up -d

# Vérifier que Rails répond
curl https://todo-backend.domain.tld/up
# → { "status": 200 }
```

> ⚠️ Le réseau `projects_local_dev` doit exister avant de démarrer.
> Consultez l'[article Traefik](/blog/article/3-docker-traefik-introduction).

---

#### 🔖 Commit

```bash
git add .
git commit -m "chore: initialisation du projet"
git push origin main
```

---

#### ✅ Résumé du commit

::tool-table
| Fichier | Action | Rôle |
|---------|--------|------|
| `Gemfile` | ➕ Nouveau | Dépendances Rails 8 + Devise + RSpec |
| `Dockerfile.dev` | ➕ Nouveau | Image Ruby 3.3 slim |
| `.dockerignore` | ➕ Nouveau | Exclut vendor/bundle et tmp |
| `docker-compose.yml` | ➕ Nouveau | Backend + PostgreSQL + Traefik |
| `.env.example` | ➕ Nouveau | Template des variables d'environnement |
| `config/application.rb` | ✏️ Modifié | `api_only`, timezone |
| `config/database.yml` | ✏️ Modifié | Connexion via `DATABASE_URL` |
| `config/initializers/cors.rb` | ➕ Nouveau | CORS configurable |
| `config/routes.rb` | ✏️ Modifié | Health check + namespace API |
| `app/services/service_result.rb` | ➕ Nouveau | Contrat `success?` / `data` / `errors` |
| `app/services/application_service.rb` | ➕ Nouveau | Classe de base des Services (`.call`) |
| `app/controllers/application_controller.rb` | ✏️ Modifié | Helper `serializer_response` (consomme un `ServiceResult`) |
| `spec/rails_helper.rb` | ✏️ Modifié | RSpec + FactoryBot + Shoulda |
::

---

Dans le prochain article, nous ajoutons l'authentification :
modèle User, migrations Devise et endpoints JWT.

[Article 5 — Backend : authentification →](/blog/article/5-to-do-list-backend-auth)

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::