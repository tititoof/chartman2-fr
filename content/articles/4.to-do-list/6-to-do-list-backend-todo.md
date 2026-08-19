---
title: 'Todo List — Backend : todo'
description: 'Models, services, serializers JSON:API et controllers'
icon: 'i-mdi:checkbox-marked-circle-plus-outline'
color: 'secondary'
article_id: '6-to-do-list-backend-todo'
draft: false
publishedAt: '2026-07-01'
---

#### 📋 Backend — Todo

Dans cet article, nous créons les deux modèles `Todo::Scope` et `Todo::Item`
avec leur couche complète : migrations, serializers JSON:API, services
et controllers.

> 💡 Commit correspondant :
> [`feat: todo — models, services, serializers, controllers`](https://forgejo.chartman-fr.ovh/tititoof/todo-backend){:target="_blank"}

---

#### 🏗️ Architecture en couches

<mermaid>
graph TD
  subgraph Controllers["🎮 Api::V1::Todo"]
    SC["ScopesController"]
    IC["ItemsController"]
  end
  subgraph Services["⚙️ Todo"]
    SCS["Scopes\nCreate / Update / Destroy"]
    ITS["Items\nCreate / Update / Destroy"]
  end
  subgraph Models["🗄️ Todo"]
    Scope["Todo::Scope\ntodo_scopes"]
    Item["Todo::Item\ntodo_items"]
    User["User\nusers"]
  end
  subgraph Serializers["📦 Serializers"]
    SS["ScopeSerializer"]
    IS["ItemSerializer"]
  end
  SC --> SCS
  IC --> ITS
  SCS --> Scope
  ITS --> Item
  Item --> User
  Item --> Scope
  SC --> SS
  IC --> IS
  classDef clusterStyle fill:#41dcce,stroke:#333,stroke-width:1.5px;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Controllers,Services,Models,Serializers clusterStyle;
  class SC,IC,SCS,ITS,Scope,Item,User,SS,IS containerStyle;
</mermaid>

> 💡 Les services ne sont **pas** namespacés sous `V1::` — seuls les
> controllers connaissent la version de l'API. Un service comme
> `Todo::Scopes::CreateService` est une brique métier réutilisable, quelle
> que soit la version d'API qui l'appelle un jour. C'est la convention posée
> dans le refactor de l'article précédent (`ApplicationService` +
> `ServiceResult`, voir skill `rails-service-conventions`).

---

#### 🏗️ Construction

---

##### 1. Générer les modèles

```bash
docker compose exec backend bundle exec rails generate model Todo::Scope
docker compose exec backend bundle exec rails generate model Todo::Item
```

Ces commandes créent les fichiers de migration et les modèles (ainsi que
des specs et factories vides que nous allons remplacer). Nous allons
modifier leur contenu dans les étapes suivantes avant de migrer.

---

##### 2. Créer `app/models/todo.rb` — le namespace

Ce fichier configure le préfixe de table pour tous les modèles du namespace
`Todo`. Sans lui, Rails chercherait des tables `scopes` et `items` au lieu
de `todo_scopes` et `todo_items`. Le générateur le crée automatiquement dès
le premier `rails generate model Todo::...` :

```ruby [app/models/todo.rb]
module Todo
  def self.table_name_prefix
    "todo_"
  end
end
```

---

##### 3. Mettre à jour les migrations

Remplacez le contenu des migrations générées :

```ruby [db/migrate/xxx_create_todo_scopes.rb]
class CreateTodoScopes < ActiveRecord::Migration[8.1]
  def change
    create_table :todo_scopes do |t|
      t.string :name,     null: false
      t.string :nickname, null: false
      t.timestamps
    end

    add_index :todo_scopes, :nickname, unique: true
  end
end
```

```ruby [db/migrate/xxx_create_todo_items.rb]
class CreateTodoItems < ActiveRecord::Migration[8.1]
  def change
    create_table :todo_items do |t|
      t.string  :name, null: false
      t.boolean :done, null: false, default: false
      t.references :user,  null: false, foreign_key: true
      t.references :scope, null: false, foreign_key: { to_table: :todo_scopes }
      t.timestamps
    end
  end
end
```

