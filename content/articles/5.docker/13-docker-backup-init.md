---
title: "Docker – Sauvegardes"
description: "Sauvegarder automatiquement vos bases de données PostgreSQL avec Postgresus et RustFS"
icon: "i-mdi:docker"
article_id: "13-docker-backup-init"
color: "blue"
draft: false
publishedAt: '2026-08-05'
---

#### 📌 Sauvegardes des bases de données

Une infrastructure DevOps moderne ne se limite pas aux déploiements automatisés, aux pipelines CI/CD ou à la supervision. Sans stratégie de sauvegarde fiable, l'ensemble de ces efforts peut être réduit à néant par une erreur humaine, une panne matérielle, une corruption de données ou une mauvaise manipulation.

Les bases de données contiennent souvent l'actif le plus précieux d'une application : les données métier. Perdre ces informations peut avoir des conséquences bien plus importantes qu'une simple interruption de service.

Pour limiter ce risque, nous allons mettre en place une solution de sauvegarde automatisée reposant sur deux composants complémentaires :

- **Postgresus** : chargé d'orchestrer et de planifier les sauvegardes PostgreSQL ;
- **RustFS** : un stockage objet compatible S3 qui conservera les archives de manière centralisée.

L'objectif est simple : disposer de sauvegardes régulières, externalisées et facilement restaurables en cas d'incident.

#### 🧩 Les outils

##### Postgresus

