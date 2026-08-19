---
title: 'Todo List — Backend : authentification'
description: 'Devise, devise-api, User model, migrations et tests RSpec'
icon: 'i-mdi:checkbox-marked-circle-plus-outline'
color: 'secondary'
article_id: '5-to-do-list-backend-auth'
draft: false
publishedAt: '2026-07-01'
---

#### 🔐 Backend — Authentification

Dans cet article, nous mettons en place l'authentification avec **Devise**
et **devise-api** : modèle utilisateur, migrations, tokens JWT et tests RSpec.

> 💡 Commit correspondant :
> [`feat: authentification Devise + devise-api`](https://forgejo.chartman-fr.ovh/tititoof/todo-backend){:target="_blank"}

---

#### 🏗️ Construction

---

##### 1. Générer les fichiers Devise

Devise fournit des générateurs qui créent les migrations, le modèle et
la configuration. Exécutez-les dans le conteneur :

```bash
# Installe la configuration de base de Devise
docker compose exec backend bundle exec rails generate devise:install

# Crée le modèle User et la migration associée
docker compose exec backend bundle exec rails generate devise User

# Crée la migration des tokens devise-api
docker compose exec backend bundle exec rails generate devise_api:install
```

Ces trois commandes génèrent :

::tool-table
| Fichier | Description |
|---------|-------------|
| `config/initializers/devise.rb` | Configuration globale de Devise |
| `db/migrate/xxx_devise_create_users.rb` | Table `users` |
| `db/migrate/xxx_create_devise_api_tables.rb` | Table des tokens |
| `app/models/user.rb` | Modèle User |
::

---

##### 2. Vérifier les migrations

Avant de migrer, vérifiez que les deux fichiers générés correspondent
à ce qui suit. Adaptez si nécessaire.

> ⚠️ Le `Gemfile` épingle `devise-api` en `~> 0.1`, mais ce contrainte
> autorise en réalité toute version `0.x` — au moment de la rédaction,
> `bundle install` résout la `0.2.0`. Son générateur produit un schéma
> différent des versions `0.1.x` : `revoked_at` (datetime) à la place de
> `revoked` (boolean), et des index simples au lieu d'index uniques.
> **Ne modifiez pas ces colonnes** — le code Ruby du gem (`token.rb`,
> `TokensService::Revoke`) est câblé sur `revoked_at`. Si vous éditez la
> migration pour revenir au schéma `revoked` boolean décrit dans une
> version antérieure de cet article, le endpoint `revoke` lèvera une
> `NoMethodError` au runtime.

**`db/migrate/xxx_devise_create_users.rb`** :

```ruby [db/migrate/xxx_devise_create_users.rb]
class DeviseCreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :email,              null: false, default: ""
      t.string :encrypted_password, null: false, default: ""

      t.string :reset_password_token
      t.datetime :reset_password_sent_at
      t.datetime :remember_created_at

      t.timestamps null: false
    end

    add_index :users, :email,                unique: true
    add_index :users, :reset_password_token, unique: true
  end
end
```

**`db/migrate/xxx_create_devise_api_tables.rb`** — laissez le fichier généré
par `devise_api:install` tel quel, ne le réécrivez pas à la main :

```ruby [db/migrate/xxx_create_devise_api_tables.rb]
class CreateDeviseApiTables < ActiveRecord::Migration[8.1]
  def change
    # Utilise le type de clé primaire/étrangère configuré pour Active Record
    primary_key_type, foreign_key_type = primary_and_foreign_key_types

    create_table :devise_api_tokens, id: primary_key_type do |t|
      t.belongs_to :resource_owner, null: false, polymorphic: true, index: true, type: foreign_key_type
      t.string :access_token, null: false, index: true
      t.string :refresh_token, null: true, index: true
      t.integer :expires_in, null: false
      t.datetime :revoked_at, null: true
      t.string :previous_refresh_token, null: true, index: true

      t.timestamps
    end
  end

  private

  def primary_and_foreign_key_types
    config = Rails.configuration.generators
    setting = config.options[config.orm][:primary_key_type]
    primary_key_type = setting || :primary_key
    foreign_key_type = setting || :bigint
    [primary_key_type, foreign_key_type]
  end
end
```

Puis migrez :

```bash
docker compose exec backend bin/rails db:migrate
```

---

##### 3. Configurer `config/initializers/devise.rb`

Devise a généré ce fichier avec beaucoup de commentaires. Remplacez-le
par une version épurée centrée sur notre besoin API :

```ruby [config/initializers/devise.rb]
Devise.setup do |config|
  # Charge l'intégration ActiveRecord — sans cette ligne, `devise :database_authenticatable, ...`
  # dans les modèles échoue avec NoMethodError.
  require "devise/orm/active_record"

  config.mailer_sender = ENV.fetch("MAILER_FROM", "noreply@example.com")

  # API uniquement — désactive les redirections HTML après connexion/déconnexion
  config.navigational_formats = []

  config.sign_in_after_change_password = false
  config.sign_out_via = :delete

  # devise-api
  config.api.configure do |api|
    # Access token — expire après 1 heure
    api.access_token.expires_in = 1.hour
    api.access_token.generator  = ->(_owner) { Devise.friendly_token(60) }

    # Refresh token — expire après 1 semaine
    api.refresh_token.enabled    = true
    api.refresh_token.expires_in = 1.week
    api.refresh_token.generator  = ->(_owner) { Devise.friendly_token(60) }

    # Authorization via header Bearer
    api.authorization.key    = "Authorization"
    api.authorization.scheme = "Bearer"
  end
end
```

`navigational_formats = []` est essentiel en mode API : sans ça, Devise
tente des redirections HTML après connexion/déconnexion, ce qui provoque
des erreurs `ActionController::InvalidAuthenticityToken`.

`require "devise/orm/active_record"` est générée par défaut par
`devise:install` mais disparaît si vous épurez le fichier sans y prêter
attention — c'est elle qui ajoute la méthode de classe `devise` sur
`ActiveRecord::Base`. Sans elle, `User < ApplicationRecord` avec un appel
à `devise :database_authenticatable, ...` lève `NoMethodError: undefined
method 'devise' for class User` au chargement du modèle.

---

##### 4. Mettre à jour `app/models/user.rb`

Devise a généré le modèle. Ajoutez `:api` dans la liste des modules
et la relation vers les tâches (créées en article 6) :

```ruby [app/models/user.rb]
class User < ApplicationRecord
  devise :database_authenticatable,
         :registerable,
         :recoverable,
         :rememberable,
         :validatable,
         :api            # ← active devise-api (tokens JWT)

  # Relation vers les tâches — la table sera créée en article 6
  has_many :todo_items, class_name: "Todo::Item", dependent: :destroy
end
```

`:api` active le module devise-api sur ce modèle — il génère les endpoints
`sign_in`, `sign_up`, `refresh` et `revoke` automatiquement.

---

##### 5. Mettre à jour `config/routes.rb`

```ruby [config/routes.rb]
Rails.application.routes.draw do
  devise_for :users

  get "up", to: "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      # Les routes todo seront ajoutées en article 6
    end
  end
end
```

`devise_for :users` génère automatiquement ces endpoints :

::tool-table
| Méthode | Endpoint | Action |
|---------|----------|--------|
| `POST` | `/users/tokens/sign_up` | Inscription |
| `POST` | `/users/tokens/sign_in` | Connexion |
| `POST` | `/users/tokens/refresh` | Renouvellement token |
| `POST` | `/users/tokens/revoke` | Déconnexion |
| `GET` | `/users/tokens/info` | Informations utilisateur |
::

> 💡 `revoke` est en `POST`, pas en `DELETE` — c'est ainsi que
> `devise-api` déclare la route (`resource :tokens do collection do post
> :revoke ... end end`). Une requête `DELETE` sur cette route renvoie 404.

Vérifiez les routes générées :

```bash
docker compose exec backend bin/rails routes | grep tokens
```

---

##### 6. Créer la factory User

```bash
mkdir -p spec/factories
```

```ruby [spec/factories/users.rb]
FactoryBot.define do
  factory :user do
    email                 { Faker::Internet.unique.email }
    password              { "password123" }
    password_confirmation { "password123" }
  end
end
```

`Faker::Internet.unique.email` garantit un email unique à chaque appel
de la factory — pas de collision en base lors des tests parallèles.

---

##### 7. Créer `spec/models/user_spec.rb`

```bash
mkdir -p spec/models
```

```ruby [spec/models/user_spec.rb]
require "rails_helper"

RSpec.describe User, type: :model do
  subject { build(:user) }

  describe "validations" do
    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email).case_insensitive }
    it { should validate_presence_of(:password) }
    it { should validate_length_of(:password).is_at_least(6) }
  end

  describe "factory" do
    it "est valide avec les attributs par défaut" do
      expect(build(:user)).to be_valid
    end

    it "est invalide sans email" do
      expect(build(:user, email: nil)).not_to be_valid
    end

    it "est invalide avec un mot de passe trop court" do
      expect(build(:user, password: "abc", password_confirmation: "abc")).not_to be_valid
    end
  end
end
```

---

##### 8. Créer `spec/requests/auth_spec.rb`

```bash
mkdir -p spec/requests
```

```ruby [spec/requests/auth_spec.rb]
require "rails_helper"

RSpec.describe "Authentification", type: :request do
  describe "POST /users/tokens/sign_up" do
    let(:valid_params) do
      {
        email: "user@example.com",
        password: "password123",
        password_confirmation: "password123"
      }
    end

    it "crée un compte et retourne un token" do
      post sign_up_user_tokens_path, params: valid_params

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json["token"]).to be_present
      expect(json["refresh_token"]).to be_present
    end

    it "retourne une erreur si l'email est déjà pris" do
      create(:user, email: "user@example.com")

      post sign_up_user_tokens_path, params: valid_params

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "POST /users/tokens/sign_in" do
    let!(:user) { create(:user, email: "user@example.com", password: "password123") }

    it "retourne un token valide" do
      post sign_in_user_tokens_path, params: {
        email: "user@example.com",
        password: "password123"
      }

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["token"]).to be_present
    end

    it "retourne 401 avec de mauvais credentials" do
      post sign_in_user_tokens_path, params: {
        email: "user@example.com",
        password: "wrong"
      }

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /users/tokens/revoke" do
    it "révoque le token — plus d'accès ensuite" do
      user = create(:user)
      post sign_in_user_tokens_path, params: {
        email: user.email,
        password: "password123"
      }
      token = JSON.parse(response.body)["token"]

      post revoke_user_tokens_path, headers: { "Authorization" => "Bearer #{token}" }

      expect(response).to have_http_status(:no_content)

      get info_user_tokens_path, headers: { "Authorization" => "Bearer #{token}" }
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
```

---

#### 🧪 Lancer les tests

> ⚠️ Notre `docker-compose.yml` (article 4) fixe `RAILS_ENV=development`
> sur le conteneur `backend`. Cette variable est déjà présente dans
> l'environnement du conteneur au moment où `bundle exec rspec` démarre,
> ce qui **écrase silencieusement** le `ENV["RAILS_ENV"] ||= "test"` de
> `spec/rails_helper.rb` (`||=` ne s'applique que si la variable est
> vide). Résultat sans précaution : RSpec tourne en environnement
> `development` — mauvaise base de données, et surtout `config.hosts`
> (restreint en dev à `localhost`/votre domaine) rejette le host de test
> par défaut de Rails (`www.example.com`) avec une erreur 403 "Blocked
> hosts". Pensez donc à toujours forcer l'environnement avec `-e
> RAILS_ENV=test` sur `docker compose exec` :

```bash
# Tests du modèle
docker compose exec -e RAILS_ENV=test backend bundle exec rspec spec/models/user_spec.rb

# Tests des endpoints auth
docker compose exec -e RAILS_ENV=test backend bundle exec rspec spec/requests/auth_spec.rb

# Ou tous les tests
docker compose exec -e RAILS_ENV=test backend bundle exec rspec
```

---

#### 🔖 Commit

```bash
git add .
git commit -m "feat: authentification Devise + devise-api"
git push origin main
```

---

#### ✅ Résumé du commit

::tool-table
| Fichier | Action | Rôle |
|---------|--------|------|
| `config/initializers/devise.rb` | ✏️ Modifié | Configuration tokens JWT, mode API |
| `config/routes.rb` | ✏️ Modifié | `devise_for :users` |
| `app/models/user.rb` | ✏️ Modifié | Module `:api`, relation `todo_items` |
| `db/migrate/xxx_devise_create_users.rb` | ➕ Généré | Table `users` |
| `db/migrate/xxx_create_devise_api_tables.rb` | ➕ Généré | Table des tokens (`revoked_at`) |
| `spec/factories/users.rb` | ➕ Nouveau | Factory User avec Faker |
| `spec/models/user_spec.rb` | ➕ Nouveau | Tests des validations |
| `spec/requests/auth_spec.rb` | ➕ Nouveau | Tests des endpoints auth |
::

---

Dans le prochain article, nous créons les modèles `Todo::Scope` et `Todo::Item`
avec leurs controllers versionnés, services et serializers.

[Article 6 — Backend : todo →](/blog/article/6-to-do-list-backend-todo)

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::