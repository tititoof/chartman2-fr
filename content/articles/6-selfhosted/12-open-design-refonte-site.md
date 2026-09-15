---
title: 'Open Design — retravailler ce site avec une IA de conception'
description: "Suite de l'article MCP sur mon homelab : j'ai branché Open Design, un MCP auto-hébergé de conception visuelle, pour retravailler le design de ce site. Ce que ça a vraiment donné — bugs de config compris."
icon: 'i-mdi:palette-swatch-outline'
article_id: 'open-design-refonte-site'
color: 'pink'
draft: false
publishedAt: '2026-09-15'
---

#### 🎨 La suite promise

Dans [l'article précédent](/blog/article/mcp-infra-etat-des-lieux){:target="_blank"}, je terminais sur une
teaser : un MCP auto-hébergé de conception visuelle, **Open Design**, tout juste
branché sur mon poste de dev, pas encore assez éprouvé pour en parler sérieusement.

Depuis, je m'en suis servi pour de vrai — retravailler le design de ce site même, du
premier brief jusqu'aux boutons survolés en production. Voici ce que ça donne, avec
les vrais bugs rencontrés en chemin.

#### 🎯 Ce que je voulais obtenir

Avant de brancher quoi que ce soit, le cahier des charges tenait en quelques
lignes :

- partir du design existant du site, pas d'une page blanche ;
- formaliser les couleurs et les tokens plutôt que les garder à l'œil dans ma tête ;
- prendre en compte le light **et** le dark dès le départ, pas en rattrapage ;
- produire un design system réellement exploitable dans `vuetify.config.ts` ;
- appliquer les changements progressivement, vérifiés un par un ;
- garder le développeur dans la boucle — pas de « génère-moi le site », mais un
  outil qui structure le travail sans le remplacer.

La suite de l'article, c'est essentiellement la confrontation de ce cahier des
charges au réel.

#### 🧱 Installer Open Design et le connecter à Claude Code

Avant de parler design, il fallait installer le service. Il vit dans le
`docker-compose.yml` de mon infra comme n'importe quel autre conteneur du
homelab, derrière Traefik.

##### ⚙️ Prérequis

::tool-table
| Service | Rôle | Article |
|---------|------|---------|
| Traefik | Reverse proxy + TLS | [Article 3](/blog/article/3-docker-traefik-introduction){:target="_blank"} |
| Réseau `projects_local_dev` | Réseau partagé | [Article 2](/blog/article/2-docker-compose-description){:target="_blank"} |
::

##### 1. Créer `.env`

```bash [.env]
# Domaine public (derrière Traefik)
OPEN_DESIGN_DOMAIN=opendesign.domain.tld

# Token d'API — à générer soi-même (ex : openssl rand -hex 32), jamais commité
OD_API_TOKEN=changez_moi_openssl_rand_hex_32

# Mémoire Node allouée au daemon (optionnel)
NODE_OPTIONS=--max-old-space-size=192
```

##### 2. Créer `docker-compose.yml`

```yaml [docker-compose.yml]
services:
  open-design:
    build:
      context: ./
      dockerfile: Dockerfile.open-design
    restart: unless-stopped
    volumes:
      - open_design_data:/data
      - ./.docker/open-design/claude-home:/home/open-design
      - ./Perso:/workspace/Perso
    environment:
      NODE_OPTIONS: ${NODE_OPTIONS:---max-old-space-size=192}
      OD_BIND_HOST: 0.0.0.0
      OD_API_TOKEN: "${OD_API_TOKEN}"
      OD_ALLOWED_ORIGINS: "https://${OPEN_DESIGN_DOMAIN}"
      OD_DATA_DIR: /data
    labels:
      - "traefik.enable=true"
      - "traefik.http.middlewares.open-design-auth.headers.customrequestheaders.Authorization=Bearer ${OD_API_TOKEN}"
      - "traefik.http.routers.open-design-secure.service=open-design-secure"
      - "traefik.http.routers.open-design-secure.rule=Host(`${OPEN_DESIGN_DOMAIN}`)"
      - "traefik.http.routers.open-design-secure.entrypoints=https"
      - "traefik.http.routers.open-design-secure.tls=true"
      - "traefik.http.routers.open-design-secure.middlewares=open-design-auth"
      - "traefik.http.services.open-design-secure.loadbalancer.server.port=7456"
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://127.0.0.1:7456/api/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
    networks:
      local_dev:
        aliases:
          - ${OPEN_DESIGN_DOMAIN}

volumes:
  open_design_data:

networks:
  local_dev:
    name: projects_local_dev
    external: true
```

Rien d'exotique côté volumes : un volume pour les données persistantes du daemon
(`/data`) et un bind-mount de mon dossier `Perso` en tant qu'espace de travail
(`/workspace/Perso`, là où vivent les vrais projets à analyser).

##### Traefik ouvre la porte, sans jamais laisser le token passer par le navigateur

Le daemon est pensé pour tourner en local sur un poste de dev : il ne dispense
de bearer token que pour les appels venant littéralement de `127.0.0.1`. Tant
que je restais sur la machine qui héberge le conteneur, pas besoin de token du
tout. Mais je voulais aussi pouvoir ouvrir l'UI depuis n'importe quel appareil,
via un domaine public (`${OPEN_DESIGN_DOMAIN}`) — et dès que Traefik
reverse-proxifie cette UI, la requête n'arrive plus depuis `127.0.0.1` du point
de vue du conteneur. Sans rien de plus, chaque appel `/api/*` prend un `401`.

La solution est dans les labels Traefik eux-mêmes : un middleware qui injecte
l'en-tête `Authorization` sur chaque requête, avant qu'elle n'atteigne le
conteneur —

```yaml
labels:
  - "traefik.http.middlewares.open-design-auth.headers.customrequestheaders.Authorization=Bearer ${OD_API_TOKEN}"
  - "traefik.http.routers.open-design-secure.middlewares=open-design-auth"
```

Le navigateur n'a donc jamais besoin de connaître le token lui-même — il n'a
d'ailleurs aucun moyen de l'envoyer, l'UI web n'expose pas de champ pour ça. Le
token reste côté infrastructure, injecté par Traefik dans chaque requête qui
franchit le reverse-proxy vers le daemon.

> ⚠️ Nuance importante : ce n'est pas une authentification d'utilisateur.
> Quiconque atteint `${OPEN_DESIGN_DOMAIN}` à travers Traefik hérite du token
> sur ses appels `/api/*`. Il protège le daemon contre un accès direct qui
> contournerait Traefik — pas contre un visiteur non authentifié qui passerait
> par le domaine public lui-même.

##### 3. Démarrer

```bash
echo ".env" >> .gitignore

mkdir -p .docker/open-design/claude-home

docker compose up -d open-design
docker compose logs -f open-design
```

Une fois `healthy`, le service est accessible sur `https://${OPEN_DESIGN_DOMAIN}` —
avec le bearer token injecté par Traefik, sans rien à saisir côté navigateur.

##### 4. Connecter Claude Code sans exposer de clé supplémentaire

Restait le point qui m'intéressait le plus : brancher Open Design sur Claude
Code **sans avoir à lui fournir de clé API supplémentaire** — pas de clé
Anthropic en jeu ici, juste éviter d'en ajouter une de plus.

C'est ce même daemon, et lui seul, qui détient les identifiants tiers — pour la
génération d'images (`imagegen`) par exemple. La connexion à Claude Code, elle,
passe uniquement par un petit proxy MCP en ligne de commande, exécuté dans le
conteneur :

```bash
docker exec -i projects-open-design-1 node /app/apps/daemon/dist/cli.js mcp \
  --daemon-url http://127.0.0.1:7456
```

Ce process ne parle que stdio en JSON-RPC (le protocole MCP) : il relaie les appels
de Claude Code vers le daemon en HTTP local. Aucune clé Anthropic, aucun compte
Claude à renseigner à cet endroit — Claude Code utilise ici Open Design comme
serveur MCP, au même titre qu'un autre serveur MCP configuré dans son
environnement.

<mermaid>
graph LR
  CC["🤖 Claude Code\n(client MCP)"]
  subgraph Local["💻 Poste de dev"]
    Proxy["od mcp\n(proxy stdio, dans le conteneur)"]
    Daemon["Open Design daemon\nHTTP 127.0.0.1:7456"]
    Files["📁 Projets\n(tokens, composants, aperçus)"]
  end
  API["☁️ API OpenAI Images\n(imagegen, optionnel)"]
  CC -->|stdio JSON-RPC, pas de clé Claude| Proxy
  Proxy -->|HTTP local| Daemon
  Daemon --> Files
  Daemon -.->|clé API interne au daemon, pas à Claude| API
  classDef clientStyle fill:#85cfff,stroke:#00344c,stroke-width:2px;
  classDef daemonStyle fill:#ffd8c7,stroke:#7f0e00,stroke-width:1.5px;
  classDef apiStyle fill:#ddd,stroke:#555,stroke-width:1.5px,stroke-dasharray: 5 5;
  class CC clientStyle;
  class Proxy,Daemon,Files daemonStyle;
  class API apiStyle;
</mermaid>

Le CLI d'Open Design propose même un enregistrement automatique dans la config de
l'agent, `claude` étant listé nommément parmi les cibles supportées :

```
od mcp install <agent> [--uninstall] [--print] [--json] [--daemon-url <url>]
Agents: claude codex reasonix raven cursor copilot openclaw antigravity pi vibe
        hermes cline kimi kiro trae opencode claude-desktop
```

Une fois l'entrée ajoutée dans `~/.claude.json` (ou le `.mcp.json` du projet), un
simple `/mcp` dans Claude Code suffit à établir la connexion. C'est cette même
commande qui m'a servi, plus loin, à diagnostiquer le bug suivant.

#### 🔌 Une config MCP cassée

Premier obstacle, avant même de voir un seul token de couleur : le serveur ne se
connectait pas. `/mcp` annonçait `CONNECTION_CLOSED`, sans plus de détails.

Le conteneur `open-design` tournait pourtant, `healthy` sur Docker. J'ai testé la
commande MCP exacte configurée à la main, directement dans le conteneur :

```bash
docker exec projects-open-design-1 node /app/apps/daemon/dist/cli.js mcp \
  --daemon-url http://127.0.0.1:7456 \
  --scope user
# → unknown flag: --scope. Run with --help for the list of accepted flags.
```

Le binaire plantait sur un flag qui n'existe pas. Ce `--scope user` avait été ajouté
dans la config MCP **spécifique à ce projet** (dans `~/.claude.json`), en plus de la
config globale qui n'avait pas ce flag et fonctionnait très bien. Reste à savoir
comment il est arrivé là — mais le correctif était immédiat : le retirer.

```json
{
  "command": "docker",
  "args": [
    "exec", "-i", "projects-open-design-1", "node",
    "/app/apps/daemon/dist/cli.js", "mcp",
    "--daemon-url", "http://127.0.0.1:7456"
  ]
}
```

**Leçon retenue** : un `CONNECTION_CLOSED` MCP ne veut pas forcément dire que le
service est en panne. Avant de creuser côté serveur, je rejoue la commande exacte de
la config en dehors du client MCP — souvent le process meurt en une fraction de
seconde à cause d'un argument invalide, jamais du réseau.

#### 🧬 Extraire un vrai design system, pas une maquette

Une fois connecté, Open Design expose des outils pour parcourir des « projets » de
design — chacun avec des fichiers source (CSS, tokens, aperçus HTML). Le mien avait
été généré à partir d'un simple `DESIGN.md` collé, sans jamais avoir vu le vrai code
du site.

Résultat : une palette Material Design 3 générique, correcte sur le papier, mais sans
lien réel avec les vraies valeurs de mon `vuetify.config.ts`. Première étape, donc :
lui donner le vrai code.

##### Les couleurs, mesurées, pas inventées

Le point le plus intéressant du brief généré : l'accent secondaire, que j'ai appelé
« Ginger » en référence à mon chat 🐈 **Weasley**. Plutôt que de garder le doré généré par
défaut, je suis parti de la vraie couleur orange de mon logo « CH2 », affinée vers un
terracotta plus soutenu :

::tool-table
| Rôle | Clair | Sombre | Origine |
|------|-------|--------|---------|
| `primary` (accent) | `#00658e` | `#85cfff` | Valeur mesurée dans `vuetify.config.ts` |
| `secondary` (Ginger) | `#bd4500` | `#ff781b` | Logo + terracotta (🐈 **Weasley**, mon chat) |
| `background` | `#c7e7ff` | `#001f25` | Décision produit, ajustée en cours de route |
| `muted` / `border` | `#566670` / `#d4dce2` | `#91a8b8` / `#243541` | Dérivées de la teinte de l'accent |
::

Le brief a ensuite servi de référence pendant toute la refonte — mais pas comme une
vérité figée : quand j'ai demandé de pousser l'orange un peu plus (directement dans
l'app Open Design, hors de cette session), le fichier de tokens a changé tout seul.
Je l'ai découvert en re-synchronisant : le `secondary` mesuré n'était plus le même
qu'au début de la session. Bon réflexe à prendre : **relire le design system avant
de l'appliquer**, jamais faire confiance à un cache mental de sa dernière valeur.

##### Donner le vrai code, pas une description

Le kit généré signalait lui-même sa limite dans son propre README : *« no captured
app/component snapshot »* — il n'avait jamais vu mes vrais composants Vue. J'ai donc
poussé les 46 fichiers réels du site (pages, layout, composants) dans le projet Open
Design, un par un, avec le même chemin que dans le repo.

C'est là qu'est apparu le seul vrai frein rencontré côté outillage : passé une
douzaine d'écritures d'affilée vers ce service externe, le classifieur de sécurité de
l'agent a bloqué l'action avec la raison `Data Exfiltration` — le motif ressemblait à
un envoi en masse de code source vers un tiers, même si ce tiers tournait en local
sur ma propre machine. Pas de contournement : reprise fichier par fichier, avec
confirmation utilisateur à chaque blocage. Un bon rappel que ces garde-fous
regardent le *pattern* d'une action, pas son contexte — et que c'est plutôt
rassurant que le garde-fou existe, même quand il me ralentit sur un cas légitime.

#### 🖌️ Appliquer le design, étape par étape

Pas de « tout d'un coup ». Chaque changement a été vérifié visuellement (capture
Chrome, light **et** dark) avant de passer au suivant : couleurs des cards, boutons,
barre de navigation, typographie, pages secondaires.

Le point le plus instructif : plusieurs fois, un changement qui semblait correct sur
le papier s'est révélé invisible à l'écran, parce que deux tokens se sont retrouvés
avec **exactement** la même valeur.

```
Fond de card = secondary-container = #c7e7ff
Fond de page = background          = #c7e7ff   ← identique !
```

Le survol d'un bouton de menu était bien fonctionnel — confirmé en JS, la couleur du
texte passait bien de `muted` à `primary` — mais le fond de survol restait invisible
puisqu'il retombait sur la même teinte que le fond ambiant. Dans ce genre de cas, un
screenshot ne suffit pas à trancher : j'ai fini par échantillonner les pixels
directement (`PIL.Image.getpixel`) pour départager « c'est cassé » de « c'est juste
subtil ».

```python
from PIL import Image
img = Image.open('screenshot.png')
img.getpixel((1050, 87))  # (199, 231, 255) des deux côtés → pas de survol visible
```

Autre correctif utile pour la suite : le texte au survol des boutons était codé en
noir en dur (`#000`). Ça se lisait bien en thème clair, mais perdait du contraste en
sombre. Le bon réflexe Vuetify : utiliser le token sémantique associé, pas une valeur
absolue —

```css
/* avant */
.btn-lire:hover { color: #000 !important; }

/* après — s'adapte au thème automatiquement */
.btn-lire:hover { color: rgb(var(--v-theme-on-primary)) !important; }
```

`on-primary` vaut blanc en clair (le bleu accent y est assez soutenu) et bleu marine
foncé en sombre (l'accent y devient un pastel clair) — exactement la paire de
contraste pensée pour ce rôle, plutôt qu'une couleur choisie à l'œil sur un seul
thème.

#### 🖼️ Le résultat

**Avant / Après**

![Le site avant la refonte](/img/content/open-design-before.png){ width=100% }
![Le site après la refonte](/img/content/open-design-after.png){ width=100% }

**Light / Dark**

![Version claire du site refondu](/img/content/open-design-light.png){ width=100% }
![Version sombre du site refondu](/img/content/open-design-dark.png){ width=100% }

#### 🧰 Pour aller plus loin : automatiser l'import

Tout ce qui précède est passé par l'UI d'Open Design — un projet créé à la
main, puis les fichiers poussés un par un. Il existe pourtant un raccourci :
l'API expose un endpoint d'import de dossier, pilotable en une seule commande,
sans jamais ouvrir de navigateur.

```bash [od-import.sh]
#!/usr/bin/env bash
#
# od-import.sh — importe un dossier local comme projet Open Design,
# sans passer par l'UI (headless-friendly).
#
# Usage :
#   ./od-import.sh todo-list/todo-frontend
#   ./od-import.sh /workspace/Perso/todo-list/todo-frontend   (chemin conteneur direct)
#
# Le script part du principe que ./Perso est monté dans le conteneur
# open-design sur /workspace/Perso (voir docker-compose.yml).

set -euo pipefail

COMPOSE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${COMPOSE_DIR}/.env"
OD_URL="https://${OPEN_DESIGN_DOMAIN}"
CONTAINER_MOUNT_PREFIX="/workspace/Perso"
HOST_MOUNT_PREFIX="Perso"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <sous-chemin-sous-Perso ou chemin-conteneur-complet>" >&2
  exit 1
fi

OD_API_TOKEN="$(grep '^OD_API_TOKEN=' "$ENV_FILE" | sed 's/^OD_API_TOKEN=//')"

INPUT_PATH="$1"
CONTAINER_PATH="${CONTAINER_MOUNT_PREFIX}/${INPUT_PATH#/}"

curl -s -X POST "${OD_URL}/api/import/folder" \
  -H "Authorization: Bearer ${OD_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"baseDir\": \"${CONTAINER_PATH}\"}"
```

Un `POST /api/import/folder` avec le chemin **côté conteneur** (celui monté sur
`/workspace/Perso`, pas le chemin hôte) suffit à créer le projet — le token
vient du même `.env` que le `docker-compose.yml`, jamais saisi à la main.

Je l'ai écrit avant de me lancer, prêt à l'emploi — puis je ne m'en suis
finalement pas servi : le projet existait déjà, généré depuis un `DESIGN.md`
collé directement dans l'UI (voir plus haut). Il reste au tiroir pour la
prochaine refonte, ou pour scripter la création d'un projet Open Design à
chaque nouveau repo du homelab, sans passer par le navigateur.

#### ✅ Ce que j'en retiens

Open Design n'a pas fait la refonte à ma place — il a fourni un point de départ
structuré (tokens de couleur, échelle typographique, principes de layout) que j'ai
ensuite dû confronter au vrai rendu, thème par thème, pixel par pixel par moments.
La vraie valeur n'était pas dans la génération automatique, mais dans le fait
d'avoir un référentiel écrit et cohérent à appliquer — et à corriger quand deux
sessions de travail divergeaient sur une même couleur.

L'IA m'a fait gagner du temps pour explorer et structurer le design. Elle ne
m'a pas dispensé de vérifier ce qu'elle produisait. Le vrai gain n'est pas de
lui demander de concevoir à ma place, mais de transformer rapidement une
intention en système concret, puis de confronter ce système au code et au
rendu réel.

Ce que je retiens à mettre en place ensuite : un vrai export continu (le design
system pourrait pousser ses changements de tokens directement dans le repo au lieu
d'être re-synchronisé à la main), et probablement resynchroniser Open Design avec les
vrais composants Vue à chaque itération importante, pas seulement au démarrage.

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
