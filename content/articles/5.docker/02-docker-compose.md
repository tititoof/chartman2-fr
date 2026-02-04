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
  subgraph DC[Docker Compose]
    compose["CLI"]
  end
  subgraph DE[Docker Engine]
    engine(["démon"])
  end
  subgraph IM[Images]
    direction TB
    imageA["Image A"]
    imageB["Image B"]
  end
  subgraph CNT[Containers]
    direction TB
    cA[<b>Container 1</b><br/> service A]
    cB[<b>Container 2</b><br/> service B]
  end
  subgraph NET[Networks]
    direction LR
    net1[<b>Network 1</b>]
    net2[<b>Network 2</b>]
  end
  subgraph VOL[Volumes]
    volA[<b>Volume A</b>]
    volB[<b>Volume B</b>]
  end
  compose -->|build| engine
  compose -->|up| engine
  compose -->|down| engine
  engine -->|build| IM
  engine -->|up| imageA
  engine -->|up| imageB
  engine -->|create| NET
  engine -->|mount| VOL
  imageA -->|up| cA
  imageB -->|up| cB
  cA -->|connect| net2
  cB -->|connect| net1
  cA -->|connect| volA
  cB -->|connect| volB
  engine -->|down| imageA
  engine -->|down| imageB
  imageA -->|down| cA
  imageB -->|down| cB
  cA -->|disconnect| net1
  cB -->|disconnect| net2
  cA -->|unmount| volA
  cB -->|unmount| volB
  class DC,DE,REG,IM,CNT,NET,VOL cluster;
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  classDef composeStyle fill:#fdd,stroke:#d00,stroke-width:2px;
  class compose composeStyle;
  classDef engineStyle fill:#dff,stroke:#00d,stroke-width:2px;
  class engine engineStyle;
  classDef registryStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class registry registryStyle;
  classDef imageStyle fill:#dfd,stroke:#0d0,stroke-width:2px;
  class image imageStyle;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class cA,cB,cC containerStyle;
  classDef networkStyle fill:#fdd,stroke:#d00,stroke-width:2px;
  class net1,net2 networkStyle;
  classDef volumeStyle fill:#ddf,stroke:#00d,stroke-width:2px;
  class volA,volB,volC volumeStyle;
  linkStyle 0,3 stroke:blue;
  linkStyle 1,4,5,6,7,8,9,10,11,12,13 stroke:green;
  linkStyle 2,14,15,16,17,18,19,20,21 stroke:red;
</mermaid>


#### ⚙️ Structure d’un docker-compose.yml

On va prendre un cas simple, un site [Wordpress](https://wordpress.com/fr/){:target="_blank"} avec sa base de données (MySQL)


```yml [./docker-compose.yml]
services:
  db:
    image: mysql:5.7
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stop
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
    restart: unless-stop
    environment:
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: wordpress
      WORDPRESS_DB_NAME: wordpress
volumes:
  db_data: {}
```

#### 🧩 Schéma

Voici le schéma d'intéraction (simplifié) correspondant au fichier docker-compose ci-dessus.

<mermaid>
flowchart LR
  subgraph DC[Docker Compose]
    compose["CLI"]
  end
  subgraph DE[Docker Engine]
    engine(["démon"])
  end
  subgraph CNT[Containers]
    direction TB
    wordpress[wordpress]
    db[db]
  end
  subgraph VOL[Volumes]
    db_data["<b>db_data</b>"]
  end
  compose -->|up| engine
  compose -->|down| engine
  engine -->|up| db
  engine -->|down| db
  engine -->|up| wordpress
  engine -->|down| wordpress
  engine -->|mount| db_data
  engine -->|unmount| db_data
  db -->|connect| db_data
  db -->|disconnect| db_data
  wordpress -->|depends on| db
  wordpress -->|connect| db
  wordpress -->|disconnect| db
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  class DC,DE,REG,IM,CNT,VOL cluster;
  classDef composeStyle fill:#fdd,stroke:#d00,stroke-width:2px;
  class compose composeStyle;
  classDef engineStyle fill:#dff,stroke:#00d,stroke-width:2px;
  class engine engineStyle;
  classDef registryStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class registry registryStyle;
  classDef imageStyle fill:#dfd,stroke:#0d0,stroke-width:2px;
  class mysqlImg,wpImg imageStyle;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class db,wordpress containerStyle;
  classDef volumeStyle fill:#ddf,stroke:#00d,stroke-width:2px;
  class db_data volumeStyle;
  linkStyle 0,2,4,6,8,11 stroke:green;
  linkStyle 1,3,5,7,9,12 stroke:red;
</mermaid>

Explorons les différents services décris dans le fichier docker-compose.yml

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
  restart: unless-stop
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
  restart: unless-stop
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
- WordPress est accessible sur votre navigateur via [http://localhost:8000](http://localhost:8000){:target="_blank"}.
- Les deux services communiquent via le réseau interne Docker, sans besoin de configurations complexes d’IP.  
- Même si vous supprimez ou redémarrez les conteneurs, vos données restent sauvegardées dans le volume.

C’est une façon simple et efficace de faire fonctionner un WordPress localement avec sa base de données, prête à l’emploi !