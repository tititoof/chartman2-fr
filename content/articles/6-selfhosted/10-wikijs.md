---
title: "Docker – Wiki.js"
description: "Découvrez comment installer et configurer Wiki.js avec Docker : plateforme de documentation open-source, éditeurs Markdown et WYSIWYG, authentification et recherche full-text."
icon: "i-mdi:book-open-page-variant"
article_id: "docker-wikijs-init"
color: "blue"
draft: false
publishedAt: '2026-08-26'
---
#### 📌 Wiki.js ![Wiki.js](/img/content/wikijs-logo.svg){ width=80px }

OpenProject centralise déjà les tâches et le suivi de projet dans cette stack — mais où vit la documentation qui ne bouge pas au jour le jour : procédures d'astreinte, schémas d'architecture, notes de configuration ? [Wiki.js](https://js.wiki){:target="_blank"} est un moteur de wiki open-source qui remplit ce rôle, avec une interface nettement plus moderne que les wikis traditionnels :

* **Éditeurs multiples** : Markdown, éditeur visuel et édition HTML selon les besoins
* **Authentification flexible** : compte local, LDAP, OAuth2, ou fournisseurs tiers (Google, GitHub…)
* **Historique complet** : chaque page conserve ses versions, comparables et restaurables
* **Recherche intégrée** : retrouvez rapidement une page ou une information dans votre documentation
* **Structure hiérarchique** : organisation en arborescence, permissions par page ou par dossier
* **Open-source** : licence AGPLv3, aucune dépendance à un service tiers

#####

Dans cette stack, Wiki.js s'appuie sur la même instance PostgreSQL partagée que les autres services — pas de base dédiée à provisionner en plus.

<mermaid>
graph TD
  Navigateur["🌍 Navigateur<br/>https://wiki.domain.tld"] -->|HTTPS 443| Traefik["🚦<br/>Traefik"]
  subgraph DH["🐳 Docker Host"]
      subgraph local_dev["🌐 local_dev (Docker network)"]
          Traefik --> Wiki["📖<br/>Wiki.js<br/>:3000"]
          Wiki --> PG["🗄️<br/>PostgreSQL<br/>:5432"]
      end
  end
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  class Navigateur,DH cluster;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Traefik,Wiki,PG containerStyle;
</mermaid>

#### ⚙️ docker-compose.yml

```yml [docker-compose.yml]
services:
  wiki:
    image: ghcr.io/requarks/wiki:2
    depends_on:
      - postgresql
    environment:
      DB_TYPE: postgres
      DB_HOST: postgresql
      DB_PORT: 5432
      DB_USER: ${WIKI_DB_USER}
      DB_PASS: ${WIKI_DB_PASSWORD}
      DB_NAME: wiki
    restart: unless-stopped
    labels:
      # Ajout dans traefik
      - "traefik.enable=true"

      # HTTP
      - "traefik.http.routers.wiki.rule=Host(`wiki.domain.tld`)"
      - "traefik.http.routers.wiki.entrypoints=http"

      # HTTPS
      - "traefik.http.routers.wiki-secure.service=wiki-secure"
      - "traefik.http.routers.wiki-secure.rule=Host(`wiki.domain.tld`)"
      - "traefik.http.routers.wiki-secure.entrypoints=https"
      - "traefik.http.routers.wiki-secure.tls=true"

      # Port interne
      - "traefik.http.services.wiki-secure.loadbalancer.server.port=3000"
    profiles:
      - freelance
      - devops
    networks:
      local_dev:
        aliases:
          - wiki.domain.tld

networks:
  local_dev:
    external: true
```

##### Explications

::tool-table
| Paramètre | Rôle |
|-----------|------|
| `DB_TYPE: postgres` | Wiki.js supporte aussi MySQL, MariaDB et SQLite — on reste cohérent avec le reste de la stack |
| `DB_HOST: postgresql` | Pointe vers l'instance PostgreSQL partagée, résolue via le réseau Docker interne |
| `DB_USER` / `DB_PASS` | Identifiants du compte dédié à la base `wiki` — voir la section suivante |
| `depends_on: postgresql` | Attend que le conteneur PostgreSQL démarre — sans garantir qu'il soit prêt à accepter des connexions, voir la note ci-dessous |
| `profiles` | Activé uniquement dans les contextes `freelance` et `devops`, comme les autres outils de documentation et de gestion |
::

######

> ⚠️ `depends_on` sans `condition: service_healthy` garantit seulement que le conteneur PostgreSQL a *démarré*, pas qu'il *accepte déjà des connexions*. Si Wiki.js échoue au premier lancement avec une erreur de connexion à la base, relancez simplement `docker compose up -d wiki` quelques secondes après — le temps que PostgreSQL termine son initialisation.

[Github](https://github.com/requarks/wiki){:target="_blank"} · [Documentation officielle](https://docs.requarks.io){:target="_blank"}

```bash [.env]
WIKI_HOST=wiki.domain.tld
WIKI_DB_USER=wiki
WIKI_DB_PASSWORD=superSecretPwd
```

#### 🗄️ Créer la base de données

Comme pour les autres services de la stack, on réutilise l'instance PostgreSQL partagée plutôt que d'en déployer une dédiée :

```bash
docker compose exec postgresql psql -U postgres
CREATE USER wiki WITH PASSWORD 'votre_mot_de_passe';
CREATE DATABASE wiki OWNER wiki;
GRANT ALL PRIVILEGES ON DATABASE wiki TO wiki;
\q
```

> 💡 Contrairement à WhoDB, Wiki.js a besoin d'un compte avec des droits complets sur sa base : il crée et modifie lui-même son schéma au démarrage et à chaque mise à jour majeure. Un compte en lecture seule ne fonctionnera pas ici.

#### 🚀 Premier démarrage

```bash
docker compose up -d wiki
```

Rendez-vous sur `https://wiki.domain.tld`. Wiki.js affiche un assistant de configuration à la première ouverture : langue, création du compte administrateur, puis titre du site.

![Wiki.js - Setup](/img/content/wikijs-setup.png)

Une fois connecté, créez votre première page depuis le bouton **+ New page**, choisissez l'éditeur (Markdown ou Visuel), et c'est parti.

![Wiki.js - Editor](/img/content/wikijs-editor.png)

#### 🔐 Configurer l'authentification

Par défaut, Wiki.js crée des comptes locaux (email + mot de passe). Pour une équipe, il est souvent plus pratique de brancher un fournisseur existant plutôt que de gérer une liste d'utilisateurs en plus.

Dans **Administration** → **Login** :

- Activez le fournisseur souhaité (Google, GitHub, LDAP…)
- Renseignez les identifiants applicatifs (client ID / secret pour un OAuth2, ou les paramètres du serveur pour un LDAP)
- Optionnel : désactivez l'inscription locale une fois le fournisseur externe en place, pour éviter d'avoir deux façons différentes de se connecter

> 💡 Si vous utilisez déjà un fournisseur OAuth2/OIDC ailleurs dans votre stack (par exemple pour OpenProject), le réutiliser ici évite de multiplier les comptes et centralise la gestion des accès à un seul endroit.

#### 🗂️ Structure des fichiers

```
.
├── docker-compose.yml
└── .env
```

> 💡 Dans cette configuration, Wiki.js n'utilise pas de volume Docker dédié. Le contenu et la configuration persistante sont stockés dans PostgreSQL. La stratégie de sauvegarde doit donc couvrir la base de données et les éventuels services de stockage externes ajoutés ultérieurement.

#### 🔒 Bonnes pratiques de sécurité

- **Ne jamais exposer Wiki.js directement** — toujours derrière Traefik, en HTTPS
- **Créez le compte administrateur immédiatement** au premier démarrage
- **Limitez les permissions par page ou par groupe** si votre wiki mélange contenu public et contenu sensible (identifiants, schémas réseau internes)
- **Activez l'authentification multifacteur** lorsque votre méthode d'authentification le permet, en particulier pour les comptes administrateurs.

#### ✅ Conclusion

OpenProject organise le travail. Wiki.js conserve la connaissance.

Les tâches changent, les tickets se ferment et les projets évoluent. Mais les procédures d'exploitation, les décisions d'architecture et les choix techniques doivent rester accessibles longtemps après la fin d'un sprint.

Avec Wiki.js, cette documentation rejoint le reste de la stack self-hosted : elle reste sous votre contrôle, s'appuie sur l'infrastructure existante et peut évoluer avec vos projets.

Après avoir organisé le code, les pipelines, les projets et les déploiements, l'infrastructure dispose désormais d'un endroit où conserver ce qui permet de comprendre l'ensemble.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::