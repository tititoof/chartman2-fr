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
Voici un `docker‑compose.yml` qui lance Jenkins derrière Traefik — idéal pour un homelab ou un pipeline CI/CD intégré :

```yml [docker-compose.yml]
services:
  jenkins:
    image: "jenkins/jenkins:lts"
    container_name: jenkins
    restart: unless-stopped
    user: "1000:1000"        # UID/GID du compte Jenkins dans le conteneur
    environment:
      - JAVA_OPTS=-Djenkins.install.runSetupWizard=false
      - JENKINS_OPTS=--httpPort=8080
      - JENKINS_ADMIN_ID=admin
      - JENKINS_ADMIN_PASSWORD=${JENKINS_ADMIN_PASSWORD}
    ports:
      - "${JENKINS_PORT:-8080}:8080"
      - "${JENKINS_SLAVE_PORT:-50000}:50000"
    volumes:
      - jenkins_home:/var/jenkins_home
    labels:
      # Traefik integration
      - "traefik.enable=true"
      - "traefik.http.routers.jenkins.rule=Host(`${JENKINS_HOST}`)"
      - "traefik.http.routers.jenkins.entrypoints=http"
      - "traefik.http.middlewares.jenkins-redirect.redirectscheme.scheme=https"
      - "traefik.http.routers.jenkins.middlewares=jenkins-redirect"
      - "traefik.http.routers.jenkins-secure.entrypoints=https"
      - "traefik.http.routers.jenkins-secure.rule=Host(`${JENKINS_HOST}`)"
      - "traefik.http.routers.jenkins-secure.tls=true"
      - "traefik.http.services.jenkins.loadbalancer.server.port=8080"
    networks:
      - local_dev

networks:
  local_dev:
    driver: bridge

volumes:
  jenkins_home:
```