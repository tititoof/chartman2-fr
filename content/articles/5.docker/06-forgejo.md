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

Voici un `docker‑compose.yml` avec Forgejo derrière Traefik, accessible avec une belle url *forgejo.domaine.tld* 😉

```yml [docker-compose.yml]
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
      - devops

  forgejo:
    image: codeberg.org/forgejo/forgejo:13
    restart: unless-stopped
    environment:
      - USER_UID=${UID}
      - USER_GID=${GID}
      - FORGEJO__database__DB_TYPE=postgres
      - FORGEJO__database__HOST=${URL_POSTGRESQL}:5432
      - FORGEJO__database__NAME=${DB_DATABASE_FORGEJO}
      - FORGEJO__database__USER=${DB_USERNAME}
      - FORGEJO__database__PASSWD=${DB_PASSWORD}
    volumes:
      - ${PWD}/.docker/forgejo:/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    ports:
      - "222:22"
      - "3000:3000"
    labels:
      # Ajout dans traefik
      - traefik.enable=true
      # HTTP
      - traefik.http.routers.forgejo.rule=Host(`${URL_FORGEJO}`)
      - traefik.http.routers.forgejo.entrypoints=http

      # HTTPS
      - traefik.http.routers.forgejo-secure.service=forgejo-secure
      - traefik.http.routers.forgejo-secure.rule=Host(`${URL_FORGEJO}`)
      - traefik.http.routers.forgejo-secure.entrypoints=https
      - traefik.http.routers.forgejo-secure.tls=true

      # Port interne
      - traefik.http.services.forgejo-secure.loadbalancer.server.port=3000
    networks:
      homelab:
        aliases:
          - ${URL_FORGEJO}
    profiles:
      - devops

  postgresql:
    image: postgres:18
    user: "${UID}:${GID}"
    restart: unless-stopped
    volumes:
      - ${PWD}/.docker/postgresql:/var/lib/postgresql
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    ports:
      - 5432:5432
    environment:
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -h localhost -U ${DB_USERNAME} -d postgres']
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      homelab:
        aliases:
          - ${URL_POSTGRESQL}
    profiles:
      - devops

networks:
  devops:
    driver: bridge
```

```bash [.env]
UID=1000
GID=1000

DB_DATABASE_FORGEJO=forgejo
DB_USERNAME=forgejo_user
DB_PASSWORD=superSecretPwd

URL_FORGEJO=forgejo.domaine.tld
URL_POSTGRESQL=postgresql.domaine.tld
```

#### 🧩 Schéma

<mermaid>
graph LR
  subgraph homelab[Homelab – réseau Docker]
    direction TB
    PostgreSQL@{ shape: cyl, label: "PostgreSQL" }
    Forgejo
    Traefik
  end
  subgraph env[Variables d’environnement]
    direction LR
    DB_INFO["DB_USERNAME<br/>DB_PASSWORD"]
    ENV_FORGEJO["DB_DATABASE_FORGEJO<br/>URL_POSTGRESQL<br/>URL_FORGEJO"]
    UID_GID["UID<br/>GID"]
  end
  subgraph client[Client]
    direction LR
    git
    browser
  end
  Forgejo -->|postgres://URL_POSTGRESQL| PostgreSQL
  git -- "ssh://URL_FORGEJO:222 (SSH - git)" --> Forgejo
  browser -- "https://URL_FORGEJO (Web UI) -> 443" --> Traefik
  Traefik -- "https://URL_FORGEJO (Web UI) -> 3000" --> Forgejo
  DB_INFO --> Forgejo
  ENV_FORGEJO --> Forgejo
  DB_INFO --> PostgreSQL
  UID_GID --> Forgejo
</mermaid>

Enfin on ouvre son navigateur préféré, on se connecte à l'url que l'on a indiqué dans le fichier *.env* (ici forgejo.domaine.tld) et hop on a notre Forgejo 

On fait l'installation
![Forgejo - Install](/img/content/forgejo-installation.png){ width=100% }

Et la magie opère

![Forgejo - Page d'accueil ](/img/content/forgejo.png){ width=100% }

![Forgejo - Dashboard](/img/content/forgejo-dashboard.png){ width=100% }

Il ne reste plus qu'à configurer votre utilisateur, rajouter votre clé ssh

![Forgejo - Configuration](/img/content/forgejo-configuration.png)

Créer un dépôt

![Forgejo - New repository](/img/content/forgejo-new-repo.png)


Puis configurer git sur votre projet vers votre forgejo :

```bash
git remote set-url origin ssh://git@forgejo.domaine.tld:222/utilisateur/depot.git
```

Il ne reste plus qu'à développer et pousser vos modifications sur votre propre platforme 😊

Bon coding !