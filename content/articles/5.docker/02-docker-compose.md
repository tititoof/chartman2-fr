---
title: 'Docker compose'
description: 'Introduction à Docker compose'
icon: 'i-mdi:docker'
article_id: '2-docker-compose-description'
---

#### 📌 Docker Compose : la façon la plus simple d'orchestrer vos conteneurs


Vous cherchez à gérer facilement plusieurs conteneurs pour votre application ? Docker Compose est fait pour vous ! Cet outil vous permet de définir et de lancer toute votre stack en une seule commande.


Docker Compose est un excellent outil inclus avec Docker qui facilite la définition et l'exécution d'applications multi-conteneurs sur une seule machine.


Grâce à lui, les développeurs peuvent décrire leur application dans un simple fichier YAML, en regroupant tous les services interconnectés, et lancer l'ensemble de l'application en une seule commande.


Avec un fichier simple, appelé *docker-compose.yml*, vous composez toutes vos dépendances, réseaux et volumes. 


#### 🚀 Pourquoi adopter Docker Compose ?


Voici quelques avantages qui vont vous convaincre :  


- **Configuration unique et claire**

Un seul fichier YAML pour décrire tous vos services, réseaux et volumes. Facile à partager entre collègues, utiliser dans vos pipelines CI/CD ou même en production.  


- **Isolation des services**

Chaque composant fonctionne dans son propre conteneur, évitant ainsi les conflits de dépendances (par exemple, différentes versions de PHP, MySQL ou Redis) et assurant une stabilité optimale.  


- **Démarrage dans le bon ordre**

Grâce à la directive *depends_on*, vos services se lancent dans le bon ordre, et avec les health‑checks, vous êtes sûr qu’ils sont prêts à recevoir du trafic.  


- **Gestion ultra simple**

Les commandes comme *docker compose up*, *down*, *ps*, *logs* ou *exec* sont intuitives. En quelques secondes, vous avez tout sous contrôle.  


- **Résilience et persistance**

Les volumes montés sur votre machine permettent de conserver vos données (bases, fichiers téléchargés…) même si vous supprimez un conteneur.  


- **Un écosystème complet**

Docker Compose s’intègre facilement avec Docker Swarm, Kubernetes (via Kompose) ou dans vos pipelines CI/CD pour des tests d’intégration fiables et répétables.  

<mermaid>
flowchart LR
  subgraph DockerCompose
    compose["docker‑compose CLI"]
  end
  subgraph Docker Engine
    demon["Docker Engine (démon)"]
  end
  subgraph Registry
    reg["Registry (Hub / Private)"]
  end
  subgraph Images
    img["Images (layered tarballs)"]
  end
  subgraph Containers
    c1["Container 1 - service A"]
    c2["Container 2 - service B"]
    c3["Container 3 - service C"]
  end
  subgraph Networks
    net["Network 1"]
    net2["Network 2"]
  end
  subgraph Volumes
    vol1["Volume 1 - service A"]
    vol2["Volume 2 - service B"]
    vol3["Volume 3 - service C"]
  end
  compose -->|build| demon
  compose -->|up| demon
  compose -->|down| demon
  reg -->|download images| demon
  img -->|push| reg
  demon -->|build| img
  demon -->|create| c1
  demon -->|create| c2
  img -->|launch service| c1
  img -->|launch service| c2
  compose -->|creates| net
  compose -->|mounts| vol1
  c1 -->|connects| net2
  c2 -->|connects| net2
  c1 -->|mounts| vol1
  c2 -->|mounts| vol1
</mermaid>


#### ⚙️ Structure d’un docker-compose.yml

```yml [./docker-compose.yml]
services:
  db:
    image: mysql:5.7
    volumes:
      - db_data:/var/lib/mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: somewordpress
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: wordpress

  wordpress:
    depends_on:
      - db
    image: wordpress:latest
    ports:
      - "8000:80"
    restart: always
    environment:
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: wordpress
      WORDPRESS_DB_NAME: wordpress
volumes:
  db_data: {}
```

