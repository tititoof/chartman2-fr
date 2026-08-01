---
title: "Docker – Linkwarden"
description: "Découvrez comment installer et configurer Linkwarden avec Docker : gestionnaire de favoris self-hosted, archivage complet des pages et tagging automatique via Ollama."
icon: "i-mdi:docker"
article_id: "docker-linkwarden-init"
color: "blue"
draft: false
publishedAt: '2026-08-01'
---
#### 📌 Linkwarden ![Linkwarden](/img/linkwarden.png){ width=30px }

Combien de favoris dorment dans votre navigateur, jamais retrouvés ? [Linkwarden](https://linkwarden.app){:target="_blank"} est un gestionnaire de favoris open-source et auto-hébergeable qui va bien au-delà du simple marque-page :

* **Archivage complet** : chaque lien sauvegardé conserve une copie de la page (capture d'écran, PDF, HTML), même si le site original disparaît
* **Recherche full-text** : retrouvez un favori par son contenu, pas seulement par son titre
* **Tagging par IA** : un modèle Ollama local lit le contenu de la page et propose des tags automatiquement
* **Collections partageables** : organisez vos favoris en dossiers, seuls ou en équipe
* **Auto-hébergé** : vos favoris et vos archives restent chez vous, sans dépendance à un service tiers

#####

L'objectif n'est plus seulement de mémoriser une URL, mais de conserver durablement l'information qu'elle contient.

Dans cette stack, Linkwarden s'appuie sur PostgreSQL pour la persistance et sur une instance Ollama déjà en place pour générer les tags — sans clé API OpenAI, sans donnée qui sort de votre infrastructure.

<mermaid>
graph TD
  Navigateur["🌍 Navigateur<br/>https://linkwarden.domain.tld"] -->|HTTPS 443| Traefik["🚦<br/>Traefik"]
  subgraph DH["🐳 Docker Host"]
      subgraph local_dev["🌐 local_dev (Docker network)"]
          Traefik --> LW["🔗<br/>Linkwarden<br/>:3000"]
          LW --> PG["🗄️<br/>PostgreSQL<br/>:5432"]
          LW -->|analyse du contenu| OLLAMA["🤖<br/>Ollama<br/>phi3:mini-4k<br/>:11434"]
      end
  end
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  class Navigateur,DH cluster;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Traefik,LW,PG,OLLAMA containerStyle;
</mermaid>

#### ⚙️ docker-compose.yml

On déploie Linkwarden derrière Traefik, connecté à une base PostgreSQL partagée et à une instance Ollama existante :

```yml [docker-compose.yml]
services:
  linkwarden:
    env_file: .env
    environment:
      - DATABASE_URL=postgresql://toofytroll_dev_local:${POSTGRES_PASSWORD}@postgresql:5432/linkwarden
      - NEXT_PUBLIC_OLLAMA_ENDPOINT_URL=http://ollama:11434
      - OLLAMA_MODEL=phi3:mini-4k
    # restart: always
    # build: . # décommentez cette ligne pour builder depuis les sources
    image: ghcr.io/linkwarden/linkwarden:latest # commentez cette ligne pour builder depuis les sources
    ports:
      - 13000:3000
    volumes:
      - ./.docker/linkwarden/data:/data/data
    depends_on:
      - postgresql
    labels:
      # Ajout dans traefik
      - "traefik.enable=true"

      # HTTP
      - "traefik.http.routers.linkwarden.rule=Host(`linkwarden.chartman2-fr.ovh`)"
      - "traefik.http.routers.linkwarden.entrypoints=http"

      # HTTPS
      - "traefik.http.routers.linkwarden-secure.service=linkwarden-secure"
      - "traefik.http.routers.linkwarden-secure.rule=Host(`linkwarden.chartman2-fr.ovh`)"
      - "traefik.http.routers.linkwarden-secure.entrypoints=https"
      - "traefik.http.routers.linkwarden-secure.tls=true"

      # Port interne
      - "traefik.http.services.linkwarden-secure.loadbalancer.server.port=3000"
    profiles:
      - devops
      - freelance
    networks:
      local_dev:
        aliases:
          - linkwarden.chartman2-fr.ovh

networks:
  local_dev:
    external: true
```

##### Explications

::tool-table
| Paramètre | Rôle |
|-----------|------|
| `DATABASE_URL` | Connexion à l'instance PostgreSQL partagée, base dédiée `linkwarden` |
| `NEXT_PUBLIC_OLLAMA_ENDPOINT_URL` | URL interne de votre instance Ollama, utilisée pour le tagging IA |
| `OLLAMA_MODEL` | Modèle utilisé pour analyser le contenu des pages — `phi3:mini-4k` est recommandé par la documentation officielle : léger, suffisant pour cette tâche |
| `volumes: /data/data` | Stockage des archives (captures, PDF, HTML) générées à chaque sauvegarde de lien |
| `profiles` | Permet d'activer Linkwarden uniquement dans certains contextes (`devops`, `freelance`) sans le démarrer par défaut |
::

######

> 💡 Contrairement à un simple gestionnaire de favoris, chaque lien sauvegardé déclenche un archivage complet de la page. Prévoyez de l'espace disque en conséquence si votre bibliothèque grossit.

[Github](https://github.com/linkwarden/linkwarden){:target="_blank"} · [Documentation officielle](https://docs.linkwarden.app){:target="_blank"}

```bash [.env]
POSTGRES_PASSWORD=superSecretPwd
NEXTAUTH_SECRET=un_secret_genere_aleatoirement
NEXTAUTH_URL=https://linkwarden.chartman2-fr.ovh/api/v1/auth
```

> 💡 `NEXTAUTH_SECRET` doit être une chaîne aléatoire suffisamment longue. Générez-la par exemple avec :
> ```bash
> openssl rand -base64 32
> ```

#### 🗄️ Créer la base de données

Comme pour les autres services de la stack, on réutilise l'instance PostgreSQL partagée plutôt que d'en déployer une dédiée :

```bash
docker compose exec postgresql psql -U postgres
CREATE USER toofytroll_dev_local WITH PASSWORD 'votre_mot_de_passe';
CREATE DATABASE linkwarden OWNER toofytroll_dev_local;
GRANT ALL PRIVILEGES ON DATABASE linkwarden TO toofytroll_dev_local;
\q
```

> 💡 Chaque application dispose de son propre compte PostgreSQL afin d'isoler les permissions : un problème de configuration ou une fuite d'identifiants sur Linkwarden ne donne pas accès aux autres bases de la stack.

#### 🚀 Premier démarrage

```bash
docker compose up -d linkwarden
```

Rendez-vous sur `https://linkwarden.domain.tld`. À la première ouverture, créez votre compte administrateur — Linkwarden ne fournit aucun identifiant par défaut.

![Linkwarden - Login](/img/content/linkwarden-login.png)

#### 🤖 Configurer le tagging automatique par Ollama

Linkwarden peut s'appuyer sur plusieurs fournisseurs IA pour générer ses tags (OpenAI, Azure, Anthropic, OpenRouter, Perplexity), essayés dans cet ordre si plusieurs sont configurés. Ici, on reste 100 % local avec Ollama.

##### 1. Vérifier que le modèle est disponible

Sur votre instance Ollama :

```bash
docker compose exec ollama ollama pull phi3:mini-4k
```

> 💡 `phi3:mini-4k` est le modèle recommandé par la documentation officielle de Linkwarden pour cette tâche : suffisamment léger pour tourner sur la majorité des serveurs, tout en restant pertinent pour extraire des mots-clés d'une page web.

##### 2. Déclarer les variables d'environnement

Déjà en place dans notre `docker-compose.yml` :

```yml
environment:
  - NEXT_PUBLIC_OLLAMA_ENDPOINT_URL=http://ollama:11434
  - OLLAMA_MODEL=phi3:mini-4k
```

> 💡 Ces deux variables suffisent à indiquer à Linkwarden où trouver Ollama et quel modèle utiliser. Si plusieurs fournisseurs IA sont configurés en même temps, Linkwarden les essaie dans un ordre de priorité (OpenAI, Azure, Anthropic, puis Ollama) — pour rester 100 % local, ne renseignez que les variables Ollama.

> ⚠️ L'URL doit être joignable **depuis le conteneur Linkwarden**, pas depuis votre navigateur. Si Ollama tourne dans un autre projet Docker Compose, assurez-vous que les deux conteneurs partagent le même réseau (`local_dev` ici) — sinon Linkwarden ne pourra pas résoudre le nom `ollama`.

##### 3. Redémarrer le conteneur

> ⚠️ Une simple modification du `.env` ne suffit pas : Docker Compose ne recrée pas le conteneur avec les nouvelles variables sur un `restart`. Il faut recréer le conteneur :

```bash
docker compose down linkwarden
docker compose up -d linkwarden
```

##### 4. Tester

Sauvegardez un nouveau lien depuis l'interface Linkwarden. Après quelques secondes, les tags générés par le modèle apparaissent automatiquement sur le favori, en fonction du contenu de la page.

Par exemple, un article sur la mise en place de Traefik avec Let's Encrypt donnera typiquement :

::tool-table
| Lien sauvegardé | Tags générés automatiquement |
|------------------|-------------------------------|
| Article sur Traefik + Let's Encrypt | `docker`, `traefik`, `reverse-proxy`, `lets-encrypt`, `devops` |
| Tutoriel PostgreSQL backup | `postgresql`, `backup`, `database`, `self-hosted` |
::

![Linkwarden - Tags](/img/content/linkwarden-tags.png)

> 💡 Si les tags n'apparaissent pas, vérifiez d'abord la connectivité réseau entre les deux conteneurs (`docker compose exec linkwarden curl http://ollama:11434`), avant de suspecter le modèle lui-même.

#### 💾 Attention au volume de stockage

Chaque favori sauvegardé peut générer plusieurs fichiers :

- un fichier **HTML** de la page
- une **capture d'écran**
- un **PDF**

Sur quelques dizaines de liens, ça ne pèse rien. Sur plusieurs milliers, le volume disque peut devenir conséquent — prévoyez de la marge sur votre partition de stockage, ou désactivez certains formats d'archive dans les paramètres si l'espace est limité.

#### 🗂️ Structure des fichiers

```
.
├── docker-compose.yml
├── .env
└── .docker/
     └── linkwarden/
         └── data/          ← archives (captures, PDF, HTML) et données persistantes
```

> 💡 Les archives peuvent représenter un volume de stockage conséquent selon le nombre de liens sauvegardés — pensez à les inclure dans votre stratégie de sauvegarde existante (Postgresus + RustFS par exemple), au même titre que la base PostgreSQL.

#### 🔒 Bonnes pratiques de sécurité

- **Ne jamais exposer Linkwarden directement** — toujours passer par Traefik en HTTPS
- **Générer un `NEXTAUTH_SECRET` fort et unique**, jamais réutilisé d'un projet à l'autre
- **Créer le compte administrateur immédiatement** après le premier démarrage
- **Limiter l'accès réseau d'Ollama** au réseau Docker interne, jamais exposé publiquement
- **Sauvegarder le dossier `data`** avec la même rigueur que la base de données — c'est là que vivent les archives

#### ✅ Conclusion

Un favori n'est utile que tant que la page existe. Une archive reste consultable même quand le site disparaît.

C'est toute la différence entre les favoris d'un navigateur et Linkwarden : les premiers mémorisent une adresse, le second mémorise le contenu. Et grâce au tagging automatique via Ollama, cette archive reste organisée sans effort manuel — le tri qui décourage souvent d'utiliser ce genre d'outil sur la durée.

Combiné à l'instance Ollama déjà présente dans la stack, aucune donnée ne transite par un service tiers : l'analyse du contenu comme l'archivage restent entièrement chez vous.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::