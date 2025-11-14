---
title: "Docker - Traefik"
description: "Utilisation de Traefik avec Docker"
icon: "i-mdi:docker"
article_id: "3-docker-traefik-introduction"
---

#### 📌 Qu’est-ce que Traefik ? ![Traefik](/img/traefik.webp){height=40px}

C’est comme un gentil veilleur qui se place entre tes invités (les utilisateurs) et tes applications. Lorsqu’une personne tape une URL, Traefik reçoit la demande et sait exactement vers quel conteneur l’envoyer, pour que tout fonctionne sans souci.

Et en plus, c’est open-source — c’est-à-dire gratuit et animé par une grande communauté super active qui l’améliore tous les jours, donc tu peux l’utiliser en toute liberté.

#### 🧰 Ce qu’il fait concrètement :

- **Routage intelligent** : Il analyze les requêtes (nom de domaine, chemin, protocole…) pour les rediriger automatiquement vers le bon service, comme un GPS pour tes applications.

- **Gestion HTTP et HTTPS** : Il s’occupe de fournir et de renouveler tout seul les certificats SSL/TLS (via Let's Encrypt), pour que ton site soit sécurisé sans que tu aies à lever le petit doigt.

- **Équilibrage de charge** : Si tu as plusieurs instances du même service, Traefik répartit le trafic uniformément entre elles, pour que tout soit fluide.

- **Mise en réserve (circuit breaker)** : Si une appli a un souci ou crashe, Traefik évite que cela ne bloque tout le système, en coupant la connexion pour un temps ou jusqu’à ce que tout soit réparé.

- **Surveillance** : Il te propose un tableau de bord sympa pour suivre en temps réel l’état de tes services et du trafic, histoire de garder un œil dessus sans stress.

#### 🚀 Et pourquoi c’est top avec Docker ?

- Il détecte automatiquement tes conteneurs grâce à des balises (labels comme traefik.http.routers...), donc tu n’as pas besoin d’écrire des configs compliquées.
- Gérer HTTPS devient un jeu d’enfant.
- Tu peux faire tourner plusieurs sites sur la même machine et la même IP, facilement.

#### ⚙️ Exemple

Pour intégrer Traefik à notre projet [Todo-list](/blog/article/1-to-do-list-initialisation), voici comment nous pouvons le mettre en place :

##### 🗂️ Répertoires

```sh
mkdir -p .docker/ovh/etc/letsencrypt \
         .docker/ovh/certs \
         .docker/ovh/certbot/data
```

##### 🌐 Création du réseau interne dans Docker

On crée un réseau interne pour que les containers puissent discuter entre eux

```sh
docker network create \
  --driver bridge \
  --name projects_local_dev
```

##### 🔑 Création des token api OVH

Tout est dans l'article de [Rémi Flandrois](https://remiflandrois.fr/2020/03/26/creation-certificat-wildcard-ovh/), la partie de configuration du Token API OVH.
IL suffit de sauvegarder le fichier dans ./docker/ovh/.ovh-api

##### 📝 Configuration

```yml [./docker-compose.yml]
services:
  traefik:
    restart: unless-stopped
    image: traefik:v3.2.1
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
    container_name: certbot
    image: certbot/dns-ovh:latest
    command: certonly --dns-ovh --dns-ovh-credentials /var/www/certbot/.ovh-api --non-interactive --agree-tos --email <email> --cert-name <domain.tld> -d <domain.tld> -d *.<domain.tld>
    profiles:
      - init
    volumes:
      - ./.docker/ovh/.ovh-api:/var/www/certbot/.ovh-api
      - ./.docker/ovh/etc/letsencrypt:/etc/letsencrypt
      - ./.docker/ovh/certs:/etc/letsencrypt/live
      - ./.docker/ovh/certbot/data:/var/www/certbot

  certbot:
    container_name: certbot
    image: certbot/dns-ovh:latest
    command: renew --dns-ovh --dns-ovh-credentials /var/www/certbot/.ovh-api --non-interactive --agree-tos --email <email> --cert-name <domain.tld> -d <domain.tld> -d *.<domain.tld>
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

---

On execute le service `certbot-init` la première fois pour récupérer les certificats

```sh
docker compose run -rm certbot-init
```

Il ne reste plus qu'à démarrer les services

```sh
docker compose up -d
```

Et nous avons un traefik avec nos certificats ! 👍️