##### 🛢️ Service db (la base de données)


```yaml [./docker-compose.yml]
db:
  image: mysql:5.7
```

On utilise l’image officielle de MySQL version 5.7, disponible sur [Docker Hub](https://hub.docker.com/). Ce conteneur servira de base de données pour notre site.

```yaml [./docker-compose.yml]
  volumes:
    - db_data:/var/lib/mysql
```

Le volume appelé **db_data** est connecté dans le conteneur à l’endroit `/var/lib/mysql`.  


Ainsi, toutes vos données restent en sécurité, même si vous supprimez ou redémarrez le conteneur.


```yaml [./docker-compose.yml]
  restart: always
```

Le conteneur se relancera automatiquement s’il s’arrête tout seul, sauf si vous le stoppez manuellement.

```yaml [./docker-compose.yml]
  environment:
    MYSQL_ROOT_PASSWORD: somewordpress
    MYSQL_DATABASE: wordpress
    MYSQL_USER: wordpress
    MYSQL_PASSWORD: wordpress
```

Ici, on défini quelques variables d’environnement essentielles :  

- **MYSQL_ROOT_PASSWORD**

Mot de passe pour l’utilisateur root.

- **MYSQL_DATABASE**

Nom de la base qu’on créer lors du lancement.

- **MYSQL_USER / MYSQL_PASSWORD** 

Identifiants d’un utilisateur supplémentaire ayant accès à la base.


##### 📰 Service WordPress

```yaml [./docker-compose.yml]
wordpress:
  depends_on:
    - db
```

Ce paramètre indique que WordPress doit démarrer après la base de données, pour s’assurer que MySQL est bien en route. 
Cependant, ça ne garantit pas que la base est totalement prête à accepter des connexions.

```yaml [./docker-compose.yml]
  image: wordpress:latest
```

On utilise la dernière version officielle de WordPress, pour avoir toutes les nouveautés.

```yaml [./docker-compose.yml]
  ports:
    - "8000:80"
```

Le port 80 (le port standard de WordPress) dans le conteneur est mappé sur le port 8000 de votre ordinateur. 

on peut accéder à votre site WordPress via [http://localhost:8000](http://localhost:8000).

```yaml [./docker-compose.yml]
  restart: always
```

Idem, WordPress se relancera automatiquement si jamais il s’arrête.

```yaml [./docker-compose.yml]
  environment:
    WORDPRESS_DB_HOST: db:3306
    WORDPRESS_DB_USER: wordpress
    WORDPRESS_DB_PASSWORD: wordpress
    WORDPRESS_DB_NAME: wordpress
```

On configure WordPress pour qu’il se connecte à la base de données.  
- **WORDPRESS_DB_HOST** 

Nom du service (db) et le port MySQL (3306).

- Les autres paramètres correspondent aux identifiants que l’on a définis dans la section de la base.


##### 🗂️ Définition du volume pour la base de données

```yaml [./docker-compose.yml]
volumes:
  db_data: {}
```

Ce volume nommé **db_data** est utilisé pour stocker de façon durable toutes vos données MySQL. La syntaxe `{}` indique qu’il est créé avec la configuration par défaut, sans réglages particuliers.

##### 📋 Résumé 

Ce fichier `docker-compose.yml` met en place un environnement WordPress complet :  
- La base de données MySQL est persistante grâce à un volume dédié.  
- WordPress est accessible sur votre navigateur via [http://localhost:8000](http://localhost:8000).  
- Les deux services communiquent via le réseau interne Docker, sans besoin de configurations complexes d’IP.  
- Même si vous supprimez ou redémarrez les conteneurs, vos données restent sauvegardées dans le volume.

C’est une façon simple et efficace de faire fonctionner un WordPress localement avec sa base de données, prête à l’emploi !