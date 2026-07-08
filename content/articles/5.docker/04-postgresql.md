---
title: "Docker - PostgreSQL"
description: "Découvrez comment installer et configurer PostgreSQL avec Docker : volumes persistants, healthcheck, variables d’environnement et scripts d’initialisation."
icon: "i-mdi:docker"
article_id: "4-docker-postgresql-init"
color: "blue"
draft: false
publishedAt: '2026-06-03'
---

#### 📌 Le SGBD idéal pour vos projets : PostgreSQL ![PostgreSQL](/img/Postgresql_elephant.svg.png){ width=30px }

PostgreSQL est une base de données très populaire, gratuite et open-source. Elle est fiable, facile à étendre et rapide. Que ce soit pour un petit projet ou une application avec beaucoup de visiteurs, PostgreSQL est adaptée.

Voici comment le mettre en place rapidement avec Docker.

**Pourquoi choisir PostgreSQL ?**

- **Transactions ACID** : intégrité des données garantie, même en cas de crash ou d'accès concurrent.
- **Types avancés** : JSONB, tableaux, types géospatiaux via PostGIS (bien au-delà du SQL classique).
- **Extensibilité** : des centaines d'extensions disponibles (uuid-ossp, pgcrypto, PostGIS...).
- **Performances** : excellent sur les requêtes complexes, les agrégations et les gros volumes de données.
- **Open-source & communauté active** : maintenu depuis plus de 35 ans, avec une documentation solide et des mises à jour régulières.

#### 🚀 Cas d'usage typiques

PostgreSQL fonctionne parfaitement avec la plupart des frameworks pour créer des sites Web ou des applications :

- **Ruby on Rails** via l'adaptateur `pg`
- **Laravel / Symfony** via Doctrine ou Eloquent
- **Django, NestJS, FastAPI** — support natif

C'est le choix par défaut de la plupart des hébergeurs (Heroku, Render, Supabase) et une valeur sûre pour tout projet métier

#### ⚙️ Exemple

Voici la configuration d'un service PostgreSQL dans un fichier `docker-compose.yml` :

```yml [docker-compose.yml]
services:
  postgresql:
    image: postgres:15
    volumes:
      - ./.docker/postgresql:/var/lib/postgresql/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    ports:
      - 5432:5432
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    labels:
      - com.centurylinklabs.watchtower.enable=false
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "pg_isready -h localhost -U ${POSTGRES_USER} -d ${POSTGRES_DB}",
        ]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      local_dev:
        aliases:
          - postgresql.domain.tld
```

```bash [.env]
POSTGRES_USER=myusername
POSTGRES_PASSWORD=mypassword
POSTGRES_DB=mydb
```

Pour initialiser la base avec un script SQL au premier démarrage, ajoutez ce volume :

```yaml [docker-compose.yml]
volumes:
  - ./init.sql:/docker-entrypoint-initdb.d/init.sql
```

Ce fichier est exécuté automatiquement par PostgreSQL si le volume de données est vide — c'est-à-dire uniquement au tout premier démarrage.

Voici un exemple de contenu pour ce script (`init.sql`) :

```sql
-- Créer des bases supplémentaires
CREATE DATABASE myapp_test;
CREATE DATABASE myapp_production;

-- Donner tous les droits à l'utilisateur sur ces bases
GRANT ALL PRIVILEGES ON DATABASE myapp_test TO myusername;
GRANT ALL PRIVILEGES ON DATABASE myapp_production TO myusername;

-- Créer un schéma dédié
\c myapp_production
CREATE SCHEMA IF NOT EXISTS app;
GRANT ALL ON SCHEMA app TO myusername;

-- Activer des extensions utiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- génération d'UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- chiffrement
-- CREATE EXTENSION IF NOT EXISTS "postgis";  -- géospatial (image postgres+postgis requise)
```

💡 **`init.sql` est-il obligatoire ?**

Non, pas forcément. Si vous avez bien renseigné le nom d’utilisateur, le mot de passe et la base dans ton fichier `.env`, Docker va créer tout seul la base et l’utilisateur lors du premier démarrage. 

Un init.sql n'est nécessaire que si vous souhaitez plusieurs bases, ajouter des modules (extensions) ou faire des réglages particuliers.

#### ✅ Conclusion

PostgreSQL est une base de données fiable et éprouvée, utilisée dans des projets de toutes tailles à travers le monde. Avec Docker, son installation se résume à quelques lignes de configuration : un conteneur propre, un healthcheck intégré et la persistance des données assurée par un volume.

Dans le prochain article, nous allons mettre en place [Mailpit](/blog/article/5-docker-mailpit-init), un outil qui permet d'intercepter et de visualiser les emails envoyés par vos applications en développement, sans risque d'envoyer de vrais messages à de vrais destinataires.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::