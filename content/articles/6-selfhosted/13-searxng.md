---
title: "Docker – SearXNG"
description: "Découvrez comment installer SearXNG avec Docker derrière Traefik : un métamoteur de recherche auto-hébergé, sans pistage ni profilage, qui sert aussi de recherche web à Open WebUI et Ollama."
icon: "i-mdi:magnify"
article_id: "docker-searxng-init"
color: "orange"
draft: true
publishedAt: '2026-09-29'
---
#### 📌 SearXNG

Chaque recherche sur Google ou Bing alimente un profil publicitaire : vos requêtes, votre IP, vos clics. [SearXNG](https://docs.searxng.org){:target="_blank"} est un **métamoteur de recherche** open-source et auto-hébergeable : il n'indexe pas le web lui-même, il interroge pour vous d'autres moteurs et agrège leurs résultats.

* **Pas de pistage** : aucun cookie de suivi, aucun profil, aucune requête journalisée
* **Anonymisation** : c'est votre serveur qui interroge Google, Bing, DuckDuckGo… pas votre navigateur
* **Plus de 200 moteurs** : web, images, vidéos, actualités, code (GitHub, Stack Overflow), science, cartes…
* **Des « bangs »** : `!gh traefik` pour chercher directement sur GitHub, `!wp` pour Wikipédia
* **Une API JSON** : idéal pour donner un accès au web à un LLM local (Open WebUI, agents n8n…)

Comme les résultats sont agrégés, vous ne dépendez plus d'un seul moteur, et aucun de ces moteurs ne vous voit directement.

Dans cette stack, SearXNG se place derrière Traefik et fonctionne seul, sans base de données. Valkey (le fork open-source de Redis) peut s'y ajouter en option, si vous activez le limiteur anti-bots. Bonus : il devient le moteur de recherche web d'Open WebUI, ce qui permet à Ollama de répondre avec des informations à jour sans passer par une API tierce.

<mermaid>
graph TD
  Navigateur["🌍 Navigateur<br/>https://searxng.chartman2-fr.ovh"] -->|HTTPS 443| Traefik["🚦<br/>Traefik"]
  subgraph DH["🐳 Docker Host"]
      subgraph Net["🌐 projects_local_dev (Docker network)"]
          Traefik --> SX["🔍<br/>SearXNG<br/>:8080"]
          SX -.->|optionnel| VK["🗃️<br/>Valkey<br/>:6379"]
          OW["💬<br/>Open WebUI"] -->|API JSON| SX
      end
  end
  SX -->|requêtes anonymisées| Moteurs["🌐 Google · Bing · DuckDuckGo<br/>Wikipédia · GitHub…"]
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  class Navigateur,DH,Moteurs cluster;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Traefik,SX,VK,OW containerStyle;
</mermaid>

#### ⚙️ docker-compose.yml

```yml [docker-compose.yml]
services:
  searxng:
    image: docker.io/searxng/searxng:latest
    container_name: searxng
    restart: unless-stopped
    env_file: .env
    environment:
      - SEARXNG_BASE_URL=https://searxng.chartman2-fr.ovh/
    volumes:
      - ./.docker/searxng/config:/etc/searxng:rw
      - ./.docker/searxng/cache:/var/cache/searxng:rw
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
    labels:
      # Ajout dans traefik
      - "traefik.enable=true"

      # HTTP → HTTPS
      - "traefik.http.routers.searxng.rule=Host(`searxng.chartman2-fr.ovh`)"
      - "traefik.http.routers.searxng.entrypoints=http"
      - "traefik.http.middlewares.searxng-redirect.redirectscheme.scheme=https"
      - "traefik.http.middlewares.searxng-redirect.redirectscheme.permanent=true"
      - "traefik.http.routers.searxng.middlewares=searxng-redirect"

      # HTTPS
      - "traefik.http.routers.searxng-secure.service=searxng-secure"
      - "traefik.http.routers.searxng-secure.rule=Host(`searxng.chartman2-fr.ovh`)"
      - "traefik.http.routers.searxng-secure.entrypoints=https"
      - "traefik.http.routers.searxng-secure.tls=true"

      # Port interne
      - "traefik.http.services.searxng-secure.loadbalancer.server.port=8080"
    networks:
      - projects_local_dev

networks:
  projects_local_dev:
    external: true
```

##### Explications

::tool-table
| Paramètre | Rôle |
|-----------|------|
| `SEARXNG_BASE_URL` | URL publique de l'instance, utilisée pour générer les liens (OpenSearch, proxy d'images…) |
| `/etc/searxng` | Dossier de configuration : c'est là que vit `settings.yml` |
| `/var/cache/searxng` | Cache local (favicons, etc.) |
| `cap_drop` / `cap_add` | On retire toutes les capacités Linux et on ne rend que le strict nécessaire, comme dans le compose officiel |
| Pas de `ports:` | SearXNG n'est accessible que via Traefik, jamais directement |
::

```bash [.env]
SEARXNG_SECRET=une_chaine_aleatoire_longue
```

> 💡 `SEARXNG_SECRET` remplace la valeur `secret_key` du `settings.yml`. Générez-la avec :
> ```bash
> openssl rand -hex 32
> ```

