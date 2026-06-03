---
title: "Docker – Jenkins"
description: "Installer et déployer Jenkins avec Docker"
icon: "i-mdi:docker"
article_id: "7-docker-jenkins-init"
---
#### 📌 Jenkins ![Jenkins](/img/jenkins-logo.png){ width=30px }

Vous avez besoin d’un **pipeline d’automatisation** robuste, configurable et open‑source ? [Jenkins](https://www.jenkins.io){:target="_blank"} est l’outil le plus répandu pour orchestrer build, test, scan, et déploiement :

* **Pipeline en tant que code** : YAML, Jenkinsfile, ...
* **Large catalogue de plugins** : Git, Docker, SonarQube, LDAP, OAuth2, ...
* **Gestion des agents** : sur Docker, Kubernetes, ou machines virtuelles
* **Écosystème riche** : webhooks vers Forgejo, notifications vers OpenProject, ...
* **Sécurité** : ACL granulaire, chiffrement TLS, intégration LDAP/OAuth2  
* **Interface web intuitive** : visualisation du pipeline, statistiques, réutilisation de jobs

#####

En quelques réglages simples avec Docker, Jenkins devient votre outil principal pour automatiser la création, le test et le déploiement de vos projets. Il peut facilement se connecter à des services comme Forgejo, SonarQube, OpenProject et Coolify.


#### 🏗️ Architecture générale

Avant de se lancer, il faut comprendre comment Jenkins fonctionne en mode distribué.

##### Le main

Le **main Jenkins** est le cerveau du système. Il gère :

- l'interface web,
- le planificateur de jobs,
- le stockage des configurations et des résultats,
- le déclenchement des builds.

######

Mais il ne fait **pas** les builds lui‑même : c'est le rôle des **agents**.


##### Pourquoi les agents ?

Cette séparation permet de répartir la charge de travail, d’exécuter plusieurs builds en parallèle et d’isoler les environnements selon les besoins des projets (Docker, Node.js, Java, etc.).

Les avantages :

* **Scalabilité** Un même master peut déployer plusieurs agents sur plusieurs machines (ou conteneurs).
* **Isolation** Chaque agent peut tourner sur un système d’exploitation, un JDK, des dépendances… différents.
* **Performance** Les jobs lourds (tests, compilations, Docker, etc.) ne saturent pas le master.
* **Sécurité** On peut limiter les droits de l’agent (par ex. `privileged: true` uniquement quand nécessaire).

######

Dans notre `docker-compose.yml`, on aura :

- **`jenkins`** : le main
- **`agent_rails`** : agent spécialisé Ruby on Rails (Ruby, Bundler, etc.)
- **`agent_nuxt`** : agent spécialisé Vue JS / Nuxt (Node, npm, pnpm, etc.)

######

Les agents se connectent au master via **SSH** et exécutent les jobs qui leur sont assignés.

<mermaid>
graph TD
  Navigateur["🌍 Navigateur<br/>https://jenkins.domain.tld"] -->|HTTP 443| Traefik["🚦<br/>Traefik"]
  Forgejo["🦌 Forgejo\nWebhook on push"] -->|HTTP| Jenkins
  subgraph DH["🐳 Docker Host"]
      subgraph devops["🌐 devops (Docker network)"]
          Traefik --> Jenkins["🧰<br/>Jenkins<br/>Master<br/>:8080"]
          Jenkins --> R["🤖<br/>Jenkins Agent<br/>Rails<br/>:22"]
          Jenkins --> V["🤖<br/>Jenkins Agent<br/>VueJS<br/>:22"]
          Jenkins --- LabelsTraefik["🏷️<br/>Labels Traefik<br/>
          traefik.enable=true<br/>
          router jenkins (http)<br/>
          router jenkins-secure (https)<br/>
          service port 8080"]
      end
  end
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  class Navigateur,DH,Dev,Forgejo,R,V,Jenkins,Traefik cluster;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Traefik,Jenkins,R,V,Forgejo containerStyle;
  classDef volumeStyle fill:#ddf,stroke:#00d,stroke-width:2px;
  class LabelsTraefik,Redirection,TLS,Dashboard volumeStyle;
</mermaid>

#### ⚙️ docker-compose.yml

On déploie Jenkins derrière Traefik, avec deux agents SSH construits depuis des Dockerfiles locaux.

```yml [docker-compose.yml]
services:
  traefik:
    restart: unless-stopped
    image: traefik:v3
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
      - devops

  jenkins:
    image: jenkins/jenkins:lts
    restart: unless-stopped
    user: root
    ports:
      - 8081:8080
      - 50000:50000
    container_name: jenkins
    volumes:
      - ${PWD}/.docker/jenkins/data:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
      - /usr/local/bin/docker:/usr/local/bin/docker
    labels:
      - "traefik.enable=true"

      # HTTP → HTTPS redirection
      - "traefik.http.middlewares.jenkins-redirect.redirectscheme.scheme=https"

      # HTTP
      - "traefik.http.routers.jenkins.rule=Host(`${URL_JENKINS}`)"
      - "traefik.http.routers.jenkins.entrypoints=http"
      - "traefik.http.routers.jenkins.middlewares=jenkins-redirect"

      # HTTPS
      - "traefik.http.routers.jenkins-secure.service=jenkins-secure"
      - "traefik.http.routers.jenkins-secure.rule=Host(`${URL_JENKINS}`)"
      - "traefik.http.routers.jenkins-secure.entrypoints=https"
      - "traefik.http.routers.jenkins-secure.tls=true"

      # Port interne
      - "traefik.http.services.jenkins-secure.loadbalancer.server.port=8080"
    networks:
      devops:
        aliases:
          - ${URL_JENKINS}

  jenkins_agent_rails:
    image: ghcr.io/tititoof/jenkins-agent-rails:latest
    restart: unless-stopped
    privileged: true
    ports:
      - 8422:22
    container_name: jenkins_agent_rails
    command: -url http://jenkins:8080 <agent_rails_token> agent_rails_1
    environment:
      - JENKINS_AGENT_SSH_PUBKEY=ssh-ed25519 <votre_clé_publique>
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /usr/bin/docker:/usr/bin/docker
      - ${PWD}/.docker/rails_agent_jenkins/home:/var/jenkins_home
      - ${PWD}/.docker/rails_agent_jenkins/agent:/home/jenkins/agent
      - ${PWD}/.ssh:/home/jenkins/.ssh
    group_add:
      - 989
    networks:
      devops:
        aliases:
          - jenkins_agent_rails
  
  jenkins_agent_vuejs:
    image: ghcr.io/tititoof/jenkins-agent-vuejs:latest
    restart: unless-stopped
    privileged: true
    ports:
      - 8522:22
    container_name: jenkins_agent_vuejs
    command: -url http://jenkins:8080 <agent_vuejs_token> agent_vuejs_1
    environment:
      - JENKINS_AGENT_SSH_PUBKEY=ssh-ed25519 <votre_clé_publique>
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /usr/bin/docker:/usr/bin/docker
      - ${PWD}/.docker/vuejs_agent_jenkins/home:/var/jenkins_home
      - ${PWD}/.docker/vuejs_agent_jenkins/agent:/home/jenkins/agent
    networks:
      devops:
        aliases:
          - jenkins_agent_vuejs

networks:
  devops:
    driver: bridge

volumes:
  jenkins_home:
```

> ⚠️ `user: root` simplifie la gestion des permissions sur les volumes.
> En production, préférez ajuster les permissions du volume et utiliser un utilisateur dédié.

```bash [.env]
URL_JENKINS=jenkins.domain.tld
```

![Jenkins - Login](/img/content/jenkins-login.png)

##### Explications

| Paramètre | Rôle |
|-----------|------|
| `privileged: true` | Permet à l'agent de lancer des commandes Docker (`docker build`, `docker push`…) |
| `user: root` | Évite les problèmes de permissions sur les volumes |
| `/var/run/docker.sock` | Monte le socket Docker du host pour que l'agent puisse piloter Docker |
| `JENKINS_SLAVE_SSH_PUBKEY` | Clé publique SSH que Jenkins utilisera pour se connecter à l'agent |
| `expose: 22` | Le port SSH de l'agent, accessible uniquement depuis le réseau interne Docker |
| `build: context:` | Les agents sont construits depuis un Dockerfile local (image personnalisée) |

######

> 💡 **Contrairement à d'autres setups** qui utilisent des images pré-construites via une commande `-url <token>`, ici les agents se connectent en **SSH pur**. C'est Jenkins master qui initie la connexion vers les agents — pas l'inverse.

[Github](https://github.com/jenkinsci/docker-ssh-agent)

#### 🚀 Premier démarrage

```bash
docker compose up -d
```

Au premier lancement, Jenkins génère un mot de passe administrateur dans ses logs :

```bash
docker logs jenkins | grep -A 3 "Please use the following password"
```

Rendez-vous sur `https://jenkins.domain.tld`, saisissez ce mot de passe, puis suivez l'assistant d'installation.

Choisissez **"Install suggested plugins"** pour commencer avec les plugins essentiels.

#### 🔌 Configuration des agents SSH

##### 1. Générer une paire de clés SSH

Sur votre machine hôte, si ce n'est pas déjà fait :

```bash
ssh-keygen -t ed25519 -C "jenkins-agent" -f ~/.ssh/jenkins_agent
```

Copiez la **clé publique** (`~/.ssh/jenkins_agent.pub`) dans la variable `JENKINS_SLAVE_SSH_PUBKEY` de chaque agent dans le `docker-compose.yml`.

La **clé privée** (`~/.ssh/jenkins_agent`) sera enregistrée dans Jenkins comme credential.

##### 2. Ajouter la clé privée dans Jenkins

Dans Jenkins → **Manage Jenkins** → **Credentials** → **System** → **Global credentials** :

- Kind : `SSH Username with private key`
- ID : `jenkins-agent-ssh`
- Username : `jenkins`
- Private Key : collez le contenu de `~/.ssh/jenkins_agent`

##### 3. Déclarer les agents dans Jenkins

Dans **Manage Jenkins** → **Nodes** → **New Node** :

| Champ | Valeur |
|-------|--------|
| Node name | `agent_rails` |
| Type | Permanent Agent |
| Remote root directory | `/var/jenkins_home` |
| Labels | `agent_rails_1` |
| Launch method | Launch agents via SSH |
| Host | `agent_rails` (alias réseau Docker) |
| Credentials | `jenkins-agent-ssh` |
| Host Key Verification | Non verifying |

######

Répétez l'opération pour `agent_nuxt` avec le label `agent_vuejs_1`.

> 💡 Le **label** est ce qui fait le lien entre un agent et un job. Dans le Jenkinsfile, `label 'agent_vuejs_1'` désigne exactement cet agent.

#### 🦌 Intégration Forgejo (plugin Gitea)

Jenkins se connecte à Forgejo grâce au **plugin Gitea**. À chaque `git push`, Forgejo envoie un webhook à Jenkins qui déclenche le build correspondant.

##### 1. Installer le plugin Gitea

Dans **Manage Jenkins** → **Plugins** → **Available plugins**, recherchez `Gitea` et installez-le.

##### 2. Créer un token dans Forgejo

Dans Forgejo, allez dans **Settings** → **Applications** → **Generate Token**. Donnez-lui les permissions `repository` (lecture) et `issue` (optionnel).

##### 3. Configurer le serveur Gitea dans Jenkins

Dans **Manage Jenkins** → **System** → section **Gitea Servers** :

- Name : `Forgejo`
- Server URL : `https://forgejo.domain.tld`
- Credentials : créez un credential de type **Secret text** avec votre token Forgejo

![Jenkins - Login](/img/content/jenkins-forgejo-plugins.png)

##### 4. Configurer le webhook dans Forgejo

Dans votre dépôt Forgejo → **Settings** → **Webhooks** → **Add Webhook** → **Gitea** :

- Target URL : `https://jenkins.domain.tld/gitea-webhook/post`
- Secret : (laissez vide ou configurez un secret partagé)
- Trigger : **Push events**, **Pull Request events**

##### 5. Créer le job Jenkins (Multibranch Pipeline)

Dans Jenkins → **New Item** → **Multibranch Pipeline** :

- **Branch Sources** → **Gitea** → sélectionnez votre serveur et votre dépôt
- **Build Configuration** → `by Jenkinsfile` (Jenkins cherchera automatiquement le fichier `Jenkinsfile` à la racine)

Jenkins scannera automatiquement les branches et créera un job par branche contenant un Jenkinsfile.

![Jenkins - Login](/img/content/jenkins-pipeline.png)


---

#### 📄 Le Jenkinsfile expliqué

Voici le processus que j'utilise pour mon projet frontend avec Nuxt, qui tourne sur `agent_vuejs_1`. [Github - chartman2-fr.ovh](https://github.com/tititoof/chartman2-fr/blob/main/Jenkinsfile){:target="_blank"}

```groovy [Jenkinsfile]
pipeline {
    agent {
        node {
            label 'agent_vuejs_1'  // Cible l'agent Nuxt
        }
    }

    stages {
        stage('Build') { ... }          // pnpm install + pnpm build
        stage('Test') { ... }           // pnpm run test:ci-cd
        stage('SonarQube Quality Gate') { ... }  // Analyse de qualité
        stage('Quality Gate') { ... }   // Attente du résultat SonarQube
        stage('Github update') { ... }  // Mirror vers GitHub
        stage('Build HomeLab') { ... }  // docker build + push registry
        stage('Deploy') { ... }         // Appel API Coolify
    }
}
```

##### Flux complet d'un build

<mermaid>
graph TD
  DEV["👨‍💻 Développeur"] -->|git push| FORGEJO["🦌 Forgejo"]
  FORGEJO -->|Webhook| JENKINS["🧰 Jenkins\nMultibranch Pipeline"]
  JENKINS -->|label agent_vuejs_1| AGENT["🤖 agent_nuxt"]
  subgraph PIPELINE["🏗️ Exécution sur agent_nuxt"]
    S1["① Build\npnpm install + pnpm build"]
    S2["② Tests unitaires\npnpm run test:ci-cd"]
    S3["③ Scan SonarQube\nsonar-scanner"]
    S4["④ Quality Gate\nwaitForQualityGate()"]
    S5["⑤ Mirror GitHub\ngit push → github.com"]
    S6["⑥ Docker build + push\nregistry privé + GHCR"]
    S7["⑦ Appel API Coolify\ncurl /api/v1/deploy?tag=…"]
    S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7
  end
  AGENT --> S1
  S3 <-->|rapport + résultat| SONAR["📊 SonarQube"]
  S6 --> |push| REGISTRY["📦 Private registry"]
  S6 --> |push| GITHUB["📦 GHCR"]
  S7 -->|déploiement| COOLIFY["🚀 Coolify\nPull image → conteneur actif"]
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class DEV,FORGEJO,JENKINS,AGENT,S1,S2,S3,S4,S5,S6,S7,SONAR,COOLIFY,GITHUB,REGISTRY cluster;
  class JENKINS,AGENT,SONAR,COOLIFY,FORGEJO,GITHUB,REGISTRY containerStyle;
  class S1,S2,S3,S4,S5,S6,S7 containerStyle;
  classDef step fill:#ddf,stroke:#00d,stroke-width:2px;
  class S1,S2,S3,S4,S5,S6,S7 step;
</mermaid>

![Jenkins - Login](/img/content/jenkins-pipeline.png)

##### Gestion des branches

Le pipeline adapte son comportement selon la branche :

| Branche | Tag Docker | Environnement Coolify |
|---------|------------|----------------------|
| `develop` | `:staging` | `chartman2-fr-staging` |
| `main` | `:latest` | `frontend-chartman2-fr-production` |

Les Pull Requests (`PR-*`) ne déclenchent que les étapes de build et de test, sans déploiement.

![Jenkins - Login](/img/content/jenkins-project-branchs.png)

##### Les credentials utilisés

| ID Jenkins | Type | Usage |
|------------|------|-------|
| `sonarqube-server` | Secret text | URL du serveur SonarQube |
| `sonarqube-token` | Secret text | Token d'authentification SonarQube |
| `github-token` | Secret text | Token pour le push vers GitHub |
| `ghcr-token` | Secret text | Token pour `docker push` vers GHCR |
| `frontend-chartman2-fr-env` | Secret file | Fichier `.env` injecté au `docker build` |
| `coolify-token` | Secret text | Token API Coolify pour déclencher le déploiement |

######

> Ces credentials sont déclarés dans **Manage Jenkins** → **Credentials** et injectés dans le pipeline via `withCredentials([...])`.


#### 🔒 Bonnes pratiques de sécurité

- **Ne jamais mettre de secrets en clair** dans le Jenkinsfile — toujours passer par les credentials Jenkins
- **Limiter `privileged: true`** aux agents qui en ont réellement besoin (builds Docker)
- **Restreindre les droits ACL** : créez des utilisateurs distincts pour les projets sensibles
- **Protéger l'accès à Jenkins** derrière Traefik avec TLS
- **Mettre à jour régulièrement** Jenkins LTS et ses plugins (`Manage Jenkins` → `Plugin Manager`)


#### 🗂️ Structure des fichiers

```
.
├── docker-compose.yml
├── .env
└── .docker/
     ├── jenkins/
     │   └── data/                  ← données persistantes Jenkins (jobs, config, plugins)
     ├── rails_agent_jenkins/
     │   ├── home/                  ← historique des jobs Rails
     │   └── agent/                 ← environnement d'exécution Rails
     └── vuejs_agent_jenkins/
         ├── home/                  ← historique des jobs Vue.js
         └── agent/                 ← environnement d'exécution Vue.js
```


#### ⚙️ Exemple

Avant de commencer à installer Jenkins, il est important de connaître quelques détails.  

Jenkins a besoin d'*agents* pour fonctionner. Ce sont eux qui vont s'occuper de lancer les processus de *builds*.

##### Aperçu des agents que l'on va configurer dans le *docker‑compose.yml*

On va déployer 2 agents :

- `jenkins_agent_rails` : spécialisé sur l'environnement Rails (Ruby 2.x/3.x, Bundler, etc.).
- `jenkins_agent_vuejs` : spécialisé sur l'environnement Vue.js (Node 14+, npm, pnpm, etc.).


######

Voilà un tableau des agents que l'on va déployer

::small-table
| Service | Image | Ports exposés | Volumes montés | Commande | Variables d’environnement | Particularités |
|---------|-------|---------------|----------------|----------|---------------------------|----------------|
| `jenkins_agent_rails` | `ghcr.io/tititoof/jenkins-agent-rails:latest` | `8082:8080`, `50001:50000`, `8422:22` | Docker socket, `/usr/bin/docker`, `home`, `agent`, `~/.ssh` | `-url http://<mon_ip>:8081 e95b... agent_rails_1` | `JENKINS_AGENT_SSH_PUBKEY=ssh-ed25519 ...` | <u>Privileged</u> container, groupe `989` (docker), alias `jenkins_agent_rails`. |
| `jenkins_agent_vuejs` | `ghcr.io/tititoof/jenkins-agent-vuejs` | `8083:8080`, `50002:50000`, `8522:22` | Docker socket, `/usr/bin/docker`, `home`, `agent` | `-url http://<mon_ip>:8081 69e3... agent_vuejs_1` | `JENKINS_AGENT_SSH_PUBKEY=ssh-ed25519 ...` | <u>Privileged</u> container, alias `jenkins_agent_vuejs`. |
::

Bon, c'est un peu dense, voici les explications :

- **image**: Il s'agit d'une image Docker prête à l'emploi, contenant Jenkins Agent avec les logiciels dont il a besoin.
- **ports**: `8080` interne (UI agent, utile à des fins de debug). `50000` interne (JNLP). `22` pour les connexions *SSH*.
- **command**: `-url http://<mon_ip>:8081 <agent_rails_token> <agent‑name>`, on indiquera le token pour que Jenkins puisse identifier l'agent
- **environment**: `JENKINS_AGENT_SSH_PUBKEY` pour pouvoir se connecter à l'agent en *SSH*
- **volumes**: Montage du `docker.sock` pour que l’agent puisse lancer des conteneurs Docker (builds Docker, tests, etc.). Le répertoire `home` et `agent` permettent de garder l’historique du job et de l’environnement d’exécution. Pour *builder* l'image de l'application grâce à Docker
- **group_add: 989**: Ajoute le conteneur au groupe Docker (souvent le groupe `docker` a l’ID 989). Pour *builder* l'image de l'application grâce à Docker
- **privileged: true**: Accorde des privilèges élevés (capabilities) pour exécuter des actions comme `docker run --privileged`, monter des volumes, etc. Pour *builder* l'image de l'application grâce à Docker


#### ✅ Conclusion

Avec cette configuration, Jenkins devient le chef d'orchestre de votre cycle de développement :
à chaque `git push` sur Forgejo, le pipeline se déclenche automatiquement, exécute les tests,
analyse la qualité du code avec SonarQube, publie l'image Docker et déclenche le déploiement
via Coolify — sans intervention manuelle.

Les agents spécialisés (`agent_rails`, `agent_vuejs`) permettent d'isoler les environnements,
de paralléliser les builds et de ne pas surcharger le master. Ajouter un nouvel agent pour
un autre stack (Python, Java, Go...) se résume à quelques lignes dans le `docker-compose.yml`.

Hébergé chez vous, versionné, reproductible : cette stack Jenkins + Forgejo + SonarQube +
Coolify constitue une chaîne CI/CD complète, maîtrisée de bout en bout.

Dans le prochain article, nous verrons comment configurer
[SonarQube](/blog/article/8-docker-sonarqube-init){:target="_blank"} pour analyser
la qualité de votre code directement depuis le pipeline Jenkins.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::