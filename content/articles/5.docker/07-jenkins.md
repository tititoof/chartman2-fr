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
      command: -url http://<mon_ip>:8081 e95b5085555f57a5b364cb162465ef7a811cc2c5438d6aed9ed30239b50c3506 agent_rails_1
      environment:
      - JENKINS_AGENT_SSH_PUBKEY=ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMapu5IAvz0VW6bQCkTXRDmbxLfhfZSyMPlHhu6PoUxT toofytroll@ilmater
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
    command: -url http://<mon_ip>:8081 69e30c1bf1d12a506ba75ce7feda850c6a1b2f1d85e6e1de84df44c975dc0b96 agent_vuejs_1
    environment:
     - JENKINS_AGENT_SSH_PUBKEY=ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMapu5IAvz0VW6bQCkTXRDmbxLfhfZSyMPlHhu6PoUxT toofytroll@ilmater
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