---
title: "Docker – Coolify"
description: "Installer et déployer Coolify avec Docker"
icon: "i-mdi:docker"
article_id: "5-docker-coolify-init"
---
#### 📌 Coolify ![Coolify](/img/coolify-transparent.svg){ width=30px }
Vous avez besoin d’un **déploiement continu** ultra‑simple :  
[Coolify](https://coolify.io){:target="_blank"} est la plateforme self‑hosted qui vous permet de lancer, scaler et monitorer vos projets (Go, Node, PHP, Python, Docker, etc.) en quelques clics :  

- **Interface intuitive** : création de services, base de données, domaines, SSL auto‑généré  
- **Gestion multi‑stack** : projets Docker, Helm, ou applications “bare‑metal”  
- **Déploiement automatisé** : webhooks depuis Forgejo, GitHub, GitLab, OpenProject…  
- **Monitoring & logs** : Grafana, Prometheus, Loki, et un tableau de bord unifié  
- **Sécurité** : TLS terminée par Traefik, gestion des comptes, LDAP/OAuth2  
- **Exportable** : configuration YAML pour répliquer votre environnement  
- **Open‑source** : version communautaire gratuite, possibilité de payer pour des add‑ons  

Avec Docker, Coolify devient votre “décorateur” de déploiement CI/CD, prêt à être intégré à Jenkins, SonarQube, Forgejo ou OpenProject.

#### ⚙️ Exemple
Voici un `docker‑compose.yml` qui lance Coolify derrière Traefik — idéal pour un homelab ou un pipeline CI/CD intégré :

```yml [docker-compose.yml]
services:
  coolify:
    image: "coolify/coolify:latest"
    container_name: coolify
    restart: unless-stopped
    environment:
      - COOLIFY_PORT=80
      - COOLIFY_HOST=${COOLIFY_HOST}
      - COOLIFY_ROOT=/
      - COOLIFY_ENV=production
      - DB_TYPE=postgres
      - DB_HOST=db:5432
      - DB_DATABASE=coolify
      - DB_USER=coolify
      - DB_PASSWORD=coolify_password
      - COOLIFY_ADMIN_EMAIL=admin@example.com
      - COOLIFY_ADMIN_PASSWORD=${COOLIFY_ADMIN_PASSWORD}
    ports:
      - "${COOLIFY_PORT:-80}:80"
    volumes:
      - coolify_data:/app/data
      - coolify_config:/app/config
    labels:
      # Traefik integration
      - "traefik.enable=true"
      - "traefik.http.routers.coolify.rule=Host(`${COOLIFY_HOST}`)"
      - "traefik.http.routers.coolify.entrypoints=http"
      - "traefik.http.middlewares.coolify-redirect.redirectscheme.scheme=https"
      - "traefik.http.routers.coolify.middlewares=coolify-redirect"
      - "traefik.http.routers.coolify-secure.entrypoints=https"
      - "traefik.http.routers.coolify-secure.rule=Host(`${COOLIFY_HOST}`)"
      - "traefik.http.routers.coolify-secure.tls=true"
      - "traefik.http.services.coolify.loadbalancer.server.port=80"
    networks:
      - local_dev
    depends_on:
      - db

  db:
    image: "postgres:15-alpine"
    container_name: coolify-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=coolify
      - POSTGRES_USER=coolify
      - POSTGRES_PASSWORD=coolify_password
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - local_dev

networks:
  local_dev:
    driver: bridge

volumes:
  coolify_data:
  coolify_config:
  db_data:
```

```bash
COOLIFY_HOST=coolify.example.com
COOLIFY_ADMIN_PASSWORD=super_secret
```

Une fois ce conteneur démarré, votre instance Coolify est accessible sur https://coolify.example.com.
Créez vos services via l’UI ; utilisez les webhooks de Jenkins, SonarQube ou Forgejo pour déclencher le déploiement automatique.
Happy deploying !