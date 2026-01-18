---
title: "Docker – SonarQube"
description: "Installer et déployer SonarQube avec Docker"
icon: "i-mdi:docker"
article_id: "5-docker-sonarqube-init"
---
#### 📌 SonarQube ![SonarQube](/img/sonarqube.png){ width=30px }
Vous voulez une **analyse de qualité** poussée et un **audit continu** de votre code ?  
[SonarQube](https://www.sonarqube.org){:target="_blank"} est la référence open‑source qui vous aide à mesurer, visualiser et améliorer la qualité de vos projets :  
- **Analyse statique** : bugs, vulnérabilités, duplications, code smells  
- **Intégration fluide** : Jenkins, Git, GitLab, Bitbucket, Forgejo… via webhooks ou API  
- **Tableaux de bord** : métriques clés, tendances, rapports par module, par règle  
- **Sécurité & conformité** : règles personnalisées, gestion des droits, scans de dépendances  
- **Plugin extensible** : Docker, GitHub Actions, Kubernetes, …  
- **Mode « Community »** : entièrement gratuit et auto‑hébergé

En quelques lignes Docker, SonarQube devient votre “lighthouse” de la qualité logicielle, prêt à être relié à Jenkins, Forgejo ou Coolify.

#### ⚙️ Exemple
Voici un `docker‑compose.yml` qui lance SonarQube derrière Traefik — idéal pour un pipeline CI/CD autonome :

```yml [docker-compose.yml]
services:
  sonarqube:
    image: "sonarqube:community"
    container_name: sonarqube
    restart: unless-stopped
    environment:
      - SONARQUBE_JDBC_URL=jdbc:postgresql://db:5432/sonar
      - SONARQUBE_JDBC_USERNAME=sonar
      - SONARQUBE_JDBC_PASSWORD=sonar_password
      - SONARQUBE_WEB_PORT=9000
    ports:
      - "${SONARQUBE_PORT:-9000}:9000"
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_extensions:/opt/sonarqube/extensions
    labels:
      # Traefik integration
      - "traefik.enable=true"
      - "traefik.http.routers.sonarqube.rule=Host(`${SONARQUBE_HOST}`)"
      - "traefik.http.routers.sonarqube.entrypoints=http"
      - "traefik.http.middlewares.sonarqube-redirect.redirectscheme.scheme=https"
      - "traefik.http.routers.sonarqube.middlewares=sonarqube-redirect"
      - "traefik.http.routers.sonarqube-secure.entrypoints=https"
      - "traefik.http.routers.sonarqube-secure.rule=Host(`${SONARQUBE_HOST}`)"
      - "traefik.http.routers.sonarqube-secure.tls=true"
      - "traefik.http.services.sonarqube.loadbalancer.server.port=9000"
    networks:
      - local_dev
    depends_on:
      - db

  db:
    image: "postgres:15-alpine"
    container_name: sonarqube-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=sonar
      - POSTGRES_USER=sonar
      - POSTGRES_PASSWORD=sonar_password
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - local_dev

networks:
  local_dev:
    driver: bridge

volumes:
  sonarqube_data:
  sonarqube_extensions:
  db_data:
```

```yml
SONARQUBE_HOST=sonarqube.domain.tld
SONARQUBE_PORT=9000
```

Avec ce conteneur, votre instance SonarQube est disponible sur https://sonarqube.domain.tld.
Activez les webhooks depuis Forgejo / Jenkins pour lancer automatiquement les analyses ; consultez le tableau de bord pour suivre l’évolution de la qualité.
Bonne analyse !