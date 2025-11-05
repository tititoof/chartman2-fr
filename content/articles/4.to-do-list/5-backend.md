---
title: 'To-do list App'
description: 'Backend'
icon: 'i-mdi:checkbox-marked-circle-plus-outline'
color: 'secondary'
article_id: '5-to-do-list-backend'
---


#### 🗄️ Backend

Maintenant, nous allons créer la partie *backend* pour gérer les données et surtout les garder en base de données.

nous utilisons le framework Ruby on Rails.

On va faire la même chose que dans le premier article mais pour gérer les données (persistance).


##### 📥 Installation

* Créer un dépôt sur Github ou autre (Gitlab, ...) `todo-backend` et le clôner dans le répertoire `~/projects`.


```shell [~/]
cd ~/projects
git clone git@github.com:<username>/todo-backend.git
```
 
* Clôner le dépôt `https://github.com/chartman2/rails-backend-template` pour avoir la base du backend.


```shell [~/projects]
git clone git@github.com:chartman2/rails-backend-template.git
```

* Copier les fichiers et répertoires (sauf le `.git`) dans votre dépot 'todo-frontend'


```shell [~/projects]
rsync -r --exclude '.git' rails-backend-template/* todo-backend
```

* Accéder à l'application **todo-backend**.


```shell [~/projects]
cd todo-backend
```

* Créer une base de données PostgreSQL pour les données. [ici](/blog/article/4-docker-postgresql-init) pour une mise en place avec Docker

* Editer le fichier de credential


```shell [~/projects/todo-backend]
docker compose exec backend EDITOR=vim rails credentials:edit
```

N'hésitez pas à adapter selon votre configuration


```yml [~/projects/todo-backend]
APP_URL: todo-backend.chartman2-fr.ovh
DB_POSTGRESDB_DATABASE: todo_backend_development
DB_POSTGRESDB_HOST: postgresql
DB_POSTGRESDB_PORT: 5432
DB_POSTGRESDB_USER: utilisateur
DB_POSTGRESDB_PASSWORD: mon_mot_de_passe
```


#### 📥 Installation de l'application

Pour plus d'information sur [Docker](/blog/article/1-docker-description){:target="_blank"}
et [Docker compose](/blog/article/2-docker-compose-description){:target="_blank"}


```shell [~/projects/todo-backend]
docker compose build 
```

##### 🚀 Lancement de l'application et de VS Code

De la même façon que pour le frontend, on lance l'application avec docker compose

```shell [~/projects/todo-backend]
docker compose up -d
```


Accédons aux urls défini dans le fichiers `.env`

```shell
https://<APP_URL>
https://<APP_VSCODE_URL>
```

Nous avons le squelette de notre backend.

Allons dans le monde Ruby pour développer nos [utilisateurs, scopes, et tasks](/blog/article/6-to-do-list-backend-development).