#### 🛠️ Le fichier settings.yml

Au premier démarrage, SearXNG génère un `settings.yml` complet (et très long) dans `.docker/searxng/config/`. Plutôt que de maintenir ce fichier entier, on part des valeurs par défaut et on ne surcharge que ce qui nous intéresse :

```yml [.docker/searxng/config/settings.yml]
use_default_settings: true

general:
  instance_name: "Recherche chartman2"

server:
  # remplacé par SEARXNG_SECRET, mais la clé doit exister
  secret_key: "changeme"
  limiter: false
  image_proxy: true

search:
  safe_search: 0
  autocomplete: "duckduckgo"
  default_lang: "fr-FR"
  formats:
    - html
    - json

ui:
  default_theme: simple
  theme_args:
    simple_style: auto

engines:
  # moteurs du réseau Tor : inutilisables sans proxy Tor
  - name: ahmia
    disabled: true
  - name: torch
    disabled: true
```

::tool-table
| Clé | Rôle |
|-----|------|
| `use_default_settings: true` | Hérite de toute la configuration officielle, on ne décrit que les différences |
| `limiter: false` | Le limiteur anti-bots est utile pour une instance **publique**. Pour une instance privée, il bloque surtout… vous-même et Open WebUI |
| `image_proxy: true` | Les images des résultats passent par votre serveur : les sites d'origine ne voient pas votre IP |
| `formats: [html, json]` | **Indispensable** pour l'API : sans `json`, Open WebUI reçoit une erreur `403 Forbidden` |
| `engines` | Désactive `ahmia` et `torch`, deux moteurs Tor qui échouent au démarrage (`can't register engine`) sans proxy Tor |
::

#### 🚀 Premier démarrage

```bash
mkdir -p .docker/searxng/{config,cache}
# placer le settings.yml ci-dessus dans .docker/searxng/config/
docker compose up -d searxng
docker compose logs -f searxng
```

Rendez-vous sur `https://searxng.chartman2-fr.ovh` : la page de recherche s'affiche directement, sans compte à créer.

> 💡 Au démarrage, l'avertissement `missing config file: /etc/searxng/limiter.toml` est normal : ce fichier ne sert qu'au limiteur anti-bots, désactivé ici.

#### 🗃️ Optionnel : ajouter Valkey

Pour une instance privée, SearXNG n'a besoin de rien d'autre. Valkey devient utile si vous ouvrez l'instance à d'autres personnes : il stocke l'état du **limiteur anti-bots** (`limiter: true`), qui compte les requêtes par IP et bloque les abus.

Ajoutez le service au `docker-compose.yml` :

```yml [docker-compose.yml]
  valkey-searxng:
    image: docker.io/valkey/valkey:8-alpine
    container_name: searxng_valkey
    restart: unless-stopped
    command: valkey-server --save 30 1 --loglevel warning
    volumes:
      - ./.docker/searxng/valkey:/data
    cap_drop:
      - ALL
    cap_add:
      - SETGID
      - SETUID
      - DAC_OVERRIDE
    networks:
      - projects_local_dev
```

Ajoutez `depends_on: [valkey-searxng]` au service `searxng`, puis complétez le `settings.yml` :

```yml [.docker/searxng/config/settings.yml]
server:
  limiter: true

valkey:
  url: valkey://valkey-searxng:6379/0
```

> ⚠️ Sur les versions antérieures à 2025, la section s'appelait `redis:` (avec `url: redis://…`). Si SearXNG ignore votre configuration, vérifiez le nom de la clé dans la documentation de la version que vous utilisez.

> ⚠️ Avec le limiteur actif, SearXNG identifie les clients grâce aux en-têtes `X-Forwarded-For` / `X-Real-IP` ajoutés par Traefik. Une requête qui arrive sans ces en-têtes, par exemple Open WebUI qui appelle `http://searxng:8080` en direct, déclenche l'erreur `X-Forwarded-For nor X-Real-IP header is set!` et peut être bloquée. Déclarez alors les réseaux de confiance dans `limiter.toml` (voir la [documentation du limiteur](https://docs.searxng.org/admin/searx.limiter.html){:target="_blank"}).

<!-- TODO capture : page d'accueil SearXNG → /img/content/searxng-home.png -->

#### 🔎 Comment s'en servir au quotidien

##### 1. En faire le moteur par défaut du navigateur

SearXNG expose un fichier **OpenSearch** : dans Firefox, faites un clic droit dans la barre d'adresse sur la page SearXNG, puis « Ajouter SearXNG ». Dans Chrome, Chromium ou Brave, ajoutez un moteur personnalisé dans *Paramètres → Moteur de recherche* avec l'URL :

```
https://searxng.chartman2-fr.ovh/search?q=%s
```

##### 2. Utiliser les bangs et les catégories

Les « bangs » permettent de cibler un moteur ou une catégorie directement depuis la requête :

