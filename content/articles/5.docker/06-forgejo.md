---
title: "Docker - Forgejo"
description: "Découvrez Forgejo avec Docker : forge Git self-hosted complète pour gérer vos dépôts, pull requests, issues et projets, sans dépendre de GitHub ou GitLab."
icon: "i-mdi:docker"
article_id: "6-docker-forgejo-init"
color: "blue"
---
 
#### 📌 Forgejo ![Forgejo](/img/Forgejo_logo.svg){ width=30px }

[Forgejo](https://forgejo.org){:target="_blank"} est une forge logicielle libre et self-hosted,
fork de Gitea à gouvernance communautaire. En un seul conteneur Docker, vous obtenez une
plateforme Git complète, sans cloud ni abonnement.

- **Serveur Git complet** : dépôts, pull-requests, branches, tags…
- **Gestion de projets** : issues, milestones, Kanban, wiki intégré
- **Intégration continue** : webhooks vers Jenkins, GitHub Actions, GitLab CI…
- **Sécurité** : authentification LDAP/OAuth2, TLS, logs centralisés
- **API REST** : intégrations tierces, automatisation, scripts

#### ⚙️ Exemple

Voici un `docker-compose.yml` avec Forgejo derrière Traefik, accessible via `forgejo.domaine.tld` 😉 :

```yml [docker-compose.yml]
services:
  traefik:
    restart: unless-stopped
    image: traefik:v3.6.7
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

  forgejo:
    image: codeberg.org/forgejo/forgejo:13
    restart: unless-stopped
    environment:
      - USER_UID=${UID}
      - USER_GID=${GID}
      - FORGEJO__database__DB_TYPE=postgres
      - FORGEJO__database__HOST=${URL_POSTGRESQL}:5432
      - FORGEJO__database__NAME=${DB_DATABASE_FORGEJO}
      - FORGEJO__database__USER=${DB_USERNAME}
      - FORGEJO__database__PASSWD=${DB_PASSWORD}
    volumes:
      - ${PWD}/.docker/forgejo:/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    ports:
      - "222:22"
      - "3000:3000"
    labels:
      # Ajout dans traefik
      - traefik.enable=true
      # HTTP
      - traefik.http.routers.forgejo.rule=Host(`${URL_FORGEJO}`)
      - traefik.http.routers.forgejo.entrypoints=http
      - traefik.http.routers.forgejo.middlewares=forgejo-redirect

      # HTTPS
      - traefik.http.routers.forgejo-secure.service=forgejo-secure
      - traefik.http.routers.forgejo-secure.rule=Host(`${URL_FORGEJO}`)
      - traefik.http.routers.forgejo-secure.entrypoints=https
      - traefik.http.routers.forgejo-secure.tls=true

      # HTTP → HTTPS redirection
      - traefik.http.middlewares.forgejo-redirect.redirectscheme.scheme=https

      # Port interne
      - traefik.http.services.forgejo-secure.loadbalancer.server.port=3000
    networks:
      devops:
        aliases:
          - ${URL_FORGEJO}

  postgresql:
    image: postgres:18
    user: "${UID}:${GID}"
    restart: unless-stopped
    volumes:
      - ${PWD}/.docker/postgresql:/var/lib/postgresql
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    ports:
      - 5432:5432
    environment:
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -h localhost -U ${DB_USERNAME} -d postgres']
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      devops:
        aliases:
          - ${URL_POSTGRESQL}

networks:
  devops:
    driver: bridge
```

> ⚠️ `--api.insecure=true` expose le dashboard Traefik sans authentification.
> Acceptable en développement local, à ne jamais utiliser en production.

> ⚠️ Les ports `3000`, `5432` exposés directement sont utiles en développement.
> En production, supprimez-les : Traefik et le réseau Docker interne suffisent.

```bash [.env]
UID=1000
GID=1000

DB_DATABASE_FORGEJO=forgejo
DB_USERNAME=forgejo_user
DB_PASSWORD=superSecretPwd

URL_FORGEJO=forgejo.domaine.tld
URL_POSTGRESQL=postgresql.domaine.tld
```

#### 🧩 Schéma

<mermaid>
graph LR
  Navigateur["🌍 Navigateur<br/>https://forgejo.domaine.tld"] -->|HTTP 80| Traefik["🚦<br/>Traefik<br/>Container"]
  Navigateur -->|HTTPS 443| Traefik
  Dev["💻 Dev / Git Client"<br/>ssh://git@forgejo.domaine.tld:222/utilisateur/depot.git] -->|SSH 222| Forgejo["📦<br/>Forgejo<br/>Container<br/>🔑 SSH :222<br/>🌍 Web UI"]
  subgraph DH["🐳 Docker Host"]
      subgraph devops["🌐 devops (Docker network)"]
          Traefik --> Forgejo
          Forgejo --- LabelsTraefik["🏷️Labels Traefik<br/>
          traefik.enable=true<br/>
          router forgejo (http)<br/>
          router forgejo-secure (https)<br/>
          service port 3000"]
          Forgejo --> PostgreSQL["🗄️<br/>PostgreSQL<br/>Container<br/>:5432"]
      end
  end
  Traefik --> TLS["🔐 TLS / Certificat"]
  Traefik --> Dashboard["👁️ Dashboard :8080"]
  Traefik --> Redirection["🔁<br/>Redirection HTTP → HTTPS"]
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  class Navigateur,DH,Dev cluster;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Traefik,Forgejo,PostgreSQL containerStyle;
  classDef volumeStyle fill:#ddf,stroke:#00d,stroke-width:2px;
  class LabelsTraefik,Redirection,TLS,Dashboard volumeStyle;
</mermaid>

> 💡 En ajoutant `POSTGRES_DB` dans les variables d'environnement du service PostgreSQL,
> Docker crée automatiquement la base et les droits au premier démarrage — aucune
> intervention manuelle nécessaire.
>
> Si vous connectez Forgejo à une instance PostgreSQL **existante**, exécutez ces requêtes :

```sql
CREATE USER forgejo_user WITH PASSWORD 'superSecretPwd';
CREATE DATABASE forgejo OWNER forgejo_user;
GRANT ALL PRIVILEGES ON DATABASE forgejo TO forgejo_user;
```


Ouvrez votre navigateur, connectez-vous à l'URL définie dans le fichier `.env` (ici `forgejo.domaine.tld`) et suivez l'assistant d'installation.

![Forgejo - Install](/img/content/forgejo-installation.png){ width=100% }

Une fois l'installation terminée, vous accédez à votre instance Forgejo :

![Forgejo - Page d'accueil ](/img/content/forgejo.png){ width=100% }

![Forgejo - Dashboard](/img/content/forgejo-dashboard.png){ width=100% }

Il ne reste plus qu'à configurer votre utilisateur, ajouter votre clé SSH, créer un dépôt, puis pointer votre projet local vers votre propre plateforme :

![Forgejo - Configuration](/img/content/forgejo-configuration.png)

![Forgejo - New repository](/img/content/forgejo-new-repo.png)


```bash
git remote set-url origin ssh://git@forgejo.domaine.tld:222/utilisateur/depot.git
```

#### ✅ Conclusion

Forgejo vous permet de gérer votre code source vous-même, sans dépendre d'une plateforme en ligne. En quelques étapes avec des conteneurs Docker, vous avez une plateforme complète pour gérer votre projet : héberger votre code, suivre les tâches à faire, suivre l'avancement de vos projets, et faciliter la collaboration entre votre équipe.

En combinant Forgejo avec une base de données PostgreSQL pour stocker vos informations et Traefik pour assurer la sécurité de vos services, cette plateforme devient un élément clé de votre organisation pour le développement logiciel. Vous gardez le contrôle total sur vos données, vos sauvegardes, qui peut y accéder, et la gestion de tout votre cycle de développement.

Son interface familière — proche de GitHub ou GitLab — et sa légèreté en font un bon choix que vous soyez en homelab, en équipe ou en entreprise.

Dans la suite de notre plateforme Docker, Forgejo jouera le rôle de point d'entrée
du cycle de développement : les développeurs y publieront leur code,
[Jenkins](/blog/article/7-docker-jenkins-init) y récupérera les
modifications via les webhooks, les pipelines construiront et testeront les applications,
puis les déploiements seront automatisés vers les différents environnements.

Une brique essentielle pour construire une chaîne CI/CD complète, maîtrisée et entièrement hébergée chez soi.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::