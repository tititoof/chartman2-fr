---
title: 'To-do list App'
description: 'Initialisation'
icon: 'i-mdi:checkbox-marked-circle-plus-outline'
color: 'secondary'
article_id: '1-to-do-list-initialisation'
---

Hello,

Dans cette première série d'articles, nous allons construire une application **"To-do list"** ([wikipedia](https://en.wikipedia.org/wiki/Wikipedia:To-do_list){:target="_blank"})  avec [Nuxt](https://nuxt.com/){:target="_blank"} et [Ruby on Rails](https://rubyonrails.org/){:target="_blank"}.

L'application sera divisée en deux, la partie *frontend* avec le framework **Nuxt** (basé sur VueJS) et la partie *backend* avec de framework **Ruby on Rails** 

#### Frontend (UI)


Nous allons commencer la partie frontend (interface utilisateur) avec [**Nuxt**](/blog/article/1-nuxt-initialisation){:target="_blank"}.

Pour cela, j'ai créé un dépôt afin de commencer avec une configuration déjà effectuée.


##### Installation


* La première chose que nous allons faire et de créer un dépôt sur [GitHub](https://github.com/) ou autre [GitLab](https://about.gitlab.com/), nommons le 'todo-frontend', puis clonons le sur notre ordinateur.


```shell
mkdir ~/projects
cd ~/projects
git clone git@github.com:<username>/todo-frontend.git
```
 
* Clonons le dépôt `https://github.com/chartman2/nuxt-frontend-template` pour avoir la base de l'application. 
Vous pouvez aussi partir de zéro avec Nuxt en regardant la [documentation](https://nuxt.com/docs/getting-started/introduction)


```shell
cd ~/projects
git clone git@github.com:chartman2/nuxt-frontend-template.git
```

* Copions les fichiers et répertoires (sauf `.git`) dans notre projet 'todo-frontend'


```shell
rsync -r --exclude '.git' ~/projects/nuxt-frontend-template ~/projects/todo-frontend
```

* On se place dans l'application **todo-frontend**.


```shell
cd ~/projects/todo-frontend
```

* Copions le fichier `.env.example` vers `.env` et personnalisons le.


```shell
cp .env.example .env
```



```yml
UID=1000
GID=1000
USMAK=0644
APP_NAME=todo-frontend
APP_URL=todo-frontend.traefik.me
APP_WS_URL=todo-frontend-wss.traefik.me
APP_VSCODE_NAME=vscode-todo-frontend
APP_VSCODE_URL=vscode-todo-frontend.traefik.me
APP_NETWORK=projects_local_dev
APP_STORAGE_NAME="todo-frontend"
API_BASE_URL="https://todo-backend.traefik.me"
CRYPT_SECRET_KEY="This_is_a_secret_key"
DEVTOOLS_ENABLE=true
HMR_PORT=443
```


J'utilise Traefik pour avoir des urls plus sympa (`https://todo-frontend.traefik.me` au lieu de `http://localhost:3000`), voilà la [configuration](/blog/article/3-docker-traefik-introduction)


* Contruction de l'application


Pour la construction de l'application et l'édition des fichiers, nous utiliserons [Docker](/blog/article/1-docker-description){:target="_blank"} et [Docker compose](/blog/article/2-docker-compose-description){:target="_blank"}


```shell
docker compose build 
```

##### Démarrage de l'application et de VS Code dans le navigateur


Démarrons les containers (frontend & VS Code)


```shell
docker compose up
```


Si l'on veut en mode daemon (sans les logs des containers)


```shell
docker compose up -d
```


Accédons aux urls défini dans le fichiers `.env`


```shell
https://<APP_URL>
https://<APP_VSCODE_URL>
```

Nous avons maintenant un environnement fonctionnel pour développer notre application.


##### Ajout du nom de notre application


Editez le fichier `i18n.config.ts` et modifier la variable global `name` pour modifier le nom de l'application



```yml [i18n.config.ts]
fr: {
      global: {
          name: "Todo application",
          ...
      },
      ...
}
```


Ainsi que le fichier `pages/index.vue` afin de l'afficher



```ts [pages/index.vue]
<v-row class="d-flex align-self-start py-12">
  <v-container>
    <page-title :title="$t('global.name')" icon="i-mdi:format-list-checks" />
  </v-container>
</v-row>
```

Dans le [prochain article](/blog/article/2-to-do-list-taches), nous allons poursuivre notre aventure en ajoutant les tâches à notre application. 

Nous verrons comment créer des éléments de liste de tâches, gérer leur état (en cours, terminé, etc.)