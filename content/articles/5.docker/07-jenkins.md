---
title: "Docker – Jenkins"
description: "Installer et déployer Jenkins avec Docker"
icon: "i-mdi:docker"
article_id: "7-docker-jenkins-init"
---
#### 📌 Jenkins ![Jenkins](/img/jenkins.png){ width=30px }
Vous avez besoin d’un **pipeline d’automatisation** robuste, configurable et open‑source ?  
[Jenkins](https://www.jenkins.io){:target="_blank"} est l’outil le plus répandu pour orchestrer build, test, scan, et déploiement :  
- **Pipeline en tant que code** : YAML, Jenkinsfile, Blue Ocean  
- **Large catalogue de plugins** : Git, Docker, SonarQube, LDAP, OAuth2, …  
- **Gestion des agents** : sur Docker, Kubernetes, ou machines virtuelles  
- **Écosystème riche** : webhooks vers Forgejo, notifications vers OpenProject, suppression d’artefacts dans Coolify  
- **Sécurité** : ACL granulaire, chiffrement TLS, intégration LDAP/OAuth2  
- **Interface web intuitive** : visualisation du pipeline, statistiques, réutilisation de jobs

En quelques lignes de configuration Docker, Jenkins devient votre moteur CI/CD, prêt à se connecter à Forgejo, SonarQube, OpenProject, ou Coolify.

#### ⚙️ Exemple

Avant de nous lancer dans la mise en place de Jenkins, il faut voir quelques points.

Jenkins a besoin d'agent(s) pour fonctionner. ces eux qui vont lancer les *builds*.

##### Pourquoi les agents ?

Dans Jenkins, le master (ou controller) gère :

- l’interface web,
- le planificateur de jobs,
- le stockage des configurations,
- le démarrage des builds.

Mais il ne fait pas les builds lui‑même : c’est le travail des agents (ou slaves).
L’avantage :

| Objectif | Pourquoi on en a besoin ? |
|----------|---------------------------|
| **Scalabilité** | Un même master peut déployer plusieurs agents sur plusieurs machines (ou conteneurs). |
| **Isolation** | Chaque agent peut tourner sur un système d’exploitation, un JDK, des dépendances… différents. |
| **Performance** | Les jobs lourds (tests, compilations, Docker, etc.) ne saturent pas le master. |
| **Sécurité** | On peut limiter les droits de l’agent (par ex. `privileged: true` uniquement quand nécessaire). |


Dans notre docker‑compose, on va avoir un master (jenkins) et deux agents (jenkins_agent_rails et jenkins_agent_vuejs).

Chaque agent exécute les jobs qui lui sont assignés (Rails, Vue JS, etc.) et se connecte au master.

##### Aperçu des agents que l'on va configurer dans le *docker‑compose.yml*

On va déployer 2 agents :

- `jenkins_agent_rails`: Spécialise sur l’environnement Rails (Ruby 2.x/3.x, bundler, gemset, etc.).
- `jenkins_agent_vuejs`: Spécialise sur l’environnement Vue JS (Node 14+, Yarn, etc.).



Voilà un tableau des agents que l'on va déployer


| Service | Image | Ports exposés | Volumes montés | Commande | Variables d’environnement | Particularités |
|---------|-------|---------------|----------------|----------|---------------------------|----------------|
| `jenkins_agent_rails` | `ghcr.io/tititoof/jenkins-agent-rails:latest` | `8082:8080`, `50001:50000`, `8422:22` | Docker socket, `/usr/bin/docker`, `home`, `agent`, `~/.ssh` | `-url http://<mon_ip>:8081 e95b... agent_rails_1` | `JENKINS_AGENT_SSH_PUBKEY=ssh-ed25519 ...` | <u>Privileged</u> container, groupe `989` (docker), alias `jenkins_agent_rails`. |
| `jenkins_agent_vuejs` | `ghcr.io/tititoof/jenkins-agent-vuejs` | `8083:8080`, `50002:50000`, `8522:22` | Docker socket, `/usr/bin/docker`, `home`, `agent` | `-url http://<mon_ip>:8081 69e3... agent_vuejs_1` | `JENKINS_AGENT_SSH_PUBKEY=ssh-ed25519 ...` | <u>Privileged</u> container, alias `jenkins_agent_vuejs`. |


Bon, c'est un peut gros donc on va expliquer un peu

- **image**: L’image Docker qui contient Jenkins Agent + dépendances spécifiques. |
- **ports**: `8080` interne (UI agent, utile à des fins de debug). `50000` interne (JNLP). `22` pour les connexions *SSH*.
- **command**: `-url http://<mon_ip>:8081 <agent_rails_token> <agent‑name>` , on indiquera le token pour que Jenkins puisse identifier l'agent
- **environment**: `JENKINS_AGENT_SSH_PUBKEY` pour pouvoir se connecter à l'agent en *SSH*
- **volumes**: Montage du `docker.sock` pour que l’agent puisse lancer des conteneurs Docker (builds Docker, tests, etc.). Le répertoire `home` et `agent` permettent de garder l’historique du job et de l’environnement d’exécution. Pour *builder* l'image de l'application grâce à Docker
- **group_add: 989**: Ajoute le conteneur au groupe Docker (souvent le groupe `docker` a l’ID 989). Pour *builder* l'image de l'application grâce à Docker
- **privileged: true**: Accorde des privilèges élevés (capabilities) pour exécuter des actions comme `docker run --privileged`, monter des volumes, etc. Pour *builder* l'image de l'application grâce à Docker


Hop, on démarre par créer un fichier `docker‑compose.yml` qui lance Jenkins derrière Traefik — idéal pour un homelab ou un pipeline CI/CD.

```yml [docker-compose.yml]
services:
  traefik:
    restart: unless-stopped
    image: traefik:v3.2.1
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
    privileged: true
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
      # Ajout dans traefik
      - "traefik.enable=true"
      # HTTP
      - "traefik.http.routers.jenkins.rule=Host(`${URL_JENKINS}`)"
      - "traefik.http.routers.jenkins.entrypoints=http"

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
        - 8082:8080
        - 50001:50000
        - 8422:22
      container_name: jenkins_agent_rails
      command: -url http://<mon_ip>:8081 <agent_rails_token> agent_rails_1
      environment:
      - JENKINS_AGENT_SSH_PUBKEY=ssh-ed25519 gnagnagna moi@host
      volumes:
        - /var/run/docker.sock:/var/run/docker.sock
        - /usr/bin/docker:/usr/bin/docker
        - ${PWD}/.docker/rails_agent_jenkins/home:/var/jenkins_home
        - ${PWD}/.docker/rails_agent_jenkins/agent:/home/jenkins/agent
        - ${PWD}/.ssh:/home/jenkins/.ssh
        - /var/run/docker.sock:/var/run/docker.sock
      group_add:
        - 989
      networks:
        devops:
          aliases:
            - jenkins_agent_rails
  
  jenkins_agent_vuejs:
    image: ghcr.io/tititoof/jenkins-agent-vuejs
    restart: unless-stopped
    privileged: true
    ports:
      - 8083:8080
      - 50002:50000
      - 8522:22
    container_name: jenkins_agent_vuejs
    command: -url http://<mon_ip>:8081 <agent_vuejs_token> agent_vuejs_1
    environment:
     - JENKINS_AGENT_SSH_PUBKEY=ssh-ed25519 gnagnagna moi@host
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /usr/bin/docker:/usr/bin/docker
      - ${PWD}/.docker/vuejs_agent_jenkins/home:/var/jenkins_home
      - ${PWD}/.docker/vuejs_agent_jenkins/agent:/home/jenkins/agent
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - devops

networks:
  devops:
    driver: bridge

volumes:
  jenkins_home:
```

```bash [.env]
UID=1000
GID=1000

DB_DATABASE_FORGEJO=forgejo
DB_USERNAME=forgejo_user
DB_PASSWORD=superSecretPwd

URL_FORGEJO=forgejo.domaine.tld
URL_POSTGRESQL=postgresql.domaine.tld
```

<mermaid>
graph TD
  Navigateur["🌍 Navigateur<br/>https://jenkins.dev.local"] -->|HTTP 80| Traefik["🚦<br/>Traefik"]
  Navigateur -->|HTTPS 443| Traefik
  subgraph DH["🐳 Docker Host"]
      subgraph devops["🌐 devops (Docker network)"]
          Traefik --> Jenkins["🧰<br/>Jenkins<br/>Master :8080"]
          Jenkins --> R["🤖<br/>Jenkins Agent<br/>Rails"]
          Jenkins --> V["🤖<br/>Jenkins Agent<br/>VueJS"]
          Jenkins --- LabelsTraefik["🏷️<br/>Labels Traefik<br/>
          traefik.enable=true<br/>
          router jenkins (http)<br/>
          router jenkins-secure (https)<br/>
          service port 8080"]
      end
  end
  Traefik --> TLS["🔐 TLS / Certificat"]
  Traefik --> Dashboard["👁️ Dashboard :8080"]
  Traefik --> Redirection["🔁<br/>Redirection HTTP → HTTPS"]
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  class Navigateur,DH,Dev cluster;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Traefik,Jenkins,R,V containerStyle;
  classDef volumeStyle fill:#ddf,stroke:#00d,stroke-width:2px;
  class LabelsTraefik,Redirection,TLS,Dashboard volumeStyle;
</mermaid>

Ceci est une modification pour voir un fichier staging

un test 3
dd