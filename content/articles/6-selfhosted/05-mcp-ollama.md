---
title: 'MCP — Branchez votre IA sur votre stack DevOps'
description: 'Connectez Ollama et Open WebUI à Forgejo, SonarQube, Jenkins et vos serveurs Linux via le Model Context Protocol'
icon: 'i-mdi:robot-outline'
article_id: 'mcp-devops-stack'
color: 'purple'
draft: false
publishedAt: '2026-09-01'
---

#### 🤖 MCP — Votre IA parle à vos outils DevOps

Jusqu'ici, interagir avec votre stack DevOps demandait de naviguer entre
plusieurs interfaces : Forgejo pour les dépôts, SonarQube pour la qualité,
Jenkins pour les builds. Et si votre IA locale pouvait faire tout ça en
langage naturel ?

> *"Quelles issues sont ouvertes sur mon dépôt frontend ?"*
> *"Le Quality Gate de la branche main est-il vert ?"*
> *"Lance le pipeline du projet todo-backend."*
> *"Quel est l'espace disque disponible sur le serveur homelab ?"*

C'est exactement ce que permet **MCP (Model Context Protocol)** — un
protocole ouvert qui donne à une IA la capacité d'appeler des outils
externes de façon structurée et sécurisée.

#### 🧩 Qu'est-ce que MCP ?

MCP est un protocole créé par Anthropic, maintenant standard dans
l'écosystème IA. Il définit comment une IA communique avec des serveurs
d'outils externes.

Chaque **serveur MCP** expose un ensemble d'outils (fonctions) que le
modèle peut appeler. Exemples pour Forgejo :

- `list_repositories` — lister vos dépôts
- `create_issue` — créer une issue
- `get_pull_request` — récupérer une PR
- `merge_pull_request` — merger une PR

Le modèle décide seul quels outils appeler en fonction de votre question.
Vous posez une question en français, il orchestre les appels nécessaires
et vous retourne une réponse.

#### 🚦 Modes de transport — stdio vs HTTP

Avant de configurer quoi que ce soit, un point essentiel :
les serveurs MCP fonctionnent selon deux modes.

**stdio** : le client démarre le serveur MCP comme un processus local.
Idéal pour un usage sur une seule machine (Claude Desktop, Cursor, VS Code).

**HTTP/SSE** : le serveur MCP tourne en permanence et les clients
s'y connectent via HTTP. C'est **ce mode qu'on utilise ici** — votre
Open WebUI est sur votre PC, les serveurs MCP sont sur votre homelab.

```
PC Portable                          Homelab
┌─────────────────┐                 ┌────────────────────────────────┐
│  Open WebUI     │                 │  mcp-forgejo.domain.tld        │
│  + Ollama       │ ──── HTTPS ───▶ │  mcp-sonarqube.domain.tld      │
│                 │                 │  mcp-jenkins.domain.tld        │
└─────────────────┘                 │  mcp-ssh.domain.tld            │
                                    └────────────────────────────────┘
```

#### 🗺️ Architecture

<mermaid>
graph LR
  OW["🖥️ Open WebUI\n+ Ollama (PC)"]
  subgraph Homelab["🏠 Homelab"]
    Traefik["🚦 Traefik"]
    FMCP["🦌 Forgejo MCP\n:3000"]
    SMCP["📊 SonarQube MCP\n:8080"]
    JMCP["🧰 Jenkins MCP\n:8080"]
    SSHMCP["🐧 SSH MCP\n:8000"]
    Forgejo["🦌 Forgejo"]
    SonarQube["📊 SonarQube"]
    Jenkins["🧰 Jenkins"]
    Linux["🐧 Serveur Linux\nSSH :22"]
  end
  OW -->|"HTTPS Bearer token"| Traefik
  Traefik --> FMCP
  Traefik --> SMCP
  Traefik --> JMCP
  Traefik --> SSHMCP
  FMCP --> Forgejo
  SMCP --> SonarQube
  JMCP --> Jenkins
  SSHMCP -->|"SSH"| Linux
  classDef clusterStyle fill:#41dcce,stroke:#333,stroke-width:1.5px;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  classDef dbStyle fill:#ddf,stroke:#00d,stroke-width:2px;
  class Homelab clusterStyle;
  class OW,Traefik,FMCP,SMCP,JMCP,SSHMCP containerStyle;
  class Forgejo,SonarQube,Jenkins,Linux dbStyle;
