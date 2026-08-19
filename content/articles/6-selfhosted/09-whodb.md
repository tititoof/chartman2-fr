---
title: "Docker – WhoDB"
description: "Découvrez comment installer et configurer WhoDB avec Docker : explorateur de bases de données léger, multi-SGBD, et requêtes en langage naturel via Ollama."
icon: "i-mdi:database-search"
article_id: "docker-whodb-init"
color: "blue"
draft: false
publishedAt: '2026-08-19'
---
#### 📌 WhoDB ![WhoDB](/img/content/whodb.png){ width=30px }

Adminer accomplit efficacement sa mission depuis plusieurs années, tout en conservant une interface volontairement minimaliste. [WhoDB](https://github.com/clidey/whodb){:target="_blank"} reprend cette simplicité en proposant une interface plus moderne, tout en intégrant une fonctionnalité innovante : la possibilité d’interroger une base de données en langage naturel.

* **Multi-SGBD** : PostgreSQL, MySQL, MariaDB, SQLite, MongoDB, Redis, Elasticsearch, ClickHouse
* **Léger** : moins de 50 Mo, écrit en Go et React, sans dépendance lourde
* **Éditeur visuel** : grille façon tableur pour éditer, filtrer, trier et supprimer des lignes sans écrire de SQL
* **Explorateur de schéma** : visualisation interactive des tables et de leurs relations, sous forme de graphe
* **Requêtes en langage naturel** : posez une question en français ou en anglais, WhoDB génère et exécute la requête SQL correspondante via Ollama, OpenAI ou Anthropic

#####

Dans cette configuration, WhoDB se connecte à la base PostgreSQL déjà partagée par les autres services et utilise l'instance Ollama locale pour l'assistant IA. Les requêtes peuvent ainsi être traitées sans envoyer le schéma ou les données à un fournisseur externe.

<mermaid>
graph TD
  Navigateur["🌍 Navigateur<br/>https://whodb.domain.tld"] -->|HTTPS 443| Traefik["🚦<br/>Traefik"]
  subgraph DH["🐳 Docker Host"]
      subgraph local_dev["🌐 local_dev (Docker network)"]
          Traefik --> WHODB["🔍<br/>WhoDB<br/>:8080"]
          WHODB --> PG["🗄️<br/>PostgreSQL<br/>:5432"]
          WHODB -->|langage naturel → SQL| OLLAMA["🤖<br/>Ollama<br/>:11434"]
      end
  end
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  class Navigateur,DH cluster;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Traefik,WHODB,PG,OLLAMA containerStyle;
</mermaid>

#### ⚙️ docker-compose.yml

```yml [docker-compose.yml]
services:
  whodb:
    image: clidey/whodb
    environment:
      - WHODB_POSTGRES_1={"host":"postgresql","user":"${WHODB_POSTGRES_USER}","password":"${WHODB_POSTGRES_PASSWORD}","database":"postgres"}
      - WHODB_OLLAMA_HOST=ollama
      - WHODB_OLLAMA_PORT=11434
    labels:
      # Ajout dans traefik
      - "traefik.enable=true"

      # HTTP
      - "traefik.http.routers.whodb.rule=Host(`whodb.domain.tld`)"
      - "traefik.http.routers.whodb.entrypoints=http"

      # HTTPS
      - "traefik.http.routers.whodb-secure.service=whodb-secure"
      - "traefik.http.routers.whodb-secure.rule=Host(`whodb.domain.tld`)"
      - "traefik.http.routers.whodb-secure.entrypoints=https"
      - "traefik.http.routers.whodb-secure.tls=true"

      # Port interne
      - "traefik.http.services.whodb-secure.loadbalancer.server.port=8080"
    extra_hosts:
      - host.docker.internal:host-gateway
    profiles:
      - devops
    networks:
      - local_dev

networks:
  local_dev:
    external: true
```

##### Explications

::tool-table
| Paramètre | Rôle |
|-----------|------|
| `WHODB_POSTGRES_1` | Pré-configure une connexion PostgreSQL au démarrage, sous forme de chaîne JSON — évite de ressaisir les identifiants à chaque connexion depuis l'interface |
| `WHODB_OLLAMA_HOST` / `WHODB_OLLAMA_PORT` | Adresse de l'instance Ollama utilisée pour les requêtes en langage naturel |
| `extra_hosts: host.docker.internal:host-gateway` | Ajoute une résolution DNS vers l'hôte Docker — pratique si vous voulez connecter WhoDB à un service qui tourne directement sur la machine plutôt que dans un conteneur (une base SQLite locale, par exemple) |
| `profiles: devops` | WhoDB ne démarre pas avec un simple `docker compose up` — il faut préciser le profil |
::

######

> ⚠️ La variable `WHODB_POSTGRES_1` contient un mot de passe en clair dans votre `docker-compose.yml`. Si ce fichier est versionné, passez plutôt par un `.env` et une interpolation de variables, ou configurez la connexion directement depuis l'interface WhoDB au premier lancement plutôt que par variable d'environnement.

[Github](https://github.com/clidey/whodb){:target="_blank"} · [Documentation officielle](https://docs.whodb.com/introduction){:target="_blank"}

```bash [.env]
WHODB_HOST=whodb.domain.tld
WHODB_POSTGRES_USER=whodb
WHODB_POSTGRES_PASSWORD=superSecretPwd
```

#### 🗄️ Créer un utilisateur PostgreSQL dédié

Comme pour les autres services de la stack, on évite de connecter WhoDB avec le compte PostgreSQL principal. Un compte dédié, en lecture seule, limite les dégâts possibles si jamais l'accès à WhoDB était compromis :

```bash
docker compose exec postgresql psql -U postgres
CREATE USER whodb_reader WITH PASSWORD 'votre_mot_de_passe';
GRANT CONNECT ON DATABASE votre_base TO whodb_reader;
GRANT USAGE ON SCHEMA public TO whodb_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO whodb_reader;
ALTER DEFAULT PRIVILEGES FOR ROLE votre_role_applicatif IN SCHEMA public
GRANT SELECT ON TABLES TO whodb_reader;
\q
```

> 💡 `ALTER DEFAULT PRIVILEGES` ne s'applique qu'aux tables créées **par le rôle précisé dans `FOR ROLE`** — généralement celui utilisé par votre application pour ses migrations. Si vous omettez ce `FOR ROLE` (ou que vous ciblez le mauvais rôle), les tables créées après coup ne seront pas automatiquement visibles par `whodb_reader`, et vous devrez relancer un `GRANT SELECT` manuellement.

> ⚠️ Ce compte en lecture seule désactive l'édition inline vue plus haut — `INSERT`, `UPDATE` et `DELETE` échoueront depuis l'interface. C'est le compromis à faire si WhoDB ne sert qu'à explorer et déboguer, pas à corriger des données à la main. Si vous avez besoin de l'édition, remplacez le dernier `GRANT` par `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO whodb_reader;` — en connaissance de cause.

Utilisez ensuite `whodb_reader` et son mot de passe dans la variable `WHODB_POSTGRES_1` du `docker-compose.yml`, plutôt que le compte principal.


#### 🚀 Premier démarrage

```bash
docker compose --profile devops up -d whodb
```

Rendez-vous sur `https://whodb.domain.tld`. Si vous avez préconfiguré une connexion via `WHODB_POSTGRES_1`, elle apparaît directement dans la liste — sinon, WhoDB propose un formulaire de connexion classique (hôte, port, utilisateur, mot de passe, base).

![WhoDB - Login](/img/content/whodb-login.png)

Une fois connecté, vous accédez à l'explorateur de schéma : chaque table est un nœud, chaque clé étrangère une arête. Cliquez sur une table pour ouvrir sa grille de données, éditable directement dans le navigateur.

![WhoDB - Schema](/img/content/whodb-schema.png)

#### 🤖 Interroger sa base en langage naturel

C'est la fonctionnalité qui distingue WhoDB d'un simple client SQL. Une fois Ollama connecté, un onglet **Chat** apparaît à côté de l'éditeur SQL classique.

##### 1. Vérifier qu'un modèle est disponible sur Ollama

```bash
docker compose exec ollama ollama pull llama3.2
```

> 💡 Pour commencer, llama3.2:3b constitue un bon compromis entre légèreté et capacité à comprendre un schéma relationnel. Sur une machine plus limitée, llama3.2:1b peut suffire pour des requêtes simples.

##### 2. Poser une question

Dans l'onglet Chat, WhoDB lit d'abord le schéma de la base connectée, puis transmet votre question au modèle avec ce contexte. Par exemple :

::tool-table
| Question posée | Requête SQL générée (résumé) |
|-----------------|-------------------------------|
| "Combien de commandes ont été passées ce mois-ci ?" | `SELECT COUNT(*) FROM orders WHERE created_at >= date_trunc('month', now())` |
| "Quels sont les 5 clients avec le plus de commandes ?" | `SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id ORDER BY COUNT(*) DESC LIMIT 5` |
::

Vérifiez toujours la requête générée et le niveau d'autorisation du compte utilisé avant d'autoriser WhoDB à exécuter des opérations d'écriture.

> ⚠️ Un assistant IA capable de générer du SQL ne remplace pas une validation humaine. Pour explorer des données, privilégiez un compte en lecture seule. Utilisez un compte disposant de droits d'écriture uniquement lorsque c'est réellement nécessaire.

#### 🗂️ Structure des fichiers

```
.
├── docker-compose.yml
└── .env
```

> 💡 Dans cette configuration, WhoDB ne nécessite pas de volume persistant pour fonctionner. Les données restent stockées dans les bases auxquelles il se connecte.

#### 🔒 Bonnes pratiques de sécurité

- **Ne jamais exposer WhoDB directement** — toujours derrière Traefik, en HTTPS
- **Évitez les mots de passe en clair** dans le `docker-compose.yml` — préférez un `.env` non versionné ou la saisie manuelle depuis l'interface
- **Limitez les comptes PostgreSQL utilisés** aux permissions strictement nécessaires — un compte en lecture seule suffit si WhoDB ne sert qu'à explorer, pas à éditer
- **Relisez toujours le SQL généré par l'IA** avant une opération d'écriture

#### ⚖️ Comparaison rapide : WhoDB / Adminer / DBeaver

::tool-table
| Outil   | Idéal pour                          |
| ------- | ----------------------------------- |
| Adminer | Administration simple et légère     |
| WhoDB   | Exploration visuelle + assistant IA |
| DBeaver | Développement SQL avancé            |
::


#### ✅ Conclusion

WhoDB ne remplace pas un IDE SQL complet pour les requêtes complexes ou l'administration avancée d'une base. En revanche, pour comprendre rapidement un schéma, vérifier une donnée ou explorer une base sans ouvrir un terminal, il apporte une interface beaucoup plus confortable.

L'ajout d'Ollama ouvre également une autre façon d'interagir avec les données : poser une question, laisser le modèle proposer une requête, puis conserver le contrôle sur son exécution.

Dans cette stack, WhoDB devient donc la porte d'entrée vers les données, comme Portainer l'est pour les conteneurs : une interface légère au-dessus d'une infrastructure qui reste entièrement sous votre contrôle.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::