---
title: 'To-do list App'
description: 'Backend - Développement'
icon: 'i-mdi:checkbox-marked-circle-plus-outline'
color: 'secondary'
article_id: '6-to-do-list-backend-development'
---

#### 👤 Mise en place des utilisateurs et de la connexion api


Pour gérer les utilisateurs, nous allons utiliser Devise (https://github.com/heartcombo/devise#getting-started)

Et devise-api pour la gestion Api (https://github.com/nejdetkadir/devise-api)

##### 📥 Installation

Entrons dans le container Docker et installons Devise

Toutes les commmandes se feront dans le container

```bash [~/projects/todo-backend]
docker comppose exec backend bash
rails generate devise:install
```

Editons la configuration de développement pour transférer les mails à [mailpit](/blog/article/5-docker-mailpit-init)


```rb [config/environments/development.rb]
config.action_mailer.default_url_options = { host: 'mailpit.chartman2-fr.ovh', port: 1025 }
```

##### 🧩 Génération du model `User`

On va d'abord créer les migrations (les requêtes permettant de mettre à jour la base de données, comme la création des tables), puis les exécuter.

```bash [~/projects/todo-backend]
rails generate devise user
```

Génère un modèle User avec les champs nécessaires (email, mot de passe, etc.).

Crée des migrations pour la table users.

Ajoute des routes et fichiers liés à l’authentification (controllers, vues si demandé).


```bash [~/projects/todo-backend]
rails db:migrate
```

```bash [~/projects/todo-backend]
rails generate devise_api:install
```

Configure Devise pour fonctionner avec des tokens API ou JSON.

Génère les fichiers de configuration nécessaires pour gérer les authentifications via API.

Prépare les routes et controllers pour l’authentification API.

```bash [~/projects/todo-backend]
rails db:migrate
```


Pour appliquer toutes les modifications, modifions le modèle `User`

```rb [app/models/user.rb]
class User < ApplicationRecord
  devise :database_authenticatable, 
         :registerable, 
         :recoverable,
         :rememberable,
         :validatable,
         :api
end
```

##### 🗺️ Routes

Affichons les routes pour voir un peu ce qu'il y a

```sh [~/projects/todo-backend]
rails routes
```
 
| Prefix   | Verb    | URI Pattern     | Controller#Action                          |
|----------|---------|-----------------|-------------------------------------------|
| revoke_user_tokens| POST| /users/tokens/revoke| devise/api/tokens#revoke |
| refresh_user_tokens| POST| /users/tokens/refresh| devise/api/tokens#refresh |
| sign_up_user_tokens| POST| /users/tokens/sign_up| devise/api/tokens#sign_up |
| sign_in_user_tokens| POST| /users/tokens/sign_in| devise/api/tokens#sign_in |
| info_user_tokens| GET| /users/tokens/info| devise/api/tokens#info |

##### ⚙️ Configuration


Devise crée un fichier de configuration pour nous aider, éditons le et modifions ce que nous voulons.

```rb [config/initializers/devise.rb]
# config/initializers/devise.rb
Devise.setup do |config|
  config.api.configure do |api|
    # Access Token
    api.access_token.expires_in = 1.hour
    api.access_token.expires_in_infinite = ->(_resource_owner) { false }
    api.access_token.generator = ->(_resource_owner) { Devise.friendly_token(60) }


    # Refresh Token
    api.refresh_token.enabled = true
    api.refresh_token.expires_in = 1.week
    api.refresh_token.generator = ->(_resource_owner) { Devise.friendly_token(60) }
    api.refresh_token.expires_in_infinite = ->(_resource_owner) { false }

    # Sign up
    api.sign_up.enabled = true
    api.sign_up.extra_fields = []

    # Authorization
    api.authorization.key = 'Authorization'
    api.authorization.scheme = 'Bearer'
    api.authorization.location = :both # :header or :params or :both
    api.authorization.params_key = 'access_token'


    # Base classes
    api.base_token_model = 'Devise::Api::Token'
    api.base_controller = '::DeviseController'


    # After successful callbacks
    api.after_successful_sign_in = ->(_resource_owner, _token, _request) { }
    api.after_successful_sign_up = ->(_resource_owner, _token, _request) { }
    api.after_successful_refresh = ->(_resource_owner, _token, _request) { }
    api.after_successful_revoke = ->(_resource_owner, _token, _request) { }


    # Before callbacks
    api.before_sign_in = ->(_params, _request, _resource_class) { }
    api.before_sign_up = ->(_params, _request, _resource_class) { }
    api.before_refresh = ->(_params, _request, _resource_class) { }
    api.before_revoke = ->(_params, _request, _resource_class) { }
  end
end
```


##### 🧩 Génération de la table scope

Créons le modèle et de la migration de base de données afin de gérer nos scopes

```sh [~/projects/todo-backend]
rails generate model Todo::Scope
rails generate migration CreateTodoScopes
```

Créer le fichier pour préfixer les tables pour le namespace `Todo::`

```ruby [app/models/todo.rb]
# frozen_string_literal: true

# This module sets a table name prefix for the User model. The prefix "users_" will be added to all database
# tables associated with the User model, allowing for better organization and separation of concerns
# in multi-tenant applications or when multiple models are stored in the same database.
module Todo
  def self.table_name_prefix
    'todo_'
  end
end
```


Modifions le modèle scope pour rajouter les validations.

```ruby [app/models/todo/scope.rb]
# == Schema Information
#
# Table name: todo_scopes
#
#  id         :bigint           not null, primary key
#  name       :string
#  nickname   :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
module Todo
  class Scope < ApplicationRecord
    # ----------------------------------
    # --- Validations ---
    # ----------------------------------
    # Name
    validates :name, presence: { message: :required }
    validates :name,
              length: { in: 4..60, too_long: :tooLong,
                        too_short: :tooShort }
    # Nickname
    validates :nickname, presence: { message: :required }
    validates :nickname,
              length: { in: 1..15, too_long: :tooLong,
                        too_short: :tooShort }
  end
end
```

Modifions le fichier de migration pour ajouter les champs `name` et `nickname`


```ruby [db/migrate/xxx_scopes.rb]
class Scopes < ActiveRecord::Migration[7.0]
  def change
    create_table :todo_scopes do |t|
      t.string :name
      t.string :nickname
 
      t.timestamps
    end
  end
end
```

De la même manière,créons le modèle et la migation pour les items

```sh [~/projects/todo-backend]
rails generate model Todo::Item
rails generate migration CreateTodoItems
```

```ruby [db/migrate/xxx_items.rb]
class Items < ActiveRecord::Migration[7.0]
  def change
    create_table :todo_items do |t|
      t.string :name
      t.references :user, foreign_key: true # Lien vers l'utilisateur qui a créé ou mis à jour l'item
      t.boolean :done
      t.references :scope, on_delete: :cascade

      t.timestamps
    end
  end
end
```


```ruby [app/models/todo/item.rb]
# == Schema Information
#
# Table name: todo_items
#
#  id         :bigint           not null, primary key
#  done       :boolean
#  name       :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  scope_id   :bigint
#  user_id    :bigint
#
# Indexes
#
#  index_todo_items_on_scope_id  (scope_id)
#  index_todo_items_on_user_id   (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#
module Todo
  class Item < ApplicationRecord
    # ----------------------------------
    # --- Relations ---
    # ----------------------------------
    belongs_to :user
    belongs_to :scope

    # ----------------------------------
    # --- Validations ---
    # ----------------------------------
    # Name
    validates :name, presence: { message: :required }
    validates :name,
              length: { in: 4..60, too_long: :tooLong,
                        too_short: :tooShort }
    # Done
    validates :done, inclusion: { in: [ true, false ] }
  end
end
```


Maintenant que nous avons nos modèles mis en place,
Mettons les contrôleurs et services pour les gérer.

###### 🧩 Création du contrôleur

```ruby [app/controllers/api/v1/todo/scopes_controller.rb]
module Api
  module V1
    module Todo
      class ScopesController < ApplicationController
        # force current_user to be authenticate
        before_action :authenticate_devise_api_token!
        # get scope only for update and destroy actions
        before_action :set_scope, only: %i[update destroy]
        
        def index
          @resource = { success: true, payload: ::Todo::Scope.all }

          serializer_response(::Todo::ScopeSerializer)
        end

        def create
          @resource = ::V1::Todo::Scopes::CreateService.call(scope_params)

          serializer_response(::Todo::ScopeSerializer)
        end

        def update
          @resource = ::V1::Todo::Scopes::UpdateService.call(@scope, scope_params)

          serializer_response(::Todo::ScopeSerializer)
        end

        def destroy
          @resource = ::V1::Todo::Scopes::DestroyService.call(@scope)

          serializer_response(::Todo::ScopeSerializer)
        end

        def set_scope
          @scope = ::Todo::Scope.find(params[:scope_id])
        rescue ActiveRecord::RecordNotFound => _e
          { success: false, errors: 'model.notFound' }
        end

        def scope_params
          params.required(:scope).permit(:id, :name, :nickname)
        end
      end
    end
  end
end
```


###### 🧩 Gestion des services 

- 🛠️ **Petit fichier pour la gestion des services**

```ruby [app/services/application_callable.rb]
# frozen_string_literal: true

# The ApplicationCallable class provides a generic interface for calling objects with parameters.
# It defines a `call` method that can be overridden in subclasses to perform the necessary logic.
# The `self.call(...)` method is provided as a convenience method for instantiating the object
# and calling the `call` method in a single step.
# This pattern allows for easy reuse of code across different parts of the application.
class ApplicationCallable
  def self.call(...)
    new(...).call
  end
end
```

- 🛠️ **Créer le service de création**

```ruby [app/services/v1/todo/scopes/create_service.rb]
# frozen_string_literal: true

module V1
  module Todo
    module Scopes
      class CreateService < ApplicationCallable
        attr_reader :properties

        def initialize(properties)
          @properties = properties
        end

        def call
          scope = ::Todo::Scope.new(@properties)

          scope.save!

          { success: true, payload: scope }
        rescue ActiveRecord::RecordInvalid => e
          { success: false, errors: e.record.errors.as_json, status: :unprocessable_entity }
        end
      end
    end
  end
end
```

- 🛠️ **Service de mise à jour**

```ruby [app/services/v1/todo/scopes/update_service.rb]
module V1
  module Todo
    module Scopes
      class UpdateService < ApplicationCallable
        attr_reader :scope, :properties
  
        def initialize(scope, properties)
          @scope = scope
          @properties = properties
        end
  
        def call
          ActiveRecord::Base.transaction do
            @scope.update!(properties)
            { success: true, payload: scope }
          rescue ActiveRecord::RecordNotFound => e
            { success: false, errors: e.record.errors.as_json, status: :unprocessable_entity }
          rescue ActiveRecord::StatementInvalid => e
            { success: false, errors: e.record.errors.as_json, status: :unprocessable_entity }
          end
        end
      end
    end
  end
end
```

- 🛠️ **Service de destruction**

```ruby [app/services/v1/todo/scopes/destroy_service.rb]
module V1
  module Todo
    module Scopes
      class DestroyService < ApplicationCallable
        attr_reader :scope

        def initialize(scope)
          @scope = scope
        end

        def call
          @scope.destroy!
            
          { success: true, payload: nil }
        rescue ActiveRecord::RecordNotFound => e
          { success: false, errors: { message: 'Scope not found' }, status: :unprocessable_entity }
        end
      end
    end
  end
end
```


- 🛠️ **Contrôleur des items**

```ruby [app/controllers/api/v1/todo/items_controller.rb]
module Api
  module V1
    module Todo
      class ItemsController < ApplicationController
        # force current_user to be authenticate
        before_action :authenticate_devise_api_token!
        # get item only for update and destroy actions
        before_action :set_item, only: %i[update destroy]
        # get scope only for create and update actions
        before_action :set_scope, only: %i[create update]
        
        def index
          @resource = { success: true, payload: current_devise_api_user.todo_items }

          serializer_response(::Todo::ItemSerializer)
        end

        def create
          @resource = ::V1::Todo::Items::CreateService.call(current_devise_api_user, @scope, item_params)

          serializer_response(::Todo::ItemSerializer)
        end

        def update
          @resource = ::V1::Todo::Items::UpdateService.call(current_devise_api_user, @item, @scope, item_params)

          serializer_response(::Todo::ItemSerializer)
        end

        def destroy
          @resource = ::V1::Todo::Items::DestroyService.call(@item)

          serializer_response(::Todo::ItemSerializer)
        end

        def set_item
          @item = ::Todo::Item.find(params[:item_id])
        rescue ActiveRecord::RecordNotFound => _e
          { success: false, errors: 'model.notFound' }
        end

        def set_scope
          @scope = ::Todo::Scope.find(item_params[:scope_id])
        rescue ActiveRecord::RecordNotFound => _e
          { success: false, errors: 'model.notFound' }
        end

        def item_params
          params.required(:item).permit(:id, :name, :done, :scope_id)
        end
      end
    end
  end
end
```

- 🛠️ **Les services associés**


```ruby [app/services/v1/todo/items/create_service.rb]
# frozen_string_literal: true

module V1
  module Todo
    module Items
      # Create a Todo item with the specified properties.
      #
      # user       - The owner of the item
      # properties - A Hash of attributes to set on the new item. The allowed keys are:
      #             - name        - The name of the item
      #             - done        - Whether the item is completed or not
      #
      # Returns a hash containing a success flag and the newly created Todo::Item object if the record was saved successfully,
      # or an error hash with validation errors if creation failed.
      class CreateService < ApplicationCallable
        attr_reader :user, :scope, :properties

        def initialize(user, scope, properties)
          @user       = user
          @scope      = scope
          @properties = properties
        end

        def call
          item = ::Todo::Item.create! @properties.merge({ user: @user, scope: @scope })

          { success: true, payload: item }
        rescue ActiveRecord::RecordInvalid => e
          { success: false, errors: e.record.errors.as_json, status: :unprocessable_entity }
        end
      end
    end
  end
end
```

```ruby [app/services/v1/todo/items/update_service.rb]
# frozen_string_literal: true

module V1
  module Todo
    module Items
      class UpdateService < ApplicationCallable
        attr_reader :user, :item, :scope, :properties

        def initialize(user, item, scope, properties)
          @user       = user
          @item       = item
          @scope      = scope
          @properties = properties
        end

        def call
          @item.update! @properties.merge({ user: @user, scope: @scope })

          { success: true, payload: @item }
        rescue ActiveRecord::RecordInvalid => e
          { success: false, errors: e.record.errors.as_json, status: :unprocessable_entity }
        end
      end
    end
  end
end
```


```ruby [app/services/v1/todo/items/destroy_service.rb]
# frozen_string_literal: true

module V1
  module Todo
    module Items
      class DestroyService < ApplicationCallable
        attr_reader :item

        def initialize(item)
          @item = item
        end

        def call
          @item.destroy!
            
          { success: true, payload: nil }
        rescue ActiveRecord::RecordNotFound => e
          { success: false, errors: { message: 'Item not found' }, status: :unprocessable_entity }
        end
      end
    end
  end
end
```


Ajoutons les routes afin de pouvoir accéder aux actions de nos contrôleurs

```ruby [config/routes.rb]
Rails.application.routes.draw do
  devise_for :users
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"

  namespace :api do
    namespace :v1 do
      namespace :todo do
        # Items
        get     'items',          to: 'items#index'
        post    'items',          to: 'items#create'
        put     'items/:item_id', to: 'items#update'
        delete  'items/:item_id', to: 'items#destroy'

        # Scopes
        get     'scopes',           to: 'scopes#index'
        post    'scopes',           to: 'scopes#create'
        put     'scopes/:scope_id', to: 'scopes#update'
        delete  'scopes/:scope_id', to: 'scopes#destroy'
      end
    end
  end
end
```

Nous avons mis en place notre gestion des données,
Il nous reste plus qu'à connecter notre [frontend à notre backend](/blog/article/7-to-do-list-frontend-backend).