`t.references :scope` avec `to_table: :todo_scopes` crée la clé étrangère
vers la bonne table malgré le préfixe. Puis migrez :

```bash
docker compose exec backend bin/rails db:migrate
```

---

##### 4. Créer `app/models/todo/scope.rb`

```ruby [app/models/todo/scope.rb]
class Todo::Scope < ApplicationRecord
  has_many :items, class_name: "Todo::Item", dependent: :destroy

  validates :name,     presence: true, length: { in: 2..60 }
  validates :nickname, presence: true, uniqueness: { case_sensitive: false }, length: { in: 2..15 }
end
```

> ⚠️ `uniqueness: { case_sensitive: false }` et pas simplement
> `uniqueness: true`. Un nickname sert d'identifiant court et lisible —
> autoriser `"perso"` et `"Perso"` en même temps serait une source de bugs
> côté frontend (deux scopes visuellement identiques). C'est le même
> raisonnement que Devise applique par défaut à l'email de `User`.

---

##### 5. Créer `app/models/todo/item.rb`

```ruby [app/models/todo/item.rb]
class Todo::Item < ApplicationRecord
  belongs_to :user
  belongs_to :scope, class_name: "Todo::Scope"

  validates :name, presence: true, length: { in: 2..255 }
  validates :done, inclusion: { in: [ true, false ] }
end
```

> 💡 Rubocop (config `rubocop-rails-omakase` du projet) exige un espace à
> l'intérieur des littéraux de tableau — `[ true, false ]`, pas
> `[true, false]`. `bundle exec rubocop -A` corrige ça automatiquement si
> vous l'oubliez.

---

##### 6. Créer les serializers

> 💡 `jsonapi-serializer` est le fork communautaire maintenu de `fast_jsonapi`
> (créé par Netflix). L'API est identique, le gem est activement maintenu.

```bash
mkdir -p app/serializers/todo
```

```ruby [app/serializers/todo/scope_serializer.rb]
class Todo::ScopeSerializer
  include JSONAPI::Serializer

  attributes :name, :nickname, :created_at, :updated_at
end
```

```ruby [app/serializers/todo/item_serializer.rb]
class Todo::ItemSerializer
  include JSONAPI::Serializer

  attributes :name, :done, :created_at, :updated_at

  attribute :scope_id do |object|
    object.scope_id
  end

  belongs_to :scope, serializer: Todo::ScopeSerializer
end
```

La réponse JSON:API d'un item ressemble à :

```json
{
  "data": {
    "id": "1",
    "type": "todo_item",
    "attributes": {
      "name": "Ma tâche",
      "done": false,
      "scope_id": 2,
      "created_at": "2025-01-01T10:00:00Z"
    },
    "relationships": {
      "scope": { "data": { "id": "2", "type": "todo_scope" } }
    }
  }
}
```

---

##### 7. Créer les services Scopes

Comme pour l'authentification, chaque action métier est un `Service`
namespacé par ressource, hérite de `ApplicationService`, et renvoie un
`ServiceResult` via les helpers `success` / `failure` — jamais d'exception
pour un échec métier attendu (voir skill `rails-service-conventions`).

```bash
mkdir -p app/services/todo/scopes
```

```ruby [app/services/todo/scopes/create_service.rb]
module Todo
  module Scopes
    class CreateService < ApplicationService
      def initialize(params)
        @params = params
      end

      def call
        scope = Todo::Scope.new(@params)

        if scope.save
          success(scope)
        else
          failure(scope.errors.full_messages)
        end
      end
    end
  end
end
```

```ruby [app/services/todo/scopes/update_service.rb]
module Todo
  module Scopes
    class UpdateService < ApplicationService
      def initialize(scope, params)
        @scope  = scope
        @params = params
      end

      def call
        if @scope.update(@params)
          success(@scope)
        else
          failure(@scope.errors.full_messages)
        end
      end
    end
  end
end
```