::tool-table
| Requête | Effet |
|---------|-------|
| `!gh traefik middleware` | Recherche uniquement sur GitHub |
| `!wp souveraineté numérique` | Recherche sur Wikipédia |
| `!ddg docker compose` | Recherche uniquement via DuckDuckGo |
| `!images tux` | Catégorie images |
| `!news ollama` | Catégorie actualités |
| `:en rails 8 solid queue` | Force la langue des résultats |
::

> 💡 La liste complète des bangs et moteurs est visible dans *Préférences → Moteurs* de votre instance. Vous pouvez aussi y désactiver les moteurs que vous ne voulez pas interroger.

##### 3. Personnaliser sans compte

Les préférences (langue, thème, moteurs activés, ouverture des liens dans un nouvel onglet…) sont stockées dans un **cookie**, pas sur le serveur. SearXNG ne garde rien sur vous — y compris vos préférences.

<!-- TODO capture : page de préférences → /img/content/searxng-preferences.png -->

#### 🤖 Donner accès au web à Open WebUI

C'est là que SearXNG prend tout son sens dans la stack. Avec l'instance [Ollama + Open WebUI](/blog/article/ollama-openwebui-self-hosted) déjà en place, un modèle local ne connaît que ce qu'il a appris jusqu'à sa date d'entraînement. En branchant SearXNG, Open WebUI peut lancer une recherche, récupérer les pages et les fournir au modèle comme contexte.

Dans Open WebUI : *Panneau d'administration → Paramètres → Recherche Web* :

::tool-table
| Champ | Valeur |
|-------|--------|
| Activer la recherche web | ✅ |
| Moteur de recherche web | `searxng` |
| URL de requête SearXNG | `http://searxng:8080/search?q=<query>` |
::

> ⚠️ On utilise l'URL **interne** (`http://searxng:8080`), joignable depuis le conteneur Open WebUI parce qu'ils partagent le réseau `projects_local_dev`. Passer par l'URL publique ferait un aller-retour inutile par Traefik.

Il suffit ensuite d'activer l'option « Recherche web » dans une conversation pour que la réponse s'appuie sur des résultats récents, avec les sources citées.

Pour vérifier que l'API répond bien au format attendu :

```bash
docker exec project-open-webui curl -s "http://searxng:8080/search?q=traefik&format=json" | head -c 300
```

> 💡 Même principe pour n8n : un nœud *HTTP Request* vers `http://searxng:8080/search?q=...&format=json` donne à vos workflows une recherche web gratuite, sans clé d'API.

<!-- TODO capture : réponse Open WebUI avec sources SearXNG → /img/content/searxng-openwebui.png -->

#### 🗂️ Structure des fichiers

```
.
├── docker-compose.yml
├── .env
└── .docker/
     └── searxng/
         ├── config/
         │   └── settings.yml   ← configuration (surcharges uniquement)
         ├── cache/             ← cache local
         └── valkey/            ← données Valkey (seulement si activé)
```

> 💡 Seul `settings.yml` mérite vraiment d'être sauvegardé : le cache (et Valkey, s'il est utilisé) se reconstruit tout seul.

#### 🔒 Bonnes pratiques de sécurité

- **Garder l'instance privée** : une instance publique attire vite les bots, et les moteurs (Google en tête) finissent par bloquer l'IP de votre serveur. Si vous l'ouvrez, ajoutez Valkey, réactivez `limiter: true` et configurez les proxys de confiance
- **Restreindre l'accès** au réseau local avec le middleware Traefik `ipAllowList` (ou `basicAuth`), détaillé dans l'article [Traefik : restreindre l'accès avec les middlewares](/blog/article/15-docker-traefik-middlewares) :
  ```yml
  # 172.26.0.1 = passerelle du réseau Docker, nécessaire pour l'accès depuis la machine hôte
  - "traefik.http.middlewares.searxng-lan.ipallowlist.sourcerange=192.168.1.0/24,172.26.0.1/32"
  # filtre IP d'abord, puis redirection HTTPS
  - "traefik.http.routers.searxng.middlewares=searxng-lan,searxng-redirect"
  - "traefik.http.routers.searxng-secure.middlewares=searxng-lan"
  ```
  La passerelle varie d'une installation à l'autre : l'article Traefik explique comment la retrouver, et pourquoi elle est nécessaire.
- **Si vous utilisez Valkey, ne jamais l'exposer** : aucun `ports:`, uniquement le réseau Docker interne
- **Générer un `SEARXNG_SECRET` fort et unique**
- **Mettre à jour régulièrement l'image** : les moteurs changent souvent leurs pages, et les correctifs des « scrapers » arrivent via les nouvelles versions

```bash
docker compose pull searxng && docker compose up -d searxng
```

#### ✅ Conclusion

SearXNG ne remplace pas Google : il s'intercale entre vous et lui. Vous gardez la qualité des grands moteurs, sans leur livrer votre historique de recherche.

Et dans une stack déjà tournée vers l'IA locale, il comble le dernier manque d'Ollama : l'accès à une information à jour. Recherche comme génération restent chez vous, sans clé d'API ni service tiers.

[Github](https://github.com/searxng/searxng){:target="_blank"} · [Documentation officielle](https://docs.searxng.org){:target="_blank"} · [Dépôt searxng-docker](https://github.com/searxng/searxng-docker){:target="_blank"}

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
