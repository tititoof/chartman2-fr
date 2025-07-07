---
title: 'Docker - Traefik'
description: 'Introduction à Traefik avec Docker'
icon: 'i-mdi:docker'
article_id: '3-docker-traefik-introduction'
---

Traefik est un reverse proxy open-source qui facilite la gestion des trafics HTTP et HTTPS vers vos applications Docker.

Il a la particularité de diriger les requêtes vers les bons conteneurs Docker, tout en offrant des fonctionnalités pratiques comme l'équilibrage de charge, la mise en réserve, le SSL/TLS, et même la surveillance.

Restez à l'affût, cet article sera enrichi au fur et à mesure.

Pour intégrer Traefik à notre projet [Todo-list](/blog/article/1-to-do-list-initialisation), voici comment nous pouvons le mettre en place :

#### Architecture

Créons les répertoires nécessaires

```sh
mkdir -p ~/Projects/.docker/traefik/certs
```

#### Configuration

Initialisons les services Docker pour *Traefik*

```yml [~/Projects/docker-compose.yml]
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
      - ./.docker/traefik/certs:/etc/ssl/traefik
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

  reverse-proxy-https-helper:
    image: alpine
    command: sh -c "cd /etc/ssl/traefik
      && wget traefik.me/cert.pem -O cert.pem
      && wget traefik.me/privkey.pem -O privkey.pem"
    volumes:
      - ./.docker/traefik/certs:/etc/ssl/traefik
    networks:
      - local_dev

networks:
  local_dev:
    name: projects_local_dev
    driver: bridge
    external: true
```

Les fichiers de configuration

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
    defaultRule: "HostRegexp(`{{ index .Labels \"com.docker.compose.service\"}}.traefik.me`,`{{ index .Labels \"com.docker.compose.service\"}}-{dashed-ip:.*}.traefik.me`)"
```

Il ne reste plus qu'à démarrer les services

```sh
docker compose up -d
```