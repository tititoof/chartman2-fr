---
title: "Docker – Coolify"
description: "Automatisez vos déploiements Docker avec Coolify : intégration Jenkins, API REST, registry privé et GHCR. Guide complet d'installation et configuration."
icon: "i-mdi:docker"
article_id: "12-docker-coolify-init"
color: "blue"
---

#### 📌 Coolify ![Coolify](/img/coolify-transparent.svg){ width=30px }

[Coolify](https://coolify.io){:target="_blank"} est une plateforme PaaS open-source
self-hosted — l'alternative à Heroku, Vercel ou Render, sur votre propre serveur.

- **Déploiement depuis une image Docker** : pull depuis GHCR, Docker Hub ou votre registry privé
- **Déploiement depuis Git** : Forgejo, GitHub, GitLab
- **SSL automatique** : certificats Let's Encrypt gérés nativement
- **Notifications temps réel** : logs de déploiement live via WebSockets (Soketi)
- **API REST** : déclenchement de déploiements depuis Jenkins
- **Open-source** : version Community gratuite, sans vendor lock-in

Dans notre stack, Coolify est le **dernier maillon** : Jenkins build et teste,
SonarQube valide la qualité, le registry stocke l'image, puis Coolify déploie
en production via un simple appel API.

#### 🏗️ Architecture

Coolify se compose de deux services :

::tool-table
| Service | Rôle |
|---------|------|
| `coolify` | Application principale — UI, API, gestion des déploiements |
| `soketi` | Serveur WebSocket — logs et notifications en temps réel dans l'UI |
::

> 💡 **TCP passthrough** : contrairement aux autres services de la série qui utilisent
> HTTP(S) via Traefik, Coolify gère son propre TLS. Traefik laisse donc passer le trafic
> chiffré sans le terminer — c'est le rôle de `tls.passthrough=true`.

<mermaid>
graph LR
  Jenkins["🧰 Jenkins"] -->|curl API deploy| Coolify["🚀 Coolify\n:8080"]
  Forgejo["🦌 Forgejo"] -->|Webhook push| Coolify
  Coolify -->|docker pull| GHCR["📦 GHCR\nghcr.io"]
  Coolify -->|docker pull| Registry["📦 Registry\nhomelab"]
  Coolify --> App["📦 App déployée"]
  Soketi["⚡ Soketi\nWebSocket"] <--> Coolify
  Navigateur["🌍 Navigateur\nhttps://coolify.domain.tld"] -->|TCP passthrough| Traefik["🚦 Traefik"]
  subgraph DH["🐳 Docker Host"]
    subgraph homelab["🌐 homelab (Docker network)"]
      Traefik --> Coolify
      Coolify
      Soketi
    end
  end
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  class Navigateur,DH cluster;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Traefik,Coolify,Soketi,Jenkins,Forgejo,GHCR,Registry,App containerStyle;
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

  coolify:
    image: "${REGISTRY_URL:-ghcr.io}/coollabsio/coolify:${LATEST_IMAGE:-latest}"
    restart: unless-stopped
    volumes:
      - type: bind
        source: ${PWD}/.env
        target: /var/www/html/.env
        read_only: true
      - ${PWD}/.docker/data/coolify/nginx.conf:/etc/nginx/conf.d/default.conf
      - ${PWD}/.docker/data/coolify/ssh:/var/www/html/storage/app/ssh
      - ${PWD}/.docker/data/coolify/applications:/var/www/html/storage/app/applications
      - ${PWD}/.docker/data/coolify/databases:/var/www/html/storage/app/databases
      - ${PWD}/.docker/data/coolify/services:/var/www/html/storage/app/services
      - ${PWD}/.docker/data/coolify/backups:/var/www/html/storage/app/backups
      - ${PWD}/.docker/data/coolify/webhooks-during-maintenance:/var/www/html/storage/app/webhooks-during-maintenance
      - /etc/resolv.conf.head:/etc/resolv.conf.head
    environment:
      - DB_HOST=${URL_POSTGRESQL}
      - APP_ENV=${APP_ENV:-production}
      - PHP_MEMORY_LIMIT=${PHP_MEMORY_LIMIT:-256M}
      - PHP_FPM_PM_CONTROL=${PHP_FPM_PM_CONTROL:-dynamic}
      - PHP_FPM_PM_START_SERVERS=${PHP_FPM_PM_START_SERVERS:-1}
      - PHP_FPM_PM_MIN_SPARE_SERVERS=${PHP_FPM_PM_MIN_SPARE_SERVERS:-1}
      - PHP_FPM_PM_MAX_SPARE_SERVERS=${PHP_FPM_PM_MAX_SPARE_SERVERS:-10}
    env_file:
      - ${PWD}/.env
    ports:
      - "${APP_PORT:-8000}:8080"
    labels:
      - traefik.enable=true

      # TCP passthrough — Coolify gère son propre TLS
      - traefik.tcp.routers.coolify.entrypoints=https
      - traefik.tcp.routers.coolify.rule=HostSNI(`${URL_COOLIFY}`)
      - traefik.tcp.routers.coolify.tls=true
      - traefik.tcp.routers.coolify.tls.passthrough=true
      - traefik.tcp.routers.coolify.service=coolify
      - traefik.tcp.services.coolify.loadbalancer.server.port=8080
    healthcheck:
      test: curl --fail http://127.0.0.1:8080/api/health || exit 1
      interval: 5s
      retries: 10
      timeout: 2s
    extra_hosts:
      - "host.docker.internal:host-gateway"
      - "registry.domain.tld:192.168.1.205"
    networks:
      homelab:
        aliases:
          - ${URL_COOLIFY}
    dns:
      - 192.168.1.250
    profiles:
      - devops

  soketi:
    image: "${REGISTRY_URL:-ghcr.io}/coollabsio/coolify-realtime:1.0.10"
    restart: unless-stopped
    ports:
      - "${SOKETI_PORT:-6001}:6001"
      - "6002:6002"
    volumes:
      - /data/coolify/ssh:/var/www/html/storage/app/ssh
      - /etc/resolv.conf.head:/etc/resolv.conf.head
    environment:
      APP_NAME: "${APP_NAME:-Coolify}"
      SOKETI_DEBUG: "${SOKETI_DEBUG:-false}"
      SOKETI_DEFAULT_APP_ID: "${PUSHER_APP_ID}"
      SOKETI_DEFAULT_APP_KEY: "${PUSHER_APP_KEY}"
      SOKETI_DEFAULT_APP_SECRET: "${PUSHER_APP_SECRET}"
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:6001/ready && wget -qO- http://127.0.0.1:6002/ready || exit 1"]
      interval: 5s
      retries: 10
      timeout: 2s
    extra_hosts:
      - "host.docker.internal:host-gateway"
      - "registry.domain.tld:192.168.1.205"
    networks:
      homelab:
        aliases:
          - ${URL_COOLIFY}
    profiles:
      - devops

networks:
  homelab:
    driver: bridge
```

```bash [.env]
URL_COOLIFY=coolify.domain.tld
URL_POSTGRESQL=postgresql.domain.tld
APP_PORT=8000
APP_ENV=production
LATEST_IMAGE=latest
REGISTRY_URL=ghcr.io

# Soketi / Pusher
PUSHER_APP_ID=votre_app_id
PUSHER_APP_KEY=votre_app_key
PUSHER_APP_SECRET=votre_app_secret
SOKETI_PORT=6001
```

> 💡 `REGISTRY_URL` permet de basculer entre votre registry privé et GHCR :
> - En homelab : `REGISTRY_URL=registry.domain.tld`
> - En production ou si le homelab est éteint : `REGISTRY_URL=ghcr.io`

> 💡 `extra_hosts` avec l'IP fixe de votre serveur registry (`192.168.1.205`)
> est nécessaire car le registry est sur le réseau local et non résolvable
> par un DNS public. Adaptez l'IP à votre configuration.

> 💡 `dns: 192.168.1.250` pointe vers votre resolver DNS local — nécessaire
> pour résoudre les domaines `.lan` ou internes à votre homelab.

#### 🖥️ Configuration d'un déploiement dans Coolify

Voici comment configurer le déploiement de votre application pas à pas depuis l'UI.

##### 1. Créer un projet

Dans Coolify → **Projects** → **+**, créez un projet :

- **Name** : `frontend-chartman2-fr.ovh`
- **Description** : `My Portfolio Frontend`

![Coolify - Projects](/img/content/coolify-projects.png){ width=100% }

##### 2. Créer les environnements

Dans votre projet, créez deux environnements :

- `production` → recevra les images taguées `:latest` (branche `main`)
- `staging` → recevra les images taguées `:staging` (branche `develop`)

![Coolify - Environments](/img/content/coolify-environments.png){ width=100% }

##### 3. Configurer l'application

Dans chaque environnement → **+ Add Resource** → **Docker Image** :

::tool-table
| Champ | Production | Staging |
|-------|-----------|---------|
| **Name** | `docker-image-frontend-chartman2-fr` | `docker-image-frontend-chartman2-fr` |
| **Docker Image** | `ghcr.io/tititoof/frontend-chartman2fr` | `ghcr.io/tititoof/frontend-chartman2fr` |
| **Tag** | `latest` | `staging` |
| **Domain** | `https://chartman2-fr.ovh` | `https://staging.chartman2-fr.ovh` |
| **Direction** | `Redirect to non-www` | — |
::

![Coolify - Configuration](/img/content/coolify-configuration.png){ width=100% }

> 💡 **Docker Image Tag** : c'est le tag que Jenkins pousse — `latest` pour `main`,
> `staging` pour `develop`. Coolify pullera automatiquement la nouvelle version
> à chaque déploiement déclenché via l'API.

##### 4. Récupérer l'UUID pour Jenkins

Dans **General** → notez l'UUID affiché dans l'URL de la page :

#### 🔌 Intégration Jenkins

##### 1. Générer un token API Coolify

Dans Coolify → **Profile** → **API Tokens** :

![Coolify - API Tokens](/img/content/coolify-api-tokens.png){ width=100% }

Créez un nouveau token :

- **Description** : `jenkins-token`
- **Permissions** : cochez uniquement `deploy`

> ⚠️ Donnez uniquement la permission `deploy` à Jenkins — pas `write` ni `root`.
> Le principe du moindre privilège : Jenkins n'a besoin que de déclencher des
> déploiements, pas de modifier votre configuration Coolify.

Copiez le token — il ne sera affiché qu'une seule fois. Enregistrez-le dans Jenkins
sous l'ID `coolify-token` (**Manage Jenkins** → **Credentials** → **Secret text**).

::tool-table
| Permission | Rôle |
|------------|------|
| `root` | Accès total — à éviter |
| `write` | Modification de la configuration |
| `deploy` | Déclenchement de déploiements uniquement ✅ |
| `read` | Lecture seule |
| `read:sensitive` | Lecture des données sensibles (secrets, env) |
::

Enregistrez-le dans Jenkins sous l'ID `coolify-token`

(**Manage Jenkins** → **Credentials** → **Secret text**).

##### 2. Récupérer l'UUID de votre application

Dans Coolify → votre application → **General** → copiez l'**UUID**.

Enregistrez-le dans Jenkins sous l'ID `coolify-app-uuid`
(**Manage Jenkins** → **Credentials** → **Secret text**).

##### 3. Déclencher le déploiement depuis le Jenkinsfile

```groovy [Jenkinsfile]
stage('Deploy') {
    steps {
        withCredentials([
            string(credentialsId: 'coolify-token', variable: 'COOLIFY_TOKEN'),
            string(credentialsId: 'coolify-app-uuid', variable: 'APP_UUID')
        ]) {
            sh """
                curl -fsSL \
                  -X POST \
                  -H "Authorization: Bearer \${COOLIFY_TOKEN}" \
                  "https://coolify.domain.tld/api/v1/deploy?uuid=\${APP_UUID}&force=false"
            """
        }
    }
}
```

> 💡 `force=false` respecte la politique de déploiement configurée dans Coolify.
> `force=true` déclenche un redéploiement immédiat même si l'image n'a pas changé.

#### 🗂️ Structure des fichiers

```
.
├── docker-compose.yml
├── .env
└── .docker/
    └── data/
        └── coolify/
            ├── nginx.conf          ← configuration nginx interne
            ├── ssh/                ← clés SSH pour les serveurs distants
            ├── applications/       ← configurations des applications
            ├── databases/          ← configurations des bases de données
            ├── services/           ← configurations des services
            ├── backups/            ← sauvegardes
            └── webhooks-during-maintenance/
```

#### 🔒 Bonnes pratiques

- **Sauvegardez `.docker/data/coolify/`** régulièrement — c'est toute votre configuration
- **Ne commitez jamais le `.env`** — il contient les secrets Pusher et les tokens
- **Épinglez la version** de soketi (`coolify-realtime:1.0.10`) pour éviter les
  incompatibilités avec Coolify lors des mises à jour

#### ✅ Conclusion

Coolify referme la boucle de notre stack DevOps : le code pushé sur Forgejo déclenche
Jenkins, qui teste, analyse avec SonarQube, pousse l'image vers le registry et GHCR,
puis ordonne à Coolify de déployer en production — le tout sans intervention manuelle.

Le double push registry/GHCR garantit que vos déploiements fonctionnent même quand
votre homelab est éteint : Coolify pull depuis GHCR si le registry local est
inaccessible.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::