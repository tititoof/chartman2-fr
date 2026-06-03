---
title: "Docker - Traefik"
description: "Utilisation de Traefik avec Docker"
icon: "i-mdi:docker"
article_id: "3-docker-traefik-introduction"
---

#### 📌 Qu’est-ce que Traefik ? ![Traefik](img/traefik.webp){ width=30px }

C’est comme un gentil veilleur qui se place entre tes invités (les utilisateurs) et tes applications. Lorsqu’une personne tape une URL, Traefik reçoit la demande et sait exactement vers quel conteneur l’envoyer, pour que tout fonctionne sans souci.

Et en plus, c’est open-source, gratuit et animé par une grande communauté super active qui l’améliore tous les jours, donc tu peux l’utiliser en toute liberté.

#### 🧰 Ce qu’il fait concrètement :

- **Routage intelligent** : Il analyze les requêtes (nom de domaine, chemin, protocole…) pour les rediriger automatiquement vers le bon service, comme un GPS pour tes applications.

- **Gestion HTTP et HTTPS** : Il s’occupe de fournir et de renouveler tout seul les certificats SSL/TLS (via Let's Encrypt), pour que ton site soit sécurisé sans que tu aies à lever le petit doigt.

- **Équilibrage de charge** : Si tu as plusieurs instances du même service, Traefik répartit le trafic uniformément entre elles, pour que tout soit fluide.

- **Mise en réserve (circuit breaker)** : Si une appli a un souci ou crashe, Traefik évite que cela ne bloque tout le système, en coupant la connexion pour un temps ou jusqu’à ce que tout soit réparé.

- **Surveillance** : Il te propose un tableau de bord sympa pour suivre en temps réel l’état de tes services et du trafic, histoire de garder un œil dessus sans stress.

#### 🚀 Et pourquoi c’est top avec Docker ?

- Il détecte automatiquement tes conteneurs grâce à des balises (labels comme traefik.http.routers...), donc vous n'avez pas besoin d’écrire des configs compliquées.
- Gérer HTTPS devient un jeu d’enfant.
- Vous pouvez faire tourner plusieurs sites sur la même machine et la même IP, facilement.


#### 🏗️ Architecture générale

Traefik joue le rôle de **point d'entrée unique** : toutes les requêtes arrivent sur lui, il consulte ses règles de routage (définies dans les labels Docker) et transmet au bon conteneur.

<mermaid>
graph TD
  Navigateur["🌍<br/>https://app.localhost"] --> Traefik["🚦<br/>Traefik<br/>Container"]
  subgraph DH["🐳 Docker Host"]
    subgraph Net["🌐 projects_local_dev"]
      Traefik --> A["📦<br/> App A<br/>Container"]
      Traefik --> B["📦<br/> App B<br/>Container"]
      A --- LabelsA["🏷️ Labels Traefik<br/>
      traefik.enable=true<br/>
      traefik.http.routers.appa.rule=Host(`app.localhost`)<br/>
      traefik.http.services.appa.loadbalancer.server.port=3000"]
      B --- LabelsB["🏷️ Labels Traefik<br/>
      traefik.enable=true<br/>
      traefik.http.routers.appb.rule=Host(`api.localhost`)<br/>
      traefik.http.services.appb.loadbalancer.server.port=8000"]
    end
  end
  Traefik --> TLS["🔐 TLS / Let's Encrypt"]
  Traefik --> Dashboard["👁️ Dashboard Traefik"]
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  class Navigateur,DH cluster;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Traefik,A,B containerStyle;
  classDef volumeStyle fill:#ddf,stroke:#00d,stroke-width:2px;
  class LabelsA,LabelsB,TLS,Dashboard volumeStyle;
</mermaid>

#### ⚙️ Exemple

Pour intégrer Traefik à notre projet [Todo-list](/blog/article/1-to-do-list-initialisation){:target="_blank"}, voici comment nous pouvons le mettre en place :

##### 🗂️ Répertoires

Créez les dossiers nécessaires pour stocker les certificats et les données Certbot :

```sh
mkdir -p .docker/ovh/etc/letsencrypt \
         .docker/ovh/certs \
         .docker/ovh/certbot/data
```

##### 🌐 Création du réseau interne dans Docker

Ce réseau permet aux conteneurs de communiquer entre eux sans exposer leurs ports sur l'hôte :

```sh
docker network create \
  --driver bridge \
  --name projects_local_dev
```

##### 🔑 Création des token api OVH

La génération du token est détaillée dans l'article de [Rémi Flandrois](https://remiflandrois.fr/2020/03/26/creation-certificat-wildcard-ovh/){:target="_blank"}.

Sauvegardez le fichier obtenu dans `.docker/ovh/.ovh-api` — il sera monté dans le conteneur `certbot/dns-ovh` pour générer les certificats wildcard.

> 💡 Le challenge DNS-01 utilisé ici permet de générer un certificat wildcard (`*.domain.tld`) sans exposer votre serveur sur internet, contrairement au challenge HTTP-01 classique.

##### 📝 Configuration

Adaptez le fichier `docker-compose.yml` à votre domaine :

```yml [./docker-compose.yml]
services:
  traefik:
    restart: unless-stopped
    image: traefik:v3.6.7
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    labels:
      - "traefik.http.services.traefik.loadbalancer.server.port=8080"
    volumes:
      - ./.docker/traefik/traefik.yml:/etc/traefik/traefik.yml
      - ./.docker/traefik/tls.yml:/etc/traefik/tls.yml
      - /var/run/docker.sock:/var/run/docker.sock
      - ./.docker/ovh/etc/letsencrypt/archive/<domain.tld>:/etc/ssl/traefik
    command:
      - "--global.sendAnonymousUsage"
      - "--log.level=INFO"
      - "--api.insecure=true"
      - "--api=true"
      - "--api.dashboard=true"
      - "--providers.docker.endpoint=unix:///var/run/docker.sock"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
      - "--entrypoints.web.http.redirections.entryPoint.scheme=https"
      - "--entrypoints.web.http.redirections.entrypoint.permanent=true"
    networks:
      - local_dev

  certbot-init:
    container_name: certbot-init
    image: certbot/dns-ovh:latest
    command: certonly --dns-ovh --dns-ovh-credentials /var/www/certbot/.ovh-api --non-interactive --agree-tos --email <email> --cert-name <domain.tld> -d <domain.tld> -d *.<domain.tld>
    volumes:
      - ./.docker/ovh/.ovh-api:/var/www/certbot/.ovh-api
      - ./.docker/ovh/etc/letsencrypt:/etc/letsencrypt
      - ./.docker/ovh/certs:/etc/letsencrypt/live
      - ./.docker/ovh/certbot/data:/var/www/certbot

networks:
  local_dev:
    name: projects_local_dev
    driver: bridge
    external: true
```

Créez ensuite les deux fichiers de configuration Traefik — l'un pour les certificats, l'autre pour les entrypoints :


```yml [~/Projects/.docker/traefik/tls.yml]
tls:
  stores:
    default:
      defaultCertificate:
        certFile: /etc/ssl/traefik/cert.pem
        keyFile: /etc/ssl/traefik/privkey.pem
  certificates:
    - certFile: /etc/ssl/traefik/cert.pem
      keyFile: /etc/ssl/traefik/privkey.pem
```

```yml [~/Projects/.docker/traefik/traefik.yml]
logLevel: INFO

api:
  insecure: true
  dashboard: true

entryPoints:
  http:
    address: ":80"
  https:
    address: ":443"
  wss:
    address: ":24678"

providers:
  file:
    filename: /etc/traefik/tls.yml
  docker:
    endpoint: unix:///var/run/docker.sock
    watch: true
    exposedByDefault: true
    defaultRule: 'HostRegexp(`{{ index .Labels "com.docker.compose.service"}}.<domain.tld>`,`{{ index .Labels "com.docker.compose.service"}}-{dashed-ip:.*}.<domain.tld>`)'
```

Executez le service `certbot-init` la première fois pour récupérer les certificats - sans oublier de remplacer *<domaine.tld>* par votre domaine 😊

```sh
docker compose run --rm certbot-init
```

Il ne reste plus qu'à démarrer les services

```sh
docker compose up -d
```

Et nous avons un traefik avec nos certificats ! 👍️

#### ✅ Conclusion

Traefik est bien plus qu'un simple reverse proxy : c'est la porte d'entrée de toute notre infrastructure Docker. En lisant les labels de chaque conteneur, il se reconfigure automatiquement à chaque démarrage — plus besoin de toucher à la config quand vous ajoutez un nouveau service.

Avec les certificats wildcard OVH en place, tous vos sous-domaines sont sécurisés en HTTPS sans aucune manipulation supplémentaire.

Dans le prochain article, nous allons mettre Traefik à l'épreuve en déployant [Postgresql](/blog/article/4-docker-postgresql-init) derrière lui — notre premier vrai service de la plateforme CI/CD.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::