</mermaid>

#### ⚙️ Prérequis

Cette série s'appuie sur les articles précédents :

::tool-table
| Service | Article |
|---------|---------|
| Traefik | [Article 3](/blog/article/3-docker-traefik-introduction) |
| Forgejo | [Article 6](/blog/article/6-docker-forgejo-init) |
| Jenkins | [Article 7](/blog/article/7-docker-jenkins-init) |
| SonarQube | [Article 8](/blog/article/8-docker-sonarqube-init) |
| Réseau `projects_local_dev` | [Article 2](/blog/article/2-docker-compose-description) |
::

#### 🔐 Sécurité — comprendre l'authentification MCP

Avant de configurer les services, un point important sur la sécurité.

Chaque serveur MCP de cette série gère lui-même l'authentification via
une variable d'API key. Le client (Open WebUI) doit envoyer
`Authorization: Bearer <votre_clé>` dans chaque requête HTTP — le
serveur valide cette clé et rejette les requêtes non autorisées.

Traefik se contente de router le trafic HTTPS vers le bon conteneur.
Il n'ajoute pas et ne valide pas de token — c'est le serveur MCP
qui s'en charge.

> ⚠️ Exposez ces services uniquement via HTTPS. En HTTP, les tokens
> circuleraient en clair. Avec votre configuration Traefik + Let's
> Encrypt, vous êtes déjà couverts.

#### 🦌 1. Forgejo MCP

