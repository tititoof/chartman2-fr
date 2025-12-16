---
title: "Docker - Forgejo"
description: "Gestion des dépôts Git avec Docker"
icon: "i-mdi:docker"
article_id: "6-docker-forgejo-init"
---
 
Voici [Forgejo](https://forgejo.org/), un logiciel de forge logicielle libre qui se base sur Gitea, mais avec une touche d’indépendance, de transparence et une gouvernance participative par sa communauté. Son but ? Créer un espace convivial où vous pouvez héberger votre code, gérer vos dépôts Git, suivre vos issues, centraliser votre documentation et automatiser vos workflows CI/CD. Et tout cela, bien sûr, sous une licence libre, sans dépendre d’une entreprise privée.

#### 📌 Forgejo ![Forgejo](/img/Forgejo_logo.svg){ width=30px }
Vous cherchez une solution Git self‑hosted : sans cloud, sans abonnement, tout sous votre contrôle ?  
[Forgejo](https://forgejo.org){:target="_blank"} est le fork de Gitea qui combine performance, simplicité et modernité.  
En un seul conteneur Docker, vous obtenez :

- **Serveur Git complet** : gestion de dépôts, pull‑requests, branchements…
- **Gestion de projets** : issues, milestones, projets Kanban, wiki intégré
- **Intégration continue** : webhooks vers Jenkins, GitHub Actions, GitLab CI…
- **Sécurité et audit** : authentification LDAP/OAuth2, chiffrement TLS, logs centralisés
- **Interface web conviviale** : recherche, visualisation, éditeur Markdown, visualisation de graphe
- **Extensibilité** : plugins, API REST, intégrations tierces

En résumé, Forgejo vous donne toute la puissance d’une plateforme Git cloud sans quitter votre homelab.

#### ⚙️ Exemple
Voici un exemple de `docker‑compose.yml` qui lance Forgejo avec PostgreSQL derrière Traefik :

```yml [docker-compose.yml]
services:
  forgejo:
    image: "ghcr.io/forgejo/forgejo:latest"
    container_name: forgejo
    restart: unless-stopped
    environment:
      - USER_UID=1000
      - USER_GID=1000
      - DB_TYPE=postgres
      - DB_HOST=db:5432
      - DB_NAME=forgejo
      - DB_USER=forgejo
      - DB_PASS=forgejo_password
      - DB_SSL_MODE=disable
      - FOG_URL=${FORGEJO_URL}
      - FOG_PORT=3000
      - FOG_ROOT_URL=${FORGEJO_URL}
    ports:
      - "${FORGEJO_PORT:-3000}:3000"
    labels:
      # Traefik integration
      - "traefik.enable=true"
      - "traefik.http.routers.forgejo.rule=Host(`${FORGEJO_HOST}`)"
      - "traefik.http.routers.forgejo.entrypoints=http"
      - "traefik.http.routers.forgejo.middlewares=forgejo-redirect"
      - "traefik.http.middlewares.forgejo-redirect.redirectscheme.scheme=https"
      - "traefik.http.routers.forgejo-secure.entrypoints=https"
      - "traefik.http.routers.forgejo-secure.rule=Host(`${FORGEJO_HOST}`)"
      - "traefik.http.routers.forgejo-secure.tls=true"
      - "traefik.http.services.forgejo.loadbalancer.server.port=3000"
    networks:
      - local_dev
    depends_on:
      - db

  db:
    image: "postgres:15-alpine"
    container_name: forgejo-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=forgejo
      - POSTGRES_USER=forgejo
      - POSTGRES_PASSWORD=forgejo_password
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - local_dev

networks:
  local_dev:
    driver: bridge

volumes:
  db_data:
```