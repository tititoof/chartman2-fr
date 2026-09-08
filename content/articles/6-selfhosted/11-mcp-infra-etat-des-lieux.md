---
title: 'MCP — état des lieux de mon homelab'
description: "Plusieurs semaines après avoir branché Ollama sur ma stack DevOps via MCP, voici ce qui tourne réellement : qui héberge quoi, comment chaque outil gère MCP différemment, et ce que j'ai découvert en l'auditant."
icon: 'i-mdi:robot-industrial-outline'
article_id: 'mcp-infra-etat-des-lieux'
color: 'teal'
draft: false
publishedAt: '2026-09-08'
---

#### 🔎 Retour sur le terrain

Dans [l'article précédent](/blog/article/mcp-devops-stack), j'expliquais comment
brancher Ollama à Forgejo, SonarQube, Jenkins et mes serveurs Linux via MCP.
C'était la théorie et une configuration générique, à adapter.

Plusieurs semaines plus tard, voici ce qui tourne **vraiment** sur mon homelab —
avec les vrais choix, les vrais compromis, et une découverte que je n'avais pas
anticipée : **chaque outil expose MCP à sa manière**, et ce n'est pas qu'une
question de goût.

C'est aussi le premier d'une série d'articles où je documente comment j'introduis
progressivement l'IA (Claude, Ollama, n8n) dans mon infrastructure — pas comme
gadget, mais comme brique d'exploitation au quotidien.

#### 🗺️ Qui héberge quoi

Mon homelab tient sur 3 machines physiques, plus mon poste de dev pour
l'orchestration :

::tool-table
| Machine | Rôle principal | MCP hébergé |
|---------|----------------|-------------|
| cyric | Forgejo, Registry, PostgreSQL | Forgejo MCP |
| ilmater | Jenkins + agents de build | **aucun conteneur** — MCP natif dans Jenkins |
| baine | SonarQube, OpenProject, Coolify | SonarQube MCP, OpenProject MCP |
| poste de dev | n8n, Ollama, Open WebUI | SSH MCP (multi-serveurs) |
::

<mermaid>
graph LR
  OW["🖥️ Open WebUI / n8n\n(poste de dev)"]
  subgraph Cyric["🖥️ cyric"]
    Forgejo["🦌 Forgejo"]
    FMCP["Forgejo MCP"]
  end
  subgraph Ilmater["🖥️ ilmater"]
    Jenkins["🧰 Jenkins\n(plugin mcp-server natif)"]
  end
  subgraph Baine["🖥️ baine"]
    SonarQube["📊 SonarQube"]
    SMCP["SonarQube MCP"]
    OpenProject["📋 OpenProject"]
    OMCP["OpenProject MCP"]
  end
  SSHMCP["🐧 SSH MCP\n(1 conteneur, 6 serveurs)"]
  OW -->|HTTPS| FMCP --> Forgejo
  OW -->|HTTPS| Jenkins
  OW -->|HTTPS| SMCP --> SonarQube
  OW -->|HTTPS| OMCP --> OpenProject
  OW -->|HTTPS| SSHMCP -->|SSH| Cyric
  SSHMCP -->|SSH| Ilmater
  SSHMCP -->|SSH| Baine
  classDef clusterStyle fill:#41dcce,stroke:#333,stroke-width:1.5px;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  classDef dbStyle fill:#ddf,stroke:#00d,stroke-width:2px;
  class Cyric,Ilmater,Baine clusterStyle;
  class OW,FMCP,Jenkins,SMCP,OMCP,SSHMCP containerStyle;
  class Forgejo,SonarQube,OpenProject dbStyle;
</mermaid>

::tool-table
| Service | Article |
|---------|---------|
| Forgejo | [Article 6](/blog/article/6-docker-forgejo-init) |
| Jenkins | [Article 7](/blog/article/7-docker-jenkins-init) |
| SonarQube | [Article 8](/blog/article/8-docker-sonarqube-init) |
| OpenProject | [Article 10](/blog/article/10-docker-openproject-init) |
| MCP — théorie et mise en place | [Article précédent](/blog/article/mcp-devops-stack) |
::

#### 🧩 La vraie découverte : MCP n'est pas un standard d'implémentation

L'article précédent partait du principe qu'il fallait un conteneur MCP dédié
pour chaque outil. En pratique, sur mon infra, j'ai 4 façons différentes
d'exposer MCP :

::tool-table
| Outil | Comment MCP est exposé | Type |
|-------|------------------------|------|
| SonarQube | `sonarsource/sonarqube-mcp` | Image **officielle** de l'éditeur |
| Forgejo | `codeberg.org/goern/forgejo-mcp` | Wrapper **communautaire** |
| OpenProject | Image maison, construite par mes soins | **Fait maison** (pas d'offre officielle) |
| Jenkins | Plugin `mcp-server` installé dans Jenkins lui-même | **Natif**, zéro conteneur supplémentaire |
| Serveurs Linux | `mcp-ssh-multi`, un conteneur pour 6 machines | Générique, pas lié à un produit |
::

Le cas Jenkins est celui qui m'a le plus surpris. Je m'attendais à devoir
déployer un wrapper tiers comme pour Forgejo. En creusant, `jenkins/jenkins:lts`
embarque désormais officiellement un plugin `mcp-server` : Jenkins parle MCP
nativement, sans conteneur ni service séparé.

```bash
# Sur le conteneur Jenkins existant
docker exec jenkins ls /var/jenkins_home/plugins | grep mcp-server
# → mcp-server.jpi
```

Le routage se fait simplement en réécrivant le chemin vers le endpoint du
plugin, sur le **même service Jenkins** — pas de nouveau conteneur à
maintenir, pas de token applicatif supplémentaire à gérer côté outil tiers :

```yaml [extrait Traefik — mêmes labels que le service jenkins existant]
labels:
  - "traefik.http.middlewares.jenkins-mcp-rewrite.replacepathregex.regex=^/mcp(.*)"
  - "traefik.http.middlewares.jenkins-mcp-rewrite.replacepathregex.replacement=/mcp-server/mcp$1"
  - "traefik.http.routers.jenkins-mcp-secure.rule=Host(`mcp-jenkins.chartman2-fr.ovh`)"
  - "traefik.http.routers.jenkins-mcp-secure.service=jenkins-secure"
  - "traefik.http.routers.jenkins-mcp-secure.middlewares=jenkins-mcp-auth,jenkins-mcp-rewrite"
```

**Leçon retenue** : avant d'installer un wrapper MCP tiers pour un outil,
vérifiez d'abord si l'éditeur n'a pas déjà ajouté le support nativement.
L'écosystème bouge vite — ce qui nécessitait un projet communautaire il y a
six mois peut être devenu une fonctionnalité officielle aujourd'hui.

#### 🔐 Authentification — deux modèles, un seul robuste

En auditant ma propre config pour cet article, j'ai trouvé deux modèles
d'authentification bien différents, et pas au hasard de l'outil mais de la
maturité de son intégration MCP :

**Modèle 1 — le serveur MCP valide lui-même le token** (Forgejo) :
le client envoie `Authorization: Bearer <clé>`, le conteneur MCP la vérifie.
C'est le modèle que je recommandais dans l'article précédent, et le seul
que j'ai gardé sans réserve.

**Modèle 2 — Traefik injecte un header fixe** (SonarQube, OpenProject,
Jenkins actuellement) :

```yaml [extrait — simplifié]
labels:
  - "traefik.http.middlewares.xxx-auth.headers.customrequestheaders.Authorization=Bearer ***"
  - "traefik.http.routers.xxx-secure.middlewares=xxx-auth"
```

Pratique à mettre en place — Traefik s'occupe de tout, le conteneur MCP
n'a même pas besoin de gérer l'auth — mais **le token vit alors en clair
dans la configuration Traefik**, et l'authentification réelle du client
ne compte plus : quiconque atteint le routeur passe. C'est un raccourci
que j'ai pris pour aller vite sur trois services, et que je suis en train
de corriger (rotation des tokens + validation côté application plutôt que
côté proxy).

Le SSH MCP, lui, tourne aujourd'hui **sans aucune couche d'authentification
applicative** — sécurité par obscurité du chemin d'accès uniquement, en
plus du fait que rien n'est exposé publiquement (pas d'enregistrement DNS
public sur ces sous-domaines). C'est l'outil le plus puissant de toute la
liste, et le point que je vais durcir en premier.

> 💡 Ce que je publie ici n'est pas une victoire, c'est un audit honnête.
> Si vous mettez en place du MCP, faites cet audit **avant** de brancher
> une IA dessus, pas après.

#### 🐧 SSH MCP — la vraie volumétrie

Depuis le premier article, le fichier `servers.yaml` a grandi :

::tool-table
| Serveur | Rôle |
|---------|------|
| homelab-cyric | Forgejo, Registry |
| homelab-ilmater | Jenkins |
| homelab-baine | SonarQube, OpenProject |
| homelab-mystra | — |
| homelab-gond | — |
| vps-production | Environnement client |
::

Un seul conteneur `mcp-ssh-multi`, une seule clé SSH dédiée, six serveurs.
C'est toujours l'architecture la plus simple à opérer — et la plus
sensible à sécuriser correctement, comme vu plus haut.

C'est aussi celui qui élargit le plus les possibilités : contrairement aux
MCP précédents, limités à *leur* outil, le SSH MCP donne accès au système
sous-jacent, sur les six machines à la fois :

::tool-table
| Outil disponible | Description |
|-------------------|-------------|
| `ssh_execute_command` | Exécuter une commande sur un serveur nommé |
| `ssh_read_file` | Lire un fichier distant |
| `ssh_tail_log` | Suivre un fichier de log |
| `ssh_list_processes` | Lister les processus |
| `ssh_list_dir` | Lister un répertoire |
| + quelques autres | Transfert de fichiers, monitoring... |
::

En pratique, c'est celui que j'utilise le plus au quotidien — pas pour du
spectaculaire, pour du diagnostic ennuyeux et répétitif :

> *"Quels paquets ont une mise à jour disponible sur cyric, ilmater et baine ?"*
> *"Y a-t-il un reboot en attente sur l'un de mes serveurs ?"*
> *"Quels conteneurs tournent sur baine en ce moment ?"*

Un seul point d'entrée, six serveurs interrogés en langage naturel — sans
ouvrir six terminaux SSH. C'est ce type de tâche qui a justifié cet article :
je l'ai fait pendant que je rédigeais.

#### 🚀 Et la suite ?

Ces MCP ne sont pour l'instant branchés qu'à Open WebUI en interrogation
directe. La prochaine étape sur laquelle je travaille : un orchestrateur
n8n qui reçoit une question en langage naturel et route vers le bon outil
tout seul — j'y reviendrai dans un prochain article une fois que je serai
satisfait de sa fiabilité.

#### 🔭 Pour aller plus loin — MCP sans infra à maintenir

Tous les MCP vus jusqu'ici sont auto-hébergés : je fais tourner le
conteneur, je gère l'auth, je supporte la charge. Mais MCP n'impose rien
de tout ça — un serveur MCP peut aussi être un simple service public,
sans rien à déployer de mon côté.

Exemple concret que j'utilise déjà en écrivant ces articles : Nuxt (le
framework qui fait tourner ce site) publie son propre serveur MCP officiel,
accessible directement en HTTP :