[richarvey/forgejo-mcp](https://hub.docker.com/r/richarvey/forgejo-mcp){:target="_blank"} est un serveur MCP communautaire activement
maintenu qui expose 103 outils couvrant dépôts, issues, PR, organisations
et administration.

```bash [.env-mcp-forgejo]
# Forgejo
FORGEJO_URL=https://forgejo.domain.tld
FORGEJO_TOKEN=votre_token_forgejo

# Clé d'API du serveur MCP (Bearer token pour les clients)
FORGEJO_MCP_API_KEY=changez_moi_openssl_rand_hex_32
```

```yaml [docker-compose.yml]
services:
  mcp-forgejo:
    image: richarvey/forgejo-mcp:latest
    restart: unless-stopped
    env_file:
      - .env-mcp-forgejo
    labels:
      - "traefik.enable=true"

      # HTTP → HTTPS
      - "traefik.http.routers.mcp-forgejo.rule=Host(`${MCP_FORGEJO_URL}`)"
      - "traefik.http.routers.mcp-forgejo.entrypoints=http"
      - "traefik.http.middlewares.mcp-forgejo-redirect.redirectscheme.scheme=https"
      - "traefik.http.routers.mcp-forgejo.middlewares=mcp-forgejo-redirect"

      # HTTPS
      - "traefik.http.routers.mcp-forgejo-secure.service=mcp-forgejo-secure"
      - "traefik.http.routers.mcp-forgejo-secure.rule=Host(`${MCP_FORGEJO_URL}`)"
      - "traefik.http.routers.mcp-forgejo-secure.entrypoints=https"
      - "traefik.http.routers.mcp-forgejo-secure.tls=true"
      - "traefik.http.services.mcp-forgejo-secure.loadbalancer.server.port=3000"
    networks:
      - homelab
    profiles:
      - devops
```

Ajoutez dans votre `.env` principal :

```bash [.env]
MCP_FORGEJO_URL=mcp-forgejo.domain.tld
```

Générez la clé API :

```bash
openssl rand -hex 32
```

::tool-table
| Outil disponible | Description |
|-----------------|-------------|
| `list_repos` | Lister vos dépôts |
| `create_issue` | Créer une issue |
| `list_pull_requests` | Lister les PR ouvertes |
| `merge_pull_request` | Merger une PR |
| `get_repo_commits` | Historique des commits |
| + 98 autres | Issues, organisations, admin... |
::

#### 📊 2. SonarQube MCP

`sonarsource/sonarqube-mcp` est le serveur MCP **officiel** de SonarSource.
Il supporte nativement le mode HTTP avec authentification Bearer.

```bash [.env-mcp-sonarqube]
SONARQUBE_URL=https://sonarqube.domain.tld
SONARQUBE_TOKEN=votre_token_sonarqube
```

```yaml [docker-compose.yml]
services:
  mcp-sonarqube:
    image: sonarsource/sonarqube-mcp:latest
    restart: unless-stopped
    env_file:
      - .env-mcp-sonarqube
    labels:
      - "traefik.enable=true"

      # HTTP → HTTPS
      - "traefik.http.routers.mcp-sonarqube.rule=Host(`${MCP_SONARQUBE_URL}`)"
      - "traefik.http.routers.mcp-sonarqube.entrypoints=http"
      - "traefik.http.middlewares.mcp-sonarqube-redirect.redirectscheme.scheme=https"
      - "traefik.http.routers.mcp-sonarqube.middlewares=mcp-sonarqube-redirect"

      # HTTPS
      - "traefik.http.routers.mcp-sonarqube-secure.service=mcp-sonarqube-secure"
      - "traefik.http.routers.mcp-sonarqube-secure.rule=Host(`${MCP_SONARQUBE_URL}`)"
      - "traefik.http.routers.mcp-sonarqube-secure.entrypoints=https"
      - "traefik.http.routers.mcp-sonarqube-secure.tls=true"
      - "traefik.http.services.mcp-sonarqube-secure.loadbalancer.server.port=8080"
    networks:
      - homelab
    profiles:
      - devops
```

```bash [.env]
MCP_SONARQUBE_URL=mcp-sonarqube.domain.tld
```

> 💡 Le serveur SonarQube MCP valide le `SONARQUBE_TOKEN` directement
> sur votre instance. Le token doit avoir le droit **Execute Analysis**
> dans SonarQube → My Account → Security.

::tool-table
| Outil disponible | Description |
|-----------------|-------------|
| `get_quality_gate_status` | Statut de la Quality Gate |
| `search_issues` | Chercher des issues (bugs, vulnérabilités) |
| `get_project_metrics` | Métriques d'un projet |
| `analyze_code` | Analyser un extrait de code |
| `search_projects` | Lister les projets |
::

#### 🧰 3. Jenkins MCP (communautaire)

Pour Jenkins, `ghcr.io/huangjien/devops-mcps` est un projet communautaire
qui regroupe Jenkins, Git et quelques outils système. Il est moins mature
que les deux précédents — vérifiez l'activité du dépôt avant de l'utiliser
en production.

```bash [.env-mcp-jenkins]
JENKINS_URL=https://jenkins.domain.tld
JENKINS_USER=admin
JENKINS_API_TOKEN=votre_token_jenkins
```

```yaml [docker-compose.yml]
services:
  mcp-jenkins:
    image: ghcr.io/huangjien/devops-mcps:latest
    restart: unless-stopped
    env_file:
      - .env-mcp-jenkins
    labels:
      - "traefik.enable=true"

      # HTTP → HTTPS
      - "traefik.http.routers.mcp-jenkins.rule=Host(`${MCP_JENKINS_URL}`)"
      - "traefik.http.routers.mcp-jenkins.entrypoints=http"
      - "traefik.http.middlewares.mcp-jenkins-redirect.redirectscheme.scheme=https"
      - "traefik.http.routers.mcp-jenkins.middlewares=mcp-jenkins-redirect"

      # HTTPS
      - "traefik.http.routers.mcp-jenkins-secure.service=mcp-jenkins-secure"
      - "traefik.http.routers.mcp-jenkins-secure.rule=Host(`${MCP_JENKINS_URL}`)"
      - "traefik.http.routers.mcp-jenkins-secure.entrypoints=https"
      - "traefik.http.routers.mcp-jenkins-secure.tls=true"
      - "traefik.http.services.mcp-jenkins-secure.loadbalancer.server.port=8080"
    networks:
      - homelab
    profiles:
      - devops
```

```bash [.env]
MCP_JENKINS_URL=mcp-jenkins.domain.tld
```

#### 🐧 4. SSH MCP — accès à tous vos serveurs Linux

> ⚠️ **Section à lire attentivement avant de déployer.**
> Un MCP SSH donne à votre IA la capacité d'exécuter des commandes
> sur vos serveurs. C'est l'outil le plus puissant — et le plus risqué
> — de cette liste.

Pour plusieurs serveurs, inutile d'installer un SSH MCP sur chacun.
`mcp-ssh-multi` est un seul conteneur qui gère tous vos serveurs via
un fichier YAML de configuration — **un seul endpoint, tous vos serveurs**.

Ce que vous pourrez demander à Ollama :

> *"Quel est l'espace disque disponible sur homelab-main ?"*
> *"Quels conteneurs Docker tournent sur vps-production ?"*
> *"Montre-moi la charge CPU de tous mes serveurs"*

##### Générer une clé SSH dédiée

```bash
# Une seule clé pour tous les serveurs — à générer une fois
ssh-keygen -t ed25519 -C "mcp-ssh-agent" -f ~/.ssh/mcp_ssh_agent
```

##### Préparer chaque serveur (homelab x4 + VPS production)

À exécuter **sur chaque serveur cible** :

```bash
useradd -m -s /bin/bash mcp-agent
usermod -aG docker mcp-agent   # si accès Docker nécessaire

mkdir -p /home/mcp-agent/.ssh
cat ~/.ssh/mcp_ssh_agent.pub >> /home/mcp-agent/.ssh/authorized_keys
chmod 700 /home/mcp-agent/.ssh
chmod 600 /home/mcp-agent/.ssh/authorized_keys
chown -R mcp-agent:mcp-agent /home/mcp-agent/.ssh
```

Aucun logiciel supplémentaire à installer — SSH suffit.

##### Créer le `Dockerfile.mcp-ssh`

```dockerfile [Dockerfile.mcp-ssh]
FROM python:3.12-slim

RUN pip install --no-cache-dir uv

EXPOSE 8086

ENV SSH_SERVERS_FILE=/config/servers.yaml

CMD ["uvx", "--from", "mcp-ssh-multi@latest", "ssh-mcp-web"]
```

##### Créer `.docker/mcp-ssh/servers.yaml`

```yaml [.docker/mcp-ssh/servers.yaml]
servers:

  homelab-main:
    host: 192.168.1.X
    port: 22
    username: mcp-agent
    key_file: /root/.ssh/mcp_ssh_agent
    description: "Serveur principal homelab"

  homelab-2:
    host: 192.168.1.X
    port: 22
    username: mcp-agent
    key_file: /root/.ssh/mcp_ssh_agent
    description: "Homelab serveur 2"

  homelab-3:
    host: 192.168.1.X
    port: 22
    username: mcp-agent
    key_file: /root/.ssh/mcp_ssh_agent
    description: "Homelab serveur 3"

  homelab-4:
    host: 192.168.1.X
    port: 22
    username: mcp-agent
    key_file: /root/.ssh/mcp_ssh_agent
    description: "Homelab serveur 4"

  vps-production:
    host: X.X.X.X
    port: 22
    username: mcp-agent
    key_file: /root/.ssh/mcp_ssh_agent
    description: "VPS production"
```

##### Service dans `docker-compose.yml`

```yaml [docker-compose.yml]
services:
  mcp-ssh:
    build:
      context: .
      dockerfile: Dockerfile.mcp-ssh
    restart: unless-stopped
    volumes:
      - ./.docker/mcp-ssh/servers.yaml:/config/servers.yaml:ro
      - ~/.ssh/mcp_ssh_agent:/root/.ssh/mcp_ssh_agent:ro
    labels:
      - "traefik.enable=true"

      # HTTP → HTTPS
      - "traefik.http.routers.mcp-ssh.rule=Host(`${MCP_SSH_URL}`)"
      - "traefik.http.routers.mcp-ssh.entrypoints=http"
      - "traefik.http.middlewares.mcp-ssh-redirect.redirectscheme.scheme=https"
      - "traefik.http.routers.mcp-ssh.middlewares=mcp-ssh-redirect"

      # HTTPS
      - "traefik.http.routers.mcp-ssh-secure.service=mcp-ssh-secure"
      - "traefik.http.routers.mcp-ssh-secure.rule=Host(`${MCP_SSH_URL}`)"
      - "traefik.http.routers.mcp-ssh-secure.entrypoints=https"
      - "traefik.http.routers.mcp-ssh-secure.tls=true"
      - "traefik.http.services.mcp-ssh-secure.loadbalancer.server.port=8086"
    networks:
      - homelab
    profiles:
      - devops
```

```bash [.env]
MCP_SSH_URL=mcp-ssh.domain.tld
```

> 💡 La configuration complète avec toutes les IPs à renseigner
> est disponible dans le fichier joint à cet article.

##### Règles de sécurité absolues

::tool-table
| Règle | Pourquoi |
|-------|---------|
| Utilisateur dédié `mcp-agent`, jamais `root` | Limite la surface d'impact en cas de compromission |
| Clé SSH dédiée uniquement pour ce MCP | Révocable sans affecter vos autres accès |
| Volume monté en lecture seule (`:ro`) | Le conteneur ne peut pas modifier la clé |
| VPS production : droits encore plus restreints | Environnement client — risque plus élevé |
| Ne jamais exposer ce MCP sur internet public | Réseau local ou VPN uniquement |
::

::tool-table
| Outil disponible | Description |
|-----------------|-------------|
| `ssh_execute_command` | Exécuter une commande sur un serveur nommé |
| `ssh_read_file` | Lire un fichier distant |
| `ssh_tail_log` | Suivre un fichier de log |
| `ssh_list_processes` | Lister les processus |
| `ssh_list_dir` | Lister un répertoire |
| + 6 autres | Transfert de fichiers, monitoring... |
::

#### 🚀 Démarrage

```bash
# Ajoutez les fichiers .env à votre .gitignore
echo ".env-mcp-*" >> .gitignore

# Démarrez les serveurs MCP
docker compose --profile devops up -d \
  mcp-forgejo mcp-sonarqube mcp-jenkins mcp-ssh

# Vérifiez les endpoints de santé
curl https://mcp-forgejo.domain.tld/health
curl https://mcp-sonarqube.domain.tld/health
curl https://mcp-ssh.domain.tld/health
```

#### 🖥️ Connexion depuis Open WebUI

Dans Open WebUI → **Paramètres** → **Outils** → **MCP** → **Ajouter** :

**Forgejo MCP :**

```json
{
  "type": "http",
  "url": "https://mcp-forgejo.domain.tld/mcp",
  "headers": {
    "Authorization": "Bearer votre_forgejo_mcp_api_key"
  }
}
```

**SonarQube MCP :**

```json
{
  "type": "http",
  "url": "https://mcp-sonarqube.domain.tld/mcp",
  "headers": {
    "Authorization": "Bearer votre_sonarqube_token"
  }
}
```

**SSH MCP :**

```json
{
  "type": "http",
  "url": "https://mcp-ssh.domain.tld/mcp",
  "headers": {
    "Authorization": "Bearer votre_ssh_mcp_token"
  }
}
```

Une fois connectés, vos modèles Ollama ont accès à tous les outils exposés.
Testez avec des questions simples :

```
"Liste mes dépôts Forgejo"
"Quel est le statut du Quality Gate du projet chartman2-fr ?"
"Quels conteneurs Docker tournent sur le serveur homelab ?"
"Y a-t-il des issues ouvertes sur le dépôt todo-backend ?"
```

#### 🔖 Commit

```bash
git add docker-compose.yml .gitignore
git commit -m "feat: ajout serveurs MCP pour la stack DevOps"
git push origin main
```

#### ✅ Résumé

::tool-table
| Service | Image | Statut | Port | Authentification |
|---------|-------|--------|------|-----------------|
| Forgejo MCP | `richarvey/forgejo-mcp` | Communautaire actif | 3000 | `FORGEJO_MCP_API_KEY` |
| SonarQube MCP | `sonarsource/sonarqube-mcp` | **Officiel** | 8080 | `SONARQUBE_TOKEN` |
| Jenkins MCP | `ghcr.io/huangjien/devops-mcps` | Communautaire | 8080 | `JENKINS_API_TOKEN` |
| SSH MCP | `giuliolibrando/ssh-mcp-server` | Communautaire | 8000 | Clé SSH dédiée |
::

#### ✅ Conclusion

Avec ces quatre serveurs MCP, votre IA locale peut interagir directement
avec l'ensemble de votre pipeline DevOps et de votre infrastructure —
en langage naturel, depuis Open WebUI, sans quitter votre infrastructure.

Le SSH MCP est le plus puissant mais aussi le plus sensible : prenez le
temps de configurer un utilisateur dédié avec des droits minimaux avant
de l'activer.

Les MCPs étant un protocole en rapide évolution, de nouveaux serveurs
apparaissent régulièrement. Surveillez le registre officiel
[mcp.so](https://mcp.so){:target="_blank"} pour les nouvelles intégrations.

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::