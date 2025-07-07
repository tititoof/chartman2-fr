---
title: 'Docker compose'
description: 'Description'
icon: 'i-mdi:docker'
article_id: '2-docker-compose-description'
---

Docker Compose est un excellent outil open-source inclus avec Docker qui facilite la définition et l'exécution d'applications multi-conteneurs sur une seule machine. Grâce à lui, les développeurs peuvent décrire leur application dans un simple fichier YAML, en regroupant tous les services interconnectés, et lancer l'ensemble de l'application en une seule commande.

Voici quelques-unes des raisons pour lesquelles Docker Compose est si pratique :

- **Configuration simplifiée** : Avec Docker Compose, vous pouvez tout définir dans un seul fichier YAML, rendant la configuration plus simple et vous permettant de réutiliser facilement ces configurations d'un environnement à l'autre.
  
- **Isolation des services** : Chaque service de votre application fonctionne dans son propre conteneur, garantissant une isolation totale entre les composants et évitant les problèmes de dépendances.

- **Gestion simplifiée** : Des commandes simples vous permettent de démarrer, arrêter et gérer facilement l'ensemble de votre application. Vous gagnez ainsi du temps et augmentez votre productivité.

- **Gestion des dépendances** : Docker Compose vous aide à spécifier comment les différents services interagissent, en assurant que tout démarre dans le bon ordre et que chaque service a accès à ses ressources nécessaires.

- **Un écosystème riche** : Vous profitez d'un large éventail d'outils, de bibliothèques et de services tiers pour déployer facilement des applications multi-conteneurs dans divers environnements.

Pour résumer, Docker Compose est l'outil parfait pour simplifier la configuration et la gestion de vos applications multi-conteneurs. Il vous permet de définir chaque service dans un fichier YAML clair, de gérer des dépendances, et de lancer votre application d'un simple clic.

Le fichier docker-compose.yml est votre configuration pour orchestrer toutes ces merveilles. Voici un petit aperçu de sa structure :

```yml
version: "3.9"

services:
  frontend:
    build: 
      context: ./
      dockerfile: Dockerfile.nuxt
    command:  sh -c "pnpm run dev"
    working_dir: '/app'
    user: node
    tty: true
    volumes:
      - './:/app'
    environment:
      - PUID="${UID}"
      - PGID="${GID}"
      - UMASK="${USMAK}"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${APP_NAME}.rule=Host(`${APP_URL}`)"
      - "traefik.http.routers.${APP_NAME}.entrypoints=http"
      - "traefik.http.routers.${APP_NAME}-secure.service=${APP_NAME}-secure"
      - "traefik.http.routers.${APP_NAME}-secure.rule=Host(`${APP_URL}`)"
      - "traefik.http.routers.${APP_NAME}-secure.entrypoints=https"
      - "traefik.http.routers.${APP_NAME}-secure.tls=true"
      - "traefik.http.routers.${APP_NAME}-wss.service=${APP_NAME}-wss"
      - "traefik.http.routers.${APP_NAME}-wss.rule=Host(`${APP_WS_URL}`)"
      - "traefik.http.routers.${APP_NAME}-wss.entrypoints=https"
      - "traefik.http.routers.${APP_NAME}-wss.tls=true"
      - "traefik.http.middlewares.${APP_NAME}-redirect.redirectscheme.scheme=https"
      - "traefik.http.middlewares.${APP_NAME}-redirect.redirectscheme.permanent=true"
      - "traefik.http.routers.${APP_NAME}.middlewares=${APP_NAME}-redirect"
      - "traefik.http.services.${APP_NAME}-secure.loadbalancer.server.port=3000"
      - "traefik.http.services.${APP_NAME}-wss.loadbalancer.server.port=24678"
    expose:
      - 3000
      - 24678
    networks:
      - app-network

  vscode:
    container_name: vscode-${APP_NAME}
    build: 
      context: ./
      dockerfile: Dockerfile.vscode
    depends_on:
      - frontend
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - "$HOME/.local:/home/coder/.local"
      - "$HOME/.config:/home/coder/.config"
      - "$PWD:/home/coder/project"
    environment:
      - TZ=Europe/Paris
      - DOCKER_USER=${USER}
      - USER_PASSWORD=1234
    user: ${UID_GID}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${APP_VSCODE_NAME}.rule=Host(`${APP_VSCODE_URL}`)"
      - "traefik.http.routers.${APP_VSCODE_NAME}.entrypoints=http"
      - "traefik.http.routers.${APP_VSCODE_NAME}-secure.service=${APP_VSCODE
```