```json
{
  "type": "http",
  "url": "https://nuxt.com/mcp"
}
```

Aucune authentification, aucun conteneur, aucun serveur à sécuriser — Nuxt
l'héberge et le maintient. Il expose des outils de consultation de la
documentation officielle, des modules et des guides :

::tool-table
| Outil disponible | Description |
|-------------------|-------------|
| `list-modules` / `get-module` | Explorer l'écosystème de modules Nuxt |
| `get-documentation-page` | Lire une page précise de la doc |
| `get-getting-started-guide` | Guides de démarrage officiels |
| `get-changelog` | Historique des versions |
| `list-deploy-providers` / `get-deploy-provider` | Options de déploiement |
::

C'est le même protocole que pour mon Forgejo ou mon SonarQube, mais un
modèle d'exposition radicalement différent : un éditeur qui documente son
propre outil pour que les IA (et les développeurs) le consultent
directement, sans passer par une recherche web ni risquer une réponse
obsolète. À mesure que MCP se généralise, je m'attends à voir de plus en
plus d'éditeurs suivre ce modèle plutôt que celui, plus lourd, du
conteneur auto-hébergé.

#### 🎨 Et bientôt — Open Design

Dans la même veine, je commence tout juste à explorer un MCP auto-hébergé
pour la conception visuelle : **Open Design**, tournant lui aussi en local
sur mon poste de dev.

L'idée à terme : m'en servir pour retravailler le design de ce site
directement avec l'assistance d'une IA. Pour l'instant j'en suis aux
premiers tests, pas encore à un usage maîtrisé — donc pas de section
détaillée aujourd'hui. J'y consacrerai un article dédié une fois que
j'aurai vraiment quelque chose à montrer.

#### ✅ Conclusion

Trois mois après la théorie, la réalité d'une stack MCP en production
ressemble moins à un standard uniforme qu'à un patchwork d'intégrations à
des stades de maturité très différents — du natif (Jenkins) au fait maison
(OpenProject). Le protocole ouvre la porte ; à chacun de vérifier ce qu'il
y a vraiment derrière avant d'y donner les clés d'une IA.

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