```ruby [app/services/todo/scopes/destroy_service.rb]
module Todo
  module Scopes
    class DestroyService < ApplicationService
      def initialize(scope)
        @scope = scope
      end

      def call
        if @scope.destroy
          success(nil)
        else
          failure(@scope.errors.full_messages)
        end
      end
    end
  end
end
```

---

##### 8. Créer les services Items

```bash
mkdir -p app/services/todo/items
```

```ruby [app/services/todo/items/create_service.rb]
module Todo
  module Items
    class CreateService < ApplicationService
      def initialize(user, scope, params)
        @user   = user
        @scope  = scope
        @params = params
      end

      def call
        item = Todo::Item.new(@params.merge(user: @user, scope: @scope))

        if item.save
          success(item)
        else
          failure(item.errors.full_messages)
        end
      end
    end
  end
end
```

```ruby [app/services/todo/items/update_service.rb]
module Todo
  module Items
    class UpdateService < ApplicationService
      def initialize(item, scope, params)
        @item   = item
        @scope  = scope
        @params = params
      end

      def call
        if @item.update(@params.merge(scope: @scope))
          success(@item)
        else
          failure(@item.errors.full_messages)
        end
      end
    end
  end
end
```

```ruby [app/services/todo/items/destroy_service.rb]
module Todo
  module Items
    class DestroyService < ApplicationService
      def initialize(item)
        @item = item
      end

      def call
        if @item.destroy
          success(nil)
        else
          failure(@item.errors.full_messages)
        end
      end
    end
  end
end
```

---

##### 9. Créer les controllers

`ApplicationController#serializer_response` a été posé dans le refactor
de l'article précédent (`app/controllers/application_controller.rb`) : il
prend directement un `ServiceResult` et un serializer, plus un
`success_status:` optionnel — pas besoin d'y retoucher ici.

```bash
mkdir -p app/controllers/api/v1/todo
```

```ruby [app/controllers/api/v1/todo/scopes_controller.rb]
class Api::V1::Todo::ScopesController < ApplicationController
  before_action :authenticate_devise_api_token!
  before_action :set_scope, only: %i[update destroy]

  def index
    render json: Todo::ScopeSerializer.new(Todo::Scope.all).serializable_hash
  end

  def create
    result = Todo::Scopes::CreateService.call(scope_params)
    serializer_response(result, Todo::ScopeSerializer, success_status: :created)
  end

  def update
    result = Todo::Scopes::UpdateService.call(@scope, scope_params)
    serializer_response(result, Todo::ScopeSerializer)
  end

  def destroy
    result = Todo::Scopes::DestroyService.call(@scope)
    serializer_response(result, Todo::ScopeSerializer, success_status: :no_content)
  end

  private

  def set_scope
    @scope = Todo::Scope.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { errors: { base: ["not_found"] } }, status: :not_found
  end

  def scope_params
    params.require(:scope).permit(:name, :nickname)
  end
end
```

```ruby [app/controllers/api/v1/todo/items_controller.rb]
class Api::V1::Todo::ItemsController < ApplicationController
  before_action :authenticate_devise_api_token!
  before_action :set_item,  only: %i[update destroy]
  before_action :set_scope, only: %i[create update]

  def index
    render json: Todo::ItemSerializer.new(current_devise_api_user.todo_items).serializable_hash
  end

  def create
    result = Todo::Items::CreateService.call(current_devise_api_user, @scope, item_params)
    serializer_response(result, Todo::ItemSerializer, success_status: :created)
  end

  def update
    result = Todo::Items::UpdateService.call(@item, @scope, item_params)
    serializer_response(result, Todo::ItemSerializer)
  end

  def destroy
    result = Todo::Items::DestroyService.call(@item)
    serializer_response(result, Todo::ItemSerializer, success_status: :no_content)
  end

  private

  def set_item
    @item = current_devise_api_user.todo_items.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { errors: { base: ["not_found"] } }, status: :not_found
  end

  def set_scope
    @scope = Todo::Scope.find(item_params[:scope_id])
  rescue ActiveRecord::RecordNotFound
    render json: { errors: { base: ["scope_not_found"] } }, status: :not_found
  end

  def item_params
    params.require(:item).permit(:name, :done, :scope_id)
  end
end
```

