---
title: 'AFFiNE — Self-hosted'
description: 'Notion + Miro open-source et self-hosted : documents, tableaux blancs et bases de données dans un canvas unifié'
icon: 'i-mdi:note-multiple-outline'
article_id: 'affine-self-hosted'
color: 'indigo'
draft: false
publishedAt: '2026-08-01'
---

#### 📝 AFFiNE — L'alternative open-source à Notion et Miro

Notion pour les documents. Miro pour les tableaux blancs. Deux abonnements,
deux interfaces, deux silos de données.

**AFFiNE** fusionne les deux dans un seul outil open-source self-hosted : un
canvas unifié où un document peut devenir un tableau blanc, où un tableau kanban
peut s'intégrer dans une page de notes — le tout dans la même interface.

- **Documents** : éditeur de blocs, pages imbriquées, slash commands
- **Tableaux blancs** : canvas infini, formes, cadres, mind maps
- **Bases de données** : vues grille, kanban, calendrier, galerie
- **Collaboration** : édition temps réel, commentaires, permissions

> 💡 Le dépôt officiel :
> [github.com/toeverything/AFFiNE](https://github.com/toeverything/AFFiNE){:target="_blank"}

---

#### 🆚 AFFiNE vs les alternatives

::tool-table
| | Notion | Miro | AFFiNE |
|---|---|---|---|
| **Documents** | ✅ | ❌ | ✅ |
| **Tableau blanc** | ❌ | ✅ | ✅ |
| **Self-hosted** | ❌ | ❌ | ✅ |
| **Open-source** | ❌ | ❌ | ✅ (AGPL-3.0) |
| **Mode hors ligne** | Partiel | ❌    | ✅      |
| **Prix** | ~10€/user/mois | ~8€/user/mois | Gratuit |
::

#####

> ⚠️ À savoir

>Le projet est encore tout frais, mais certaines fonctionnalités continuent de s'améliorer à toute vitesse ! L’écosystème est un peu plus petit que celui de Notion, mais ça ne cesse de grandir. Et comme c’est encore en développement, il peut arriver que quelques petits bugs apparaissent selon la version que vous utilisez.

#### 🗺️ Architecture

<mermaid>
graph LR
  Browser["🌍 Navigateur"]
  Traefik["🚦 Traefik\nReverse proxy + TLS"]
  AFFiNE["📝 AFFiNE\n:3010"]
  PG["🗄️ PostgreSQL\n+ pgvector :5432"]
  Redis["⚡ Redis\ncache + temps réel"]
  Browser -->|"HTTPS"| Traefik
  Traefik --> AFFiNE
  AFFiNE --> PG
  AFFiNE --> Redis
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  classDef dbStyle fill:#ddf,stroke:#00d,stroke-width:2px;
  class Traefik,AFFiNE containerStyle;
  class PG,Redis dbStyle;
</mermaid>

**Pourquoi `pgvector` ?** AFFiNE utilise PostgreSQL avec l'extension pgvector
pour stocker les embeddings vectoriels, nécessaire pour les fonctionnalités IA d'AFFiNE (recherche sémantique et fonctionnalités associées). L'image `pgvector/pgvector:pg16` inclut l'extension.


#### ⚙️ Prérequis

::tool-table
| Service | Rôle | Article |
|---------|------|---------|
| Traefik | Reverse proxy + TLS | [Article 3](/blog/article/3-docker-traefik-introduction) |
| Réseau `projects_local_dev` | Réseau partagé | [Article 2](/blog/article/2-docker-compose-description) |
::


#### 🚀 Mise en place

##### 1. Créer `.env`

```bash [.env]
# Version AFFiNE
AFFINE_REVISION=stable
APP_NAME=affine

# URL publique
AFFINE_SERVER_HOST=affine.domain.tld

# Port interne
PORT=3010

# Volumes persistants
UPLOAD_LOCATION=./.docker/affine/storage
CONFIG_LOCATION=./.docker/affine/config
DB_DATA_LOCATION=./.docker/affine/postgresql

# Base de données
DB_USERNAME=affine
DB_PASSWORD=changez_moi_openssl_rand_hex_32
DB_DATABASE=affine
```

##### 2. Créer `docker-compose.yml`

```yaml [docker-compose.yml]
services:
  affine:
    image: ghcr.io/toeverything/affine:${AFFINE_REVISION:-stable}
    container_name: affine_server
    restart: unless-stopped
    depends_on:
      redis-affine:
        condition: service_healthy
      postgres-affine:
        condition: service_healthy
      affine_migration:
        condition: service_completed_successfully
    volumes:
      - ${UPLOAD_LOCATION}:/root/.affine/storage
      - ${CONFIG_LOCATION}:/root/.affine/config
    env_file:
      - .env
    environment:
      - REDIS_SERVER_HOST=redis-affine
      - DATABASE_URL=postgresql://${DB_USERNAME}:${DB_PASSWORD}@postgres-affine:5432/${DB_DATABASE:-affine}
      - AFFINE_INDEXER_ENABLED=false
      - SELFHOSTED=true
    labels:
      - "traefik.enable=true"

      # HTTP → HTTPS
      - "traefik.http.routers.${APP_NAME}.rule=Host(`${AFFINE_SERVER_HOST}`)"
      - "traefik.http.routers.${APP_NAME}.entrypoints=http"
      - "traefik.http.middlewares.${APP_NAME}-redirect.redirectscheme.scheme=https"
      - "traefik.http.middlewares.${APP_NAME}-redirect.redirectscheme.permanent=true"
      - "traefik.http.routers.${APP_NAME}.middlewares=${APP_NAME}-redirect"

      # HTTPS
      - "traefik.http.routers.${APP_NAME}-secure.service=${APP_NAME}-secure"
      - "traefik.http.routers.${APP_NAME}-secure.rule=Host(`${AFFINE_SERVER_HOST}`)"
      - "traefik.http.routers.${APP_NAME}-secure.entrypoints=https"
      - "traefik.http.routers.${APP_NAME}-secure.tls=true"

      # Port interne
      - "traefik.http.services.${APP_NAME}-secure.loadbalancer.server.port=3010"
    networks:
      - homelab

  affine_migration:
    image: ghcr.io/toeverything/affine:${AFFINE_REVISION:-stable}
    container_name: affine_migration_job
    restart: no
    volumes:
      - ${UPLOAD_LOCATION}:/root/.affine/storage
      - ${CONFIG_LOCATION}:/root/.affine/config
    command: ['sh', '-c', 'node ./scripts/self-host-predeploy.js']
    env_file:
      - .env
    environment:
      - REDIS_SERVER_HOST=redis-affine
      - DATABASE_URL=postgresql://${DB_USERNAME}:${DB_PASSWORD}@postgres-affine:5432/${DB_DATABASE:-affine}
      - AFFINE_INDEXER_ENABLED=false
    depends_on:
      postgres-affine:
        condition: service_healthy
      redis-affine:
        condition: service_healthy
    networks:
      - homelab

  redis-affine:
    image: redis:latest
    container_name: affine_redis
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'redis-cli', '--raw', 'incr', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - homelab

  postgres-affine:
    image: pgvector/pgvector:pg16
    container_name: affine_postgres
    restart: unless-stopped
    volumes:
      - ${DB_DATA_LOCATION}:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_DATABASE:-affine}
      POSTGRES_INITDB_ARGS: '--data-checksums'
    healthcheck:
      test: ['CMD', 'pg_isready', '-U', "${DB_USERNAME}", '-d', "${DB_DATABASE:-affine}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - homelab

networks:
  homelab:
    name: projects_local_dev
    driver: bridge
    external: true
```

##### 3. Démarrer

```bash
echo ".env" >> .gitignore

# Créer les répertoires de volumes
mkdir -p .docker/affine/{storage,config,postgresql}

# Démarrer (la migration s'exécute automatiquement en premier)
docker compose up -d

# Suivre la migration puis le démarrage
docker compose logs -f affine_migration
docker compose logs -f affine
```

Une fois démarré, AFFiNE est accessible sur `https://affine.domain.tld`.

##### 4. Premier accès

À la première ouverture, créez votre compte administrateur.
AFFiNE vous propose ensuite de créer votre premier workspace.

Les fonctionnalités clés à explorer :

- 📝 **Mode Document** — éditeur de blocs, slash commands (`/page`, `/kanban`, `/table`)
- 🎨 **Mode Edgeless** — canvas infini, tableaux blancs, mind maps
- 📋 **Bases de données** — vues grille, kanban, calendrier, galerie
- 🤝 **Collaboration** — invitez des membres, éditez en temps réel

#### 💾 Sauvegardes

AFFiNE stocke tout dans deux endroits :

- **PostgreSQL** (`affine_postgres`) → documents, workspaces, utilisateurs, embeddings vectoriels
- **Volume storage** (`.docker/affine/storage`) → pièces jointes, images, fichiers

Si vous avez déjà mis en place la stratégie de sauvegarde de la série DevOps,
les deux sont couverts automatiquement.

#### ✅ Résumé

::tool-table
| Élément | Détail |
|---------|--------|
| Image | `ghcr.io/toeverything/affine:stable` |
| Port interne | `3010` |
| Base de données | PostgreSQL + pgvector |
| Cache | Redis dédié |
| URL | `https://affine.domain.tld` |
| Licence | AGPL-3.0 |
::

#### ✅ Conclusion

AFFiNE est l'alternative self-hosted la plus complète à Notion et Miro combinés.
Le canvas unifié — où documents et tableaux blancs coexistent dans le même
espace — est ce qui distingue AFFiNE de toutes les autres alternatives.

C'est encore jeune, mais c'est déjà le meilleur outil de cette catégorie
pour un développeur qui souhaite garder le contrôle de ses données.

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::