Découvrez [Postgresus](https://github.com/rostislavdugin/postgresus){:target="_blank"}, une application web simple et efficace pour automatiser vos sauvegardes PostgreSQL. Elle facilite la gestion de toutes vos bases de données en un seul endroit et automatise les exportations, sans besoin de scripts compliqués.

Voici ce que vous pouvez faire avec Postgresus :

- Plannifier facilement vos sauvegardes grâce à des expressions cron
- Gérer plusieurs bases PostgreSQL depuis une seule interface intuitive
- Envoyer vos sauvegardes vers différents stockages compatibles S3
- Consulter l’historique des opérations, avec le statut et la taille des archives
- Télécharger et restaurer vos sauvegardes rapidement et sans souci

Postgresus simplifie la gestion de cette tâche essentielle, souvent mise de côté, en vous offrant une solution conviviale pour garantir la sécurité et la disponibilité de vos données.

##### RustFS

Découvrez [RustFS](https://rustfs.com){:target="_blank"}, une solution de stockage objet distribuée conçue en Rust et compatible avec l'API Amazon S3. C’est l’idéal pour héberger votre propre espace de stockage afin de sauvegarder vos données, vos artefacts CI/CD, vos fichiers d’application ou tout autre contenu que vous souhaitez conserver en toute fiabilité.  

Pourquoi l’intégrer ?  
- Parce qu'il offre une compatibilité S3 complète, appréciée par la majorité des outils DevOps  
- Grâce à une interface d'administration web facile à utiliser, tout est à portée de clic  
- Son API objet fonctionne via des endpoints standards S3, simple et efficace  
- Parce qu’il est open-source, sous la licence Apache 2.0, avec une communauté active  
- Il ne dépend d’aucun fournisseur cloud externe, pour plus d’indépendance  
- Et surtout, il offre des performances élevées grâce à sa mise en œuvre en Rust  

Dans notre architecture, RustFS sera comme un coffre-fort pour stocker les sauvegardes PostgreSQL générées par Postgresus. Cette séparation entre la base de données et ses sauvegardes permet de réduire les risques et de rendre les opérations de restauration plus simples et rapides en cas de d'incident.

> 💡 Avoir une sauvegarde sur le même serveur que votre base de données, ce n'est pas vraiment une sauvegarde efficace. En cas de panne du serveur, à la fois vos données et leurs sauvegardes risquent de disparaître en même temps. C’est pourquoi il est préférable d’utiliser un stockage dédié, comme une solution d’archivage en stockage objet, pour assurer la sécurité de vos archives PostgreSQL.

#### 🏗️ Architecture

Cette architecture a été conçue pour que chaque pièce ait son propre rôle bien défini : PostgreSQL s’occupe de stocker les données, Postgresus organise les sauvegardes prévues à l’avance, RustFS veille à leur conservation à long terme, et Traefik facilite l’accès sécurisé aux interfaces web via HTTPS. Tous ces éléments fonctionnent ensemble de manière indépendante tout en pouvant communiquer facilement grâce au réseau Docker interne.

<mermaid>
graph LR
  Postgresus["🗄️ Postgresus\nScheduler"] -->|pg_dump| PostgreSQL["🗄️ PostgreSQL\n:5432"]
  Postgresus -->|upload S3| RustFS["📦 RustFS\n:9000"]
  Navigateur["🌍 Navigateur"] -->|HTTPS 443| Traefik["🚦 Traefik"]
  subgraph DH["🐳 Docker Host"]
    subgraph local_dev["🌐 local_dev (Docker network)"]
      Traefik --> RustFS
      Traefik --> Postgresus
      RustFS --> Data["💾 rustfs-data/\nVolume local"]
    end
  end
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  class Navigateur,DH cluster;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Traefik,RustFS,Postgresus,PostgreSQL containerStyle;
  classDef volumeStyle fill:#ddf,stroke:#00d,stroke-width:2px;
  class Data volumeStyle;
</mermaid>

#### ⚙️ docker-compose.yml

Cette configuration vous permet d'avoir une chaîne de sauvegarde simple et efficace : Postgresus s'occupe des sauvegardes PostgreSQL, RustFS les stocke dans un espace sécurisé compatible S3, et Traefik veille à ce que les interfaces d'administration et les API soient accessibles en toute sécurité via HTTPS. En résumé, vos sauvegardes sont centralisées, automatisées et facilement accessibles depuis une infrastructure entièrement self-hosted. 🚀

```yaml [docker-compose.yml]
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

  rustfs:
    image: rustfs/rustfs:latest
    container_name: rustfs
    restart: unless-stopped
    security_opt:
      - "no-new-privileges:true"
    environment:
      - RUSTFS_ROOT_USER=${RUSTFS_ROOT_USER}
      - RUSTFS_ROOT_PASSWORD=${RUSTFS_ROOT_PASSWORD}
      - RUSTFS_VOLUMES=/data/rustfs0
      - RUSTFS_ADDRESS=0.0.0.0:9000
      - RUSTFS_CONSOLE_ADDRESS=0.0.0.0:9001
      - RUSTFS_CONSOLE_ENABLE=true
      - RUSTFS_SERVER_DOMAINS=${URL_RUSTFS}
      - RUSTFS_REGION=auto
      - RUSTFS_OBS_LOGGER_LEVEL=info
      - RUSTFS_OBS_LOG_DIRECTORY=/app/logs
    volumes:
      - ${PWD}/rustfs-data:/data
      - ${PWD}/rustfs-logs:/app/logs
    healthcheck:
      test: ["CMD", "sh", "-c", "curl -f http://localhost:9000/health && curl -f http://localhost:9001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    labels:
      - "traefik.enable=true"

      # HTTP → Console web RustFS
      - "traefik.http.routers.rustfs.rule=Host(`${URL_RUSTFS}`)"
      - "traefik.http.routers.rustfs.entrypoints=http"
      - "traefik.http.routers.rustfs.service=rustfs"

      # HTTP → API S3
      - "traefik.http.routers.rustfs-api.rule=Host(`${URL_RUSTFS_API}`)"
      - "traefik.http.routers.rustfs-api.entrypoints=http"
      - "traefik.http.routers.rustfs-api.service=rustfs-api"

      # HTTPS → Console web RustFS
      - "traefik.http.routers.rustfs-secure.service=rustfs-secure"
      - "traefik.http.routers.rustfs-secure.rule=Host(`${URL_RUSTFS}`)"
      - "traefik.http.routers.rustfs-secure.entrypoints=https"
      - "traefik.http.routers.rustfs-secure.tls=true"

      # HTTPS → API S3
      - "traefik.http.routers.rustfs-api-secure.service=rustfs-api-secure"
      - "traefik.http.routers.rustfs-api-secure.rule=Host(`${URL_RUSTFS_API}`)"
      - "traefik.http.routers.rustfs-api-secure.entrypoints=https"
      - "traefik.http.routers.rustfs-api-secure.tls=true"

      # Ports internes
      - "traefik.http.services.rustfs-secure.loadbalancer.server.port=9001"
      - "traefik.http.services.rustfs-api-secure.loadbalancer.server.port=9000"
    networks:
      local_dev:
        aliases:
          - ${URL_RUSTFS}
          - ${URL_RUSTFS_API}

  postgresus:
    container_name: postgresus
    image: rostislavdugin/postgresus:latest
    restart: unless-stopped
    volumes:
      - ${PWD}/postgresus-data:/postgresus-data
    labels:
      - "traefik.enable=true"

      # HTTP
      - "traefik.http.routers.postgresus.rule=Host(`${URL_POSTGRESUS}`)"
      - "traefik.http.routers.postgresus.entrypoints=http"
      - "traefik.http.routers.postgresus.service=postgresus"

      # HTTPS
      - "traefik.http.routers.postgresus-secure.service=postgresus-secure"
      - "traefik.http.routers.postgresus-secure.rule=Host(`${URL_POSTGRESUS}`)"
      - "traefik.http.routers.postgresus-secure.entrypoints=https"
      - "traefik.http.routers.postgresus-secure.tls=true"

      # Port interne
      - "traefik.http.services.postgresus-secure.loadbalancer.server.port=4005"
    networks:
      local_dev:
        aliases:
          - ${URL_POSTGRESUS}

networks:
  local_dev:
    driver: bridge
```

```bash [.env]
URL_RUSTFS=rustfs.domain.tld
URL_RUSTFS_API=rustfs-api.domain.tld
URL_POSTGRESUS=postgresus.domain.tld

RUSTFS_ROOT_USER=votre_user
RUSTFS_ROOT_PASSWORD=superSecretPwd
```

##### Deux URLs pour RustFS

Comme MinIO, RustFS expose deux interfaces sur deux ports distincts :

::tool-table
| URL | Port | Rôle |
|-----|------|------|
| `rustfs.domain.tld` | `9001` | Console web d'administration |
| `rustfs-api.domain.tld` | `9000` | API S3 — utilisée par Postgresus |
::

> ⚠️ Ne commitez jamais `RUSTFS_ROOT_USER` et `RUSTFS_ROOT_PASSWORD` dans votre
> dépôt Git. Utilisez toujours le fichier `.env` et ajoutez-le au `.gitignore`.

> 💡 `security_opt: no-new-privileges:true` empêche le processus RustFS d'acquérir
> des privilèges supplémentaires au runtime — bonne pratique de sécurité pour tout
> service exposé sur internet.

---

#### 🚀 Premier démarrage

```bash
docker compose up -d
```

##### Configuration de RustFS

Rendez-vous sur `https://rustfs.domain.tld` avec vos identifiants `RUSTFS_ROOT_USER`
et `RUSTFS_ROOT_PASSWORD`.

Créez un bucket pour vos sauvegardes dans **Buckets** → **Create Bucket** :

- **Name** : `postgresql-backups`

Créez ensuite un access key dédié dans **Access Keys** → **Create Access Key** :

- Notez l'**Access Key** et le **Secret Key** — ils seront utilisés par Postgresus

> 💡 Créez un access key **dédié à Postgresus** plutôt que d'utiliser les credentials
> root — principe du moindre privilège.

##### Configuration de Postgresus

Rendez-vous sur `https://postgresus.domain.tld`.

###### 1. Ajouter une destination RustFS

Dans **Destinations** → **Add** :

| Champ | Valeur |
|-------|--------|
| Type | `S3 / MinIO` |
| Endpoint | `https://rustfs-api.domain.tld` |
| Access Key | votre access key RustFS |
| Secret Key | votre secret key RustFS |
| Bucket | `postgresql-backups` |
| Region | `auto` |

> 💡 RustFS étant compatible S3, sélectionnez le type `S3 / MinIO` dans Postgresus — il n'y a pas de type RustFS spécifique, c'est la même API.

###### 2. Ajouter une instance PostgreSQL

Dans **Databases** → **Add** :

::tool-table
| Champ | Valeur |
|-------|--------|
| Host | `postgresql.domain.tld` |
| Port | `5432` |
| Username | votre utilisateur PostgreSQL |
| Password | votre mot de passe PostgreSQL |
::

###### 3. Configurer un planning de sauvegarde

Dans votre base de données → **Backups** → **Add Schedule** :

::tool-table
| Champ | Valeur recommandée |
|-------|-------------------|
| Destination | `postgresql-backups` (RustFS) |
| Schedule | `0 2 * * *` (tous les jours à 2h) |
| Retention | `7` (garder 7 sauvegardes) |
::

#### 🔁 Tester une sauvegarde manuelle

Avant de faire confiance au scheduler, déclenchez une sauvegarde manuelle dans
Postgresus → votre base → **Backup Now**.

Vérifiez ensuite dans la console RustFS que le fichier est bien apparu dans votre
bucket `postgresql-backups`.

#### 🗂️ Structure des fichiers

```
.
├── docker-compose.yml
├── .env
├── rustfs-data/         ← fichiers de sauvegarde (à protéger !)
├── rustfs-logs/         ← logs RustFS
└── postgresus-data/     ← configuration Postgresus
```

> ⚠️ `rustfs-data/` contient vos sauvegardes PostgreSQL. Ce volume est sur le même serveur que vos bases — pensez à le répliquer sur un disque externe ou un stockage distant pour appliquer la règle du 3-2-1 : 3 copies, sur 2 supports différents, dont 1 hors site.

#### 🔒 Bonnes pratiques

- **Testez vos restaurations** régulièrement — une sauvegarde non testée n'est pas une sauvegarde fiable
- **Utilisez des access keys dédiés** dans RustFS — un par service, avec les permissions minimales nécessaires
- **Épinglez les versions** de RustFS et Postgresus plutôt que `latest` en production
- **Surveillez la taille** de `rustfs-data/` — les sauvegardes grossissent vite sur des bases volumineuses
- **Sauvegardez aussi `rustfs-data/`** sur un support externe — une sauvegarde locale reste vulnérable si le serveur tombe

#### ✅ Conclusion

Avec RustFS et Postgresus, votre infrastructure profite d'une solution de sauvegarde automatisée, facile à visualiser et entièrement auto-hébergée. Vos bases PostgreSQL sont sauvegardées chaque nuit dans un stockage objet compatible S3, accessibles via une interface web et téléchargeables quand vous le souhaitez.  

C’est la touche finale pour compléter notre stack DevOps. Qu’il s’agisse de souveraineté numérique, de sauvegarde des données, ou encore du CI/CD, du déploiement et de la gestion de vos projets — votre infrastructure est maintenant prête.

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::