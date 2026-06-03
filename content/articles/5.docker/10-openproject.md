---
title: "Docker – OpenProject"
description: "Installer et déployer OpenProject avec Docker"
icon: "i-mdi:docker"
article_id: "10-docker-openproject-init"
---

#### 📌 OpenProject ![OpenProject](/img/openproject.jpg){ width=30px }

[OpenProject](https://www.openproject.org){:target="_blank"} est la plateforme de gestion
de projets open-source la plus complète du marché. Self-hosted, elle vous donne le contrôle
total de vos données sans abonnement SaaS.

- **Gestion de projets** : tâches, épics, Kanban, roadmap, calendrier Gantt
- **Collaboration** : wiki, discussions, pièces jointes, notifications temps réel
- **Contrôle d'accès** : rôles, permissions, groupes, LDAP/OAuth2
- **Intégrations** : Forgejo, GitLab, GitHub, Jenkins via webhooks et API REST
- **Suivi du temps** : time tracking, rapports de coûts, budgets
- **Open-source** : licence GPLv3, version Community gratuite

Dans notre stack, OpenProject centralise la gestion des projets : les commits Forgejo
y sont référencés, Jenkins y met à jour les statuts des tâches, et les équipes
suivent l'avancement en temps réel.

#### 🏗️ Architecture

Contrairement aux autres outils de la série, OpenProject utilise une image **all-in-one** :
un seul conteneur embarque le serveur Rails, le worker de jobs asynchrones et le scheduler.
La base de données PostgreSQL tourne dans un conteneur séparé.

<mermaid>
graph LR
  Navigateur["🌍 Navigateur\nhttps://openproject.domain.tld"] -->|HTTPS 443| Traefik["🚦 Traefik"]
  Jenkins["🧰 Jenkins"] -->|API REST| OpenProject
  Forgejo["🦌 Forgejo"] -->|Webhook| OpenProject
  subgraph DH["🐳 Docker Host"]
    subgraph homelab["🌐 homelab (Docker network)"]
      Traefik --> OpenProject["📋 OpenProject\n:8080"]
      OpenProject --> DB["🗄️ PostgreSQL\n:5432"]
    end
  end
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  class Navigateur,DH cluster;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Traefik,OpenProject,DB,Jenkins,Forgejo containerStyle;
</mermaid>

#### ⚙️ Exemple

```yaml [docker-compose.yml]
services:
  traefik:
    restart: unless-stopped
    image: traefik:v3
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
      - homelab

  openproject:
    image: openproject/openproject:15
    restart: unless-stopped
    environment:
      - "DATABASE_URL=postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}/${DB_DATABASE}"
      - "USE_PUMA=true"
      - "IMAP_ENABLED=false"
    volumes:
      - ./.docker/openproject/logs:/var/log/supervisor
      - ./.docker/openproject/static:/var/openproject/assets
      - ./.docker/openproject/tmp:/home/dev/openproject/tmp
    labels:
      - "traefik.enable=true"

      # HTTP → HTTPS redirection
      - "traefik.http.middlewares.openproject-redirect.redirectscheme.scheme=https"

      # HTTP
      - "traefik.http.routers.openproject.rule=Host(`${OPENPROJECT_HOST}`)"
      - "traefik.http.routers.openproject.entrypoints=http"
      - "traefik.http.routers.openproject.middlewares=openproject-redirect"

      # HTTPS
      - "traefik.http.routers.openproject-secure.service=openproject-secure"
      - "traefik.http.routers.openproject-secure.rule=Host(`${OPENPROJECT_HOST}`)"
      - "traefik.http.routers.openproject-secure.entrypoints=https"
      - "traefik.http.routers.openproject-secure.tls=true"

      # Port interne
      - "traefik.http.services.openproject-secure.loadbalancer.server.port=8080"
    networks:
      homelab:
        aliases:
          - ${OPENPROJECT_HOST}
    depends_on:
      openproject-db:
        condition: service_healthy

  openproject-db:
    image: postgres:17
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_DATABASE}
    volumes:
      - ./.docker/openproject/postgresql:/var/lib/postgresql/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USERNAME} -d ${DB_DATABASE}']
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      homelab:
        aliases:
          - ${DB_HOST}

networks:
  homelab:
    driver: bridge
```

```bash [.env]
OPENPROJECT_HOST=openproject.domain.tld
DB_HOST=openproject-db.domain.tld
DB_USERNAME=openproject
DB_PASSWORD=superSecretPwd
DB_DATABASE=openproject
```

> 💡 `USE_PUMA=true` active le serveur Puma à la place de Passenger — plus léger
> et recommandé pour les installations Docker.

> 💡 `IMAP_ENABLED=false` désactive la réception d'emails entrants. Passez-le à `true`
> uniquement si vous configurez un serveur IMAP pour créer des tâches depuis des emails.

#### 🗂️ Structure des fichiers

```
.
├── docker-compose.yml
├── .env
└── .docker/
    └── openproject/
        ├── logs/        ← logs supervisor
        ├── static/      ← assets (uploads, fichiers joints)
        ├── tmp/         ← fichiers temporaires Rails
        └── postgresql/  ← données PostgreSQL
```

#### 🚀 Premier démarrage

```bash
docker compose up -d
```

![Openproject - Login](/img/content/openproject-login.png)

Au premier démarrage, OpenProject initialise la base et crée le schéma —
cela peut prendre 1 à 2 minutes. Suivez les logs :

```bash
docker logs -f openproject
```

Rendez-vous sur `https://openproject.domain.tld`.
Les identifiants par défaut sont `admin` / `admin` — **changez-les immédiatement**.

#### 🔌 Intégration Forgejo

Pour lier les commits aux tâches OpenProject, mentionnez `OP#123` dans vos messages
de commit — OpenProject met automatiquement à jour la tâche correspondante.

Dans Forgejo → **Settings** → **Webhooks** → **Add Webhook** → **Gitea** :

- Target URL : `https://openproject.domain.tld/webhooks/gitlab`
- Trigger : **Push events**, **Pull Request events**

#### 🔌 Intégration Jenkins

Pour mettre à jour le statut d'une tâche depuis un pipeline :

##### 1. Générer un token API OpenProject

Dans OpenProject → **My Account** → **Access tokens** → **Generate** :
- Token type : `API`

![Openproject - Tokens](/img/content/openproject-tokens.png)

Enregistrez-le dans Jenkins sous l'ID `openproject-token`
(**Manage Jenkins** → **Credentials** → **Secret text**).

![Openproject - Tokens](/img/content/jenkins-openproject.png)

##### 2. Mettre à jour une tâche depuis le Jenkinsfile

```groovy [Jenkinsfile]
stage('Update OpenProject') {
    steps {
        withCredentials([
            string(credentialsId: 'openproject-token', variable: 'OP_TOKEN')
        ]) {
            sh '''
                curl -fsSL \
                  -X PATCH \
                  -H "Authorization: Basic $(echo -n apikey:${OP_TOKEN} | base64)" \
                  -H "Content-Type: application/json" \
                  -d '{"_links": {"status": {"href": "/api/v3/statuses/7"}}}' \
                  "https://openproject.domain.tld/api/v3/work_packages/<ID>"
            '''
        }
    }
}
```

> 💡 Récupérez les IDs de vos statuts via
> `GET https://openproject.domain.tld/api/v3/statuses`
> pour connaître les valeurs correspondant à "In progress", "Done", etc.

![Openproject - Login](/img/content/openproject-projects.png)

![Openproject - Login](/img/content/openproject-lots.png)

#### 🔒 Bonnes pratiques

- **Sauvegardez `.docker/openproject/static`** — c'est là que sont stockés les fichiers
  joints et uploads de vos projets
- **Sauvegardez `.docker/openproject/postgresql`** — toute la base de données
- **Épinglez la version** : `openproject/openproject:15` plutôt que `latest` pour
  maîtriser les migrations de base lors des mises à jour majeures

#### ✅ Conclusion


OpenProject referme la boucle humaine de notre stack : le code vit dans Forgejo,
les builds tournent dans Jenkins, la qualité est vérifiée par SonarQube,
le déploiement est géré par Coolify — et tout l'avancement est suivi dans OpenProject.

Chaque outil fait une seule chose, bien, et s'intègre aux autres via webhooks et API.

Dans le prochain article, nous verrons comment mettre en place un [Registry Docker privé](/blog/article/11-docker-registry-init){:target="_blank"} — le hub central des images de notre stack, où Jenkins poussera les images buildées et depuis lequel Coolify les récupèrera pour les déployer.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::