> 💡 `index` reste une simple lecture sans effet de bord : pas de service,
> le controller interroge directement le modèle et sérialise — conforme à
> la règle de décision de `rails-service-conventions` ("une simple
> lecture/liste sans effet de bord reste dans le controller").
>
> `current_devise_api_user.todo_items` — devise-api injecte l'utilisateur
> courant via le token Bearer. Les items sont filtrés par utilisateur
> nativement, sans condition supplémentaire à écrire.

---

##### 10. Mettre à jour `config/routes.rb`

```ruby [config/routes.rb]
Rails.application.routes.draw do
  devise_for :users
  get "up", to: "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      namespace :todo do
        resources :scopes, only: %i[index create update destroy]
        resources :items,  only: %i[index create update destroy]
      end
    end
  end
end
```

> ⚠️ `only: %i[index create update destroy]`, pas `resources :scopes` tout
> court. Un `resources` sans restriction déclare aussi `show` (`GET /:id`)
> — or aucun des deux controllers n'implémente cette action. La route
> existerait sans handler et lèverait une `AbstractController::ActionNotFound`
> (erreur 500) au premier appel. Restreindre `resources` aux actions
> réellement implémentées évite ce piège.

Vérifiez les routes générées :

```bash
docker compose exec backend bin/rails routes | grep todo
# GET    /api/v1/todo/scopes         api/v1/todo/scopes#index
# POST   /api/v1/todo/scopes         api/v1/todo/scopes#create
# PATCH  /api/v1/todo/scopes/:id     api/v1/todo/scopes#update
# PUT    /api/v1/todo/scopes/:id     api/v1/todo/scopes#update
# DELETE /api/v1/todo/scopes/:id     api/v1/todo/scopes#destroy
# GET    /api/v1/todo/items          api/v1/todo/items#index
# POST   /api/v1/todo/items          api/v1/todo/items#create
# PATCH  /api/v1/todo/items/:id      api/v1/todo/items#update
# PUT    /api/v1/todo/items/:id      api/v1/todo/items#update
# DELETE /api/v1/todo/items/:id      api/v1/todo/items#destroy
```

---

#### 🧪 Tests

##### Mettre à jour `spec/rails_helper.rb`

Ajoutez le chargement automatique des helpers dans `spec/rails_helper.rb` :

```ruby [spec/rails_helper.rb]
# Ajouter après les requires existants
Dir[Rails.root.join("spec/support/**/*.rb")].each { |f| require f }
```

##### Créer `spec/support/auth_helpers.rb`

```bash
mkdir -p spec/support
```

```ruby [spec/support/auth_helpers.rb]
module AuthHelpers
  def sign_in_user(user)
    post sign_in_user_tokens_path, params: {
      email: user.email,
      password: "password123"
    }
    JSON.parse(response.body)["token"]
  end
end

RSpec.configure do |config|
  config.include AuthHelpers, type: :request
end
```

##### Factories

```bash
mkdir -p spec/factories
```

```ruby [spec/factories/todo_scopes.rb]
FactoryBot.define do
  factory :todo_scope, class: "Todo::Scope" do
    name     { Faker::Lorem.word.capitalize }
    nickname { Faker::Lorem.unique.word.downcase.first(10) }
  end
end
```

```ruby [spec/factories/todo_items.rb]
FactoryBot.define do
  factory :todo_item, class: "Todo::Item" do
    name  { Faker::Lorem.sentence(word_count: 3) }
    done  { false }
    association :user
    association :scope, factory: :todo_scope
  end
end
```

##### Tests des modèles

```bash
mkdir -p spec/models/todo
```

```ruby [spec/models/todo/scope_spec.rb]
require "rails_helper"

RSpec.describe Todo::Scope, type: :model do
  subject { build(:todo_scope) }

  describe "validations" do
    it { should validate_presence_of(:name) }
    it { should validate_presence_of(:nickname) }
    it { should validate_uniqueness_of(:nickname).case_insensitive }
    it { should validate_length_of(:name).is_at_least(2).is_at_most(60) }
    it { should validate_length_of(:nickname).is_at_least(2).is_at_most(15) }
  end

  describe "associations" do
    it { should have_many(:items).class_name("Todo::Item").dependent(:destroy) }
  end
end
```

```ruby [spec/models/todo/item_spec.rb]
require "rails_helper"

RSpec.describe Todo::Item, type: :model do
  subject { build(:todo_item) }

  describe "validations" do
    it { should validate_presence_of(:name) }
    it { should validate_length_of(:name).is_at_least(2).is_at_most(255) }
  end

  describe "associations" do
    it { should belong_to(:user) }
    it { should belong_to(:scope).class_name("Todo::Scope") }
  end
end
```

> ⚠️ Pas de `validate_inclusion_of(:done).in_array([true, false])`. La
> validation existe bien dans le modèle (`item.rb`), mais shoulda-matchers
> prévient lui-même qu'il est incapable de la tester correctement : une
> colonne booléenne PostgreSQL convertit automatiquement toute valeur
> assignée en `true`/`false`/`nil`, donc le matcher ne peut jamais observer
> un "vrai" rejet de valeur non-booléenne. Le garder produit un warning au
> lancement des tests sans apporter de couverture réelle — autant le retirer
> et laisser la validation du modèle faire son travail silencieusement.

##### Tests des services

Conformément à `rails-service-conventions`, chaque Service a son spec
dédié, qui teste le `ServiceResult` renvoyé (`success?` / `data` /
`errors`) plutôt que les détails d'implémentation.

```bash
mkdir -p spec/services/todo/scopes spec/services/todo/items
```

```ruby [spec/services/todo/scopes/create_service_spec.rb]
require "rails_helper"

RSpec.describe Todo::Scopes::CreateService do
  subject(:result) { described_class.call(params) }

  context "avec des paramètres valides" do
    let(:params) { { name: "Personnel", nickname: "perso" } }

    it "réussit" do
      expect(result).to be_success
    end

    it "crée le scope en base" do
      expect { result }.to change(Todo::Scope, :count).by(1)
    end

    it "retourne le scope créé dans data" do
      expect(result.data).to be_a(Todo::Scope)
      expect(result.data.nickname).to eq("perso")
    end
  end

  context "avec des paramètres invalides" do
    let(:params) { { name: "", nickname: "" } }

    it "échoue" do
      expect(result).to be_failure
    end

    it "ne crée pas de scope" do
      expect { result }.not_to change(Todo::Scope, :count)
    end

    it "retourne les erreurs de validation" do
      expect(result.errors).not_to be_empty
    end
  end
end
```

```ruby [spec/services/todo/scopes/update_service_spec.rb]
require "rails_helper"

RSpec.describe Todo::Scopes::UpdateService do
  subject(:result) { described_class.call(scope, params) }

  let(:scope) { create(:todo_scope) }

  context "avec des paramètres valides" do
    let(:params) { { name: "Nom mis à jour" } }

    it "réussit" do
      expect(result).to be_success
    end

    it "met à jour le scope" do
      expect { result }.to change { scope.reload.name }.to("Nom mis à jour")
    end
  end

  context "avec des paramètres invalides" do
    let(:params) { { name: "" } }

    it "échoue" do
      expect(result).to be_failure
    end

    it "retourne les erreurs de validation" do
      expect(result.errors).not_to be_empty
    end
  end
end
```

```ruby [spec/services/todo/scopes/destroy_service_spec.rb]
require "rails_helper"

RSpec.describe Todo::Scopes::DestroyService do
  subject(:result) { described_class.call(scope) }

  let!(:scope) { create(:todo_scope) }

  it "réussit" do
    expect(result).to be_success
  end

  it "supprime le scope" do
    expect { result }.to change(Todo::Scope, :count).by(-1)
  end
end
```

```ruby [spec/services/todo/items/create_service_spec.rb]
require "rails_helper"

RSpec.describe Todo::Items::CreateService do
  subject(:result) { described_class.call(user, scope, params) }

  let(:user)  { create(:user) }
  let(:scope) { create(:todo_scope) }

  context "avec des paramètres valides" do
    let(:params) { { name: "Ma tâche", done: false } }

    it "réussit" do
      expect(result).to be_success
    end

    it "crée l'item en base, rattaché à l'utilisateur et au scope" do
      expect { result }.to change(Todo::Item, :count).by(1)
      expect(result.data.user).to eq(user)
      expect(result.data.scope).to eq(scope)
    end
  end

  context "avec des paramètres invalides" do
    let(:params) { { name: "", done: false } }

    it "échoue" do
      expect(result).to be_failure
    end

    it "ne crée pas d'item" do
      expect { result }.not_to change(Todo::Item, :count)
    end
  end
end
```

```ruby [spec/services/todo/items/update_service_spec.rb]
require "rails_helper"

RSpec.describe Todo::Items::UpdateService do
  subject(:result) { described_class.call(item, scope, params) }

  let(:scope) { create(:todo_scope) }
  let(:item)  { create(:todo_item, scope: scope, done: false) }

  context "avec des paramètres valides" do
    let(:params) { { name: item.name, done: true } }

    it "réussit" do
      expect(result).to be_success
    end

    it "marque l'item comme terminé" do
      expect { result }.to change { item.reload.done }.to(true)
    end
  end

  context "avec des paramètres invalides" do
    let(:params) { { name: "" } }

    it "échoue" do
      expect(result).to be_failure
    end
  end
end
```

```ruby [spec/services/todo/items/destroy_service_spec.rb]
require "rails_helper"

RSpec.describe Todo::Items::DestroyService do
  subject(:result) { described_class.call(item) }

  let!(:item) { create(:todo_item) }

  it "réussit" do
    expect(result).to be_success
  end

  it "supprime l'item" do
    expect { result }.to change(Todo::Item, :count).by(-1)
  end
end
```

##### Tests des endpoints

```bash
mkdir -p spec/requests/api/v1/todo
```

```ruby [spec/requests/api/v1/todo/scopes_spec.rb]
require "rails_helper"

RSpec.describe "Api::V1::Todo::Scopes", type: :request do
  let(:user)         { create(:user) }
  let(:token)        { sign_in_user(user) }
  let(:auth_headers) { { "Authorization" => "Bearer #{token}" } }

  describe "GET /api/v1/todo/scopes" do
    before { create_list(:todo_scope, 3) }

    it "retourne tous les scopes" do
      get api_v1_todo_scopes_path, headers: auth_headers

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["data"].length).to eq(3)
    end

    it "retourne 401 sans token" do
      get api_v1_todo_scopes_path
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/v1/todo/scopes" do
    it "crée un scope" do
      expect {
        post api_v1_todo_scopes_path,
          params: { scope: { name: "Personnel", nickname: "perso" } },
          headers: auth_headers
      }.to change(Todo::Scope, :count).by(1)

      expect(response).to have_http_status(:created)
    end

    it "retourne une erreur si le nickname est déjà pris" do
      create(:todo_scope, nickname: "perso")

      post api_v1_todo_scopes_path,
        params: { scope: { name: "Personnel", nickname: "perso" } },
        headers: auth_headers

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PUT /api/v1/todo/scopes/:id" do
    let!(:scope) { create(:todo_scope) }

    it "met à jour le scope" do
      put api_v1_todo_scope_path(scope),
        params: { scope: { name: "Perso mis à jour", nickname: scope.nickname } },
        headers: auth_headers

      expect(response).to have_http_status(:ok)
      expect(scope.reload.name).to eq("Perso mis à jour")
    end
  end

  describe "DELETE /api/v1/todo/scopes/:id" do
    let!(:scope) { create(:todo_scope) }

    it "supprime le scope" do
      expect {
        delete api_v1_todo_scope_path(scope), headers: auth_headers
      }.to change(Todo::Scope, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end
```

```ruby [spec/requests/api/v1/todo/items_spec.rb]
require "rails_helper"

RSpec.describe "Api::V1::Todo::Items", type: :request do
  let(:user)         { create(:user) }
  let(:token)        { sign_in_user(user) }
  let(:auth_headers) { { "Authorization" => "Bearer #{token}" } }
  let!(:scope)       { create(:todo_scope) }

  describe "GET /api/v1/todo/items" do
    it "retourne uniquement les items de l'utilisateur connecté" do
      create_list(:todo_item, 3, user: user, scope: scope)
      create(:todo_item, user: create(:user), scope: scope)

      get api_v1_todo_items_path, headers: auth_headers

      expect(JSON.parse(response.body)["data"].length).to eq(3)
    end
  end

  describe "POST /api/v1/todo/items" do
    it "crée un item" do
      expect {
        post api_v1_todo_items_path,
          params: { item: { name: "Ma tâche", done: false, scope_id: scope.id } },
          headers: auth_headers
      }.to change(Todo::Item, :count).by(1)

      expect(response).to have_http_status(:created)
    end
  end

  describe "PUT /api/v1/todo/items/:id" do
    let!(:item) { create(:todo_item, user: user, scope: scope, done: false) }

    it "marque l'item comme done" do
      put api_v1_todo_item_path(item),
        params: { item: { name: item.name, done: true, scope_id: scope.id } },
        headers: auth_headers

      expect(item.reload.done).to be(true)
    end
  end

  describe "DELETE /api/v1/todo/items/:id" do
    let!(:item) { create(:todo_item, user: user, scope: scope) }

    it "supprime l'item" do
      expect {
        delete api_v1_todo_item_path(item), headers: auth_headers
      }.to change(Todo::Item, :count).by(-1)
    end
  end
end
```

##### Lancer les tests

```bash
docker compose exec backend bundle exec rspec
```

```
53 examples, 0 failures
```

---

#### 🔖 Commit

```bash
git add .
git commit -m "feat: todo — models, services, serializers, controllers"
git push origin main
```

---

#### ✅ Résumé du commit

::tool-table
| Fichier | Action | Rôle |
|---------|--------|------|
| `app/models/todo.rb` | ➕ Nouveau | Namespace + préfixe tables `todo_` |
| `app/models/todo/scope.rb` | ➕ Nouveau | Validations + associations |
| `app/models/todo/item.rb` | ➕ Nouveau | Validations + associations |
| `db/migrate/xxx_create_todo_scopes.rb` | ➕ Nouveau | Table `todo_scopes` |
| `db/migrate/xxx_create_todo_items.rb` | ➕ Nouveau | Table `todo_items` |
| `app/serializers/todo/scope_serializer.rb` | ➕ Nouveau | JSON:API scope |
| `app/serializers/todo/item_serializer.rb` | ➕ Nouveau | JSON:API item + scope_id |
| `app/services/todo/scopes/{create,update,destroy}_service.rb` | ➕ Nouveau | Logique métier scopes |
| `app/services/todo/items/{create,update,destroy}_service.rb` | ➕ Nouveau | Logique métier items |
| `app/controllers/api/v1/todo/scopes_controller.rb` | ➕ Nouveau | CRUD scopes |
| `app/controllers/api/v1/todo/items_controller.rb` | ➕ Nouveau | CRUD items (filtrés par user) |
| `config/routes.rb` | ✏️ Modifié | 8 endpoints REST todo |
| `spec/rails_helper.rb` | ✏️ Modifié | Auto-chargement de `spec/support` |
| `spec/support/auth_helpers.rb` | ➕ Nouveau | Helper `sign_in_user` pour les tests |
| `spec/factories/todo_{scopes,items}.rb` | ➕ Nouveau | Factories Faker |
| `spec/models/todo/{scope,item}_spec.rb` | ➕ Nouveau | Tests des validations |
| `spec/services/todo/scopes/*_spec.rb` | ➕ Nouveau | Tests des services scopes |
| `spec/services/todo/items/*_spec.rb` | ➕ Nouveau | Tests des services items |
| `spec/requests/api/v1/todo/{scopes,items}_spec.rb` | ➕ Nouveau | Tests des endpoints |
::

---

Dans le prochain article, nous connectons le frontend au backend :
server routes Nuxt qui proxient vers Rails, mise à jour du store et
flux complet de bout en bout.

[Article 7 — Connexion frontend-backend →](/blog/article/7-to-do-list-frontend-backend)

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
