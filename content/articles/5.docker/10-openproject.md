---
title: "Docker – OpenProject"
description: "Installer et déployer OpenProject avec Docker"
icon: "i-mdi:docker"
article_id: "10-docker-openproject-init"
---
#### 📌 OpenProject ![OpenProject](/img/openproject.jpg){ width=30px }
Vous avez besoin d’une plateforme **project‑management** riche (issues, milestones, Gantt, wiki, chat…) mais vous ne voulez pas de SaaS ?  
[OpenProject](https://www.openproject.org){:target="_blank"} est la solution open‑source qui vous donne :

- **Gestion de projets** : tâches, épics, kanban, road‑map, calendrier Gantt
- **Collaboration** : wiki, discussions, pièces jointes, chat intégré (via Chatwoot ou Mattermost)
- **Contrôle d’accès** : rôles, permissions, groupes, LDAP/OAuth2
- **Intégrations** : Git (Forgejo, GitLab), CI/CD (Jenkins, GitHub Actions), issue‑trackers, e‑mail
- **API REST** : automatisation, synchronisation avec d’autres outils
- **Interface moderne** : responsive, Vue.js, notifications en temps réel
- **Self‑hosted** : vous gardez le contrôle total de vos données

En quelques lignes Docker, OpenProject devient votre « tableau de bord » central, prêt à s’enchaîner avec Jenkins, SonarQube, Forgejo ou Coolify.

#### ⚙️ Exemple
Voici un `docker‑compose.yml` qui lance OpenProject derrière Traefik — idéal pour un homelab ou un pipeline CI/CD intégré :

```yml [docker-compose.yml]
services:
  openproject:
    image: "openproject/community:latest"
    container_name: openproject
    restart: unless-stopped
    environment:
      - DB_ADAPTER=postgresql
      - DB_HOST=db:5432
      - DB_NAME=openproject
      - DB_USER=openproject
      - DB_PASSWORD=openproject_password
      - RAILS_MASTER_KEY=${RAILS_MASTER_KEY}
      - SECRET_KEY_BASE=${SECRET_KEY_BASE}
      - MAILER_FROM=admin@${OPENPROJECT_HOST}
      - ADMIN_EMAIL=admin@example.com
      - ADMIN_PASSWORD=${OPENPROJECT_ADMIN_PASSWORD}
      - HOSTNAME=${OPENPROJECT_HOST}
      - SSL_ENABLED=true
    ports:
      - "${OPENPROJECT_PORT:-8080}:8080"
    volumes:
      - openproject_data:/var/openproject
      - openproject_logs:/var/log/openproject
    labels:
      # Traefik integration
      - "traefik.enable=true"
      - "traefik.http.routers.openproject.rule=Host(`${OPENPROJECT_HOST}`)"
      - "traefik.http.routers.openproject.entrypoints=http"
      - "traefik.http.middlewares.openproject-redirect.redirectscheme.scheme=https"
      - "traefik.http.routers.openproject.middlewares=openproject-redirect"
      - "traefik.http.routers.openproject-secure.entrypoints=https"
      - "traefik.http.routers.openproject-secure.rule=Host(`${OPENPROJECT_HOST}`)"
      - "traefik.http.routers.openproject-secure.tls=true"
      - "traefik.http.services.openproject.loadbalancer.server.port=8080"
    networks:
      - local_dev
    depends_on:
      - db

  db:
    image: "postgres:15-alpine"
    container_name: openproject-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=openproject
      - POSTGRES_USER=openproject
      - POSTGRES_PASSWORD=openproject_password
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - local_dev

  traefik:
    image: "traefik:v2.10"
    container_name: traefik
    command: |
      --api.insecure=true
      --providers.docker=true
      --providers.docker.exposedbydefault=false
      --entryPoints.http.address=:80
      --entryPoints.https.address=:443
      --certificatesResolvers.letsencrypt.acme.email=${LETSENCRYPT_EMAIL}
      --certificatesResolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
      --certificatesResolvers.letsencrypt.acme.tlsChallenge=true
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - letsencrypt:/letsencrypt
    networks:
      - local_dev

networks:
  local_dev:
    driver: bridge

volumes:
  openproject_data:
  openproject_logs:
  db_data:
  letsencrypt:
```
```bash
OPENPROJECT_HOST=openproject.example.com
OPENPROJECT_PORT=8080
OPENPROJECT_ADMIN_PASSWORD=super_secret
RAILS_MASTER_KEY=$(openssl rand -hex 32)
SECRET_KEY_BASE=$(openssl rand -hex 32)
LETSENCRYPT_EMAIL=admin@example.com
```

Une fois le conteneur démarré, l’interface d’OpenProject est accessible sur https://openproject.example.com.
Configurez vos projets, créez des webhooks depuis Forgejo/Jenkins pour la mise à jour automatique des tâches, et profitez d’un outil complet de gestion de projets, entièrement sous votre contrôle.
Bonne collaboration !