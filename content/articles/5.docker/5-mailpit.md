---
title: 'Docker - Mailpit'
description: 'Initialisation de Mailpit avec Docker'
icon: 'i-mdi:docker'
article_id: '5-docker-mailpit-init'
---

**Mailpit : le outil de test email moderne et sécurisé**

Vous êtes développeur et vous cherchez un outil pour tester vos emails sans vous soucier des détails techniques ? Mailpit est la solution idéale ! Cet outil de test email est conçu pour être rapide, léger en mémoire et indépendant de tout framework spécifique.

**Les fonctionnalités clés**

* **SMTP serveur :** Mailpit agit comme un serveur SMTP, permettant aux développeurs de tester leurs emails sans avoir à configurer leur propre serveur.
* **Interface web moderne :** l'outil fournit une interface web moderne pour visualiser et tester les emails capturés.
* **API pour tests automatisés :** Mailpit inclut une API pour les tests d'intégration automatisés, permettant aux développeurs de vérifier facilement leur code.

**docker-compose.yml**

```yml
services:
  mailpit:
    image: 'axllent/mailpit:latest'
    container_name: mailpit
    restart: unless-stopped
    ports:
      - '${FORWARD_MAILPIT_PORT:-1025}:1025'
      - '${FORWARD_MAILPIT_UI_PORT:-8025}:8025'
    labels:
      # Ajout dans traefik
      - "traefik.enable=true"
      # HTTP
      - "traefik.http.routers.mailpit.rule=Host(`mailpit.traefik.me`)"
      - "traefik.http.routers.mailpit.entrypoints=http"

      # HTTPS
      - "traefik.http.routers.mailpit-secure.service=mailpit-secure"
      - "traefik.http.routers.mailpit-secure.rule=Host(`mailpit.traefik.me`)"
      - "traefik.http.routers.mailpit-secure.entrypoints=https"
      - "traefik.http.routers.mailpit-secure.tls=true"

      # Port interne
      - "traefik.http.services.mailpit-secure.loadbalancer.server.port=8025"
    networks:
      local_dev:
        aliases:
          - mailpit.traefik.me
```