---
title: "Docker – Registry"
description: "Découvrez comment installer et configurer un registry Docker privé avec Docker : stockage local d’images, intégration Jenkins et Coolify, interface web et push/pull sécurisés."
icon: "i-mdi:docker"
article_id: "11-docker-registry-init"
color: "blue"
draft: false
publishedAt: '2026-08-05'
---

#### 📌 Registry Docker ![Registry](/img/registry.png){ width=30px }

Un registry Docker privé vous permet de stocker et distribuer vos images Docker
sur votre propre infrastructure, sans dépendre de Docker Hub ou GHCR.

- **Contrôle total** : vos images restent sur votre serveur
- **Rapidité** : push/pull sur le réseau local sans passer par internet
- **Intégration CI/CD** : Jenkins pousse les images, Coolify les pull
- **Interface web** : visualisation des images et tags via Registry Browser
- **Open-source** : image officielle Docker, gratuite et légère

Dans notre stack, le registry joue le rôle de **hub central des images** :
Jenkins y pousse les images buildées, et Coolify les récupère pour les déployer.

<mermaid>
graph LR
  Jenkins["🧰 Jenkins\nAgent"] -->|docker push :staging/:latest| Registry["📦 Registry\n:5000"]
  Jenkins -->|docker push| GHCR["📦 GHCR\nghcr.io"]
  Coolify["🚀 Coolify"] -->|docker pull| Registry
  Coolify -->|docker pull| GHCR
  Navigateur["🌍 Navigateur\nhttps://registry-ui.domain.tld"] --> Traefik["🚦 Traefik"]
  subgraph DH["🐳 Docker Host"]
    subgraph homelab["🌐 homelab (Docker network)"]
      Traefik --> RegistryUI["🖥️ Registry UI\n:8080"]
      Traefik --> Registry
      RegistryUI --> Registry
    end
  end
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  class Navigateur,DH cluster;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Traefik,Registry,RegistryUI,Jenkins,Coolify,GHCR containerStyle;
</mermaid>

#### ⚙️ Exemple

```yaml [docker-compose.yml]
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
      - homelab

  registry:
    image: registry:3
    restart: unless-stopped
    environment:
      - REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY=/var/lib/registry
    ports:
      - 5000:5000
    volumes:
      - ./registry-data:/var/lib/registry
    labels:
      - traefik.enable=true

      # HTTP → HTTPS redirection
      - traefik.http.middlewares.registry-redirect.redirectscheme.scheme=https
      - traefik.http.routers.registry.rule=Host(`${URL_REGISTRY}`)
      - traefik.http.routers.registry.entrypoints=http
      - traefik.http.routers.registry.middlewares=registry-redirect

      # HTTPS
      - traefik.http.routers.registry-secure.service=registry-secure
      - traefik.http.routers.registry-secure.rule=Host(`${URL_REGISTRY}`)
      - traefik.http.routers.registry-secure.entrypoints=https
      - traefik.http.routers.registry-secure.tls=true

      # Port interne
      - traefik.http.services.registry-secure.loadbalancer.server.port=5000
    networks:
      homelab:
        aliases:
          - ${URL_REGISTRY}
    profiles:
      - devops

  registry-ui:
    image: klausmeyer/docker-registry-browser
    restart: unless-stopped
    environment:
      - SECRET_KEY_BASE=${REGISTRY_UI_SECRET_KEY}
      - ENABLE_COLLAPSE_NAMESPACES=true
      - DOCKER_REGISTRY_URL=http://${URL_REGISTRY}:5000
      - NO_SSL_VERIFICATION=true
    labels:
      - traefik.enable=true

      # HTTP → HTTPS redirection
      - traefik.http.middlewares.registry-ui-redirect.redirectscheme.scheme=https
      - traefik.http.routers.registry-ui.rule=Host(`${URL_REGISTRY_UI}`)
      - traefik.http.routers.registry-ui.entrypoints=http
      - traefik.http.routers.registry-ui.middlewares=registry-ui-redirect

      # HTTPS
      - traefik.http.routers.registry-ui-secure.service=registry-ui-secure
      - traefik.http.routers.registry-ui-secure.rule=Host(`${URL_REGISTRY_UI}`)
      - traefik.http.routers.registry-ui-secure.entrypoints=https
      - traefik.http.routers.registry-ui-secure.tls=true

      # Port interne
      - traefik.http.services.registry-ui-secure.loadbalancer.server.port=8080
    networks:
      homelab:
        aliases:
          - ${URL_REGISTRY_UI}
    profiles:
      - devops

networks:
  homelab:
    driver: bridge
```

```bash [.env]
URL_REGISTRY=registry.domain.tld
URL_REGISTRY_UI=registry-ui.domain.tld

# Générez une valeur unique : openssl rand -hex 64
REGISTRY_UI_SECRET_KEY=votre_secret_key
```

> 💡 Le profile `devops` signifie que le registry ne démarre pas avec un simple
> `docker compose up`. Pour le démarrer :
> ```bash
> docker compose --profile devops up -d
> ```

> 💡 `DOCKER_REGISTRY_URL=http://${URL_REGISTRY}:5000` — la registry-ui communique
> avec le registry en HTTP sur le réseau Docker interne, même si Traefik l'expose
> en HTTPS vers l'extérieur. `NO_SSL_VERIFICATION=true` est donc nécessaire.

#### 🚀 Premier démarrage

```bash
docker compose --profile devops up -d
```

Votre registry est accessible sur `https://registry.domain.tld` et l'interface
web sur `https://registry-ui.domain.tld`.

![Registry - Dashboard](/img/content/registry.png)

#### 🔧 Utilisation depuis Jenkins

Dans le Jenkinsfile, Jenkins pousse les images vers le registry local **et** vers GHCR
selon la branche :

```groovy [Jenkinsfile]
stage('Build HomeLab') {
    steps {
        withCredentials([file(credentialsId: 'frontend-chartman2-fr-env', variable: 'ENV_FILE')]) {
            script {
                // Lecture du .env et transformation en --build-arg
                def buildArgs = sh(
                    script: "grep -vE '^[[:space:]]*#|^[[:space:]]*\$' ${ENV_FILE} | sed 's/^/--build-arg /' | tr '\\n' ' '",
                    returnStdout: true
                )

                def tag = env.BRANCH_NAME == 'main' ? 'latest' : 'staging'

                // Build avec double tag
                sh """
                    docker build ${buildArgs} \
                      -t registry.domain.tld/frontend-chartman2fr:${tag} \
                      -t ghcr.io/tititoof/frontend-chartman2fr:${tag} \
                      -f Dockerfile.prod .
                """

                // Push vers le registry privé
                sh "docker push registry.domain.tld/frontend-chartman2fr:${tag}"

                // Push vers GHCR
                withCredentials([string(credentialsId: 'ghcr-token', variable: 'CR_PAT')]) {
                    sh """
                        echo \$CR_PAT | docker login ghcr.io -u tititoof --password-stdin
                        docker push ghcr.io/tititoof/frontend-chartman2fr:${tag}
                    """
                }
            }
        }
    }
}
```

> 💡 Le credential `frontend-chartman2-fr-env` est de type **Secret file** dans Jenkins
> (**Manage Jenkins** → **Credentials** → **Secret file**). Il contient le fichier `.env`
> de l'application, injecté comme `--build-arg` au moment du build pour ne pas
> embarquer les secrets dans l'image finale.

**Pourquoi le double push ?**

::tool-table
| Destination | Usage |
|-------------|-------|
| `registry.domain.tld` | Pull rapide sur le réseau local (homelab) |
| `ghcr.io` | Pull depuis l'extérieur par Coolify en production |
::

#### 🗂️ Structure des fichiers

```
.
├── docker-compose.yml
├── .env
└── registry-data/    ← images stockées ici (à sauvegarder)
```

#### 🔒 Bonnes pratiques

- **Sauvegardez `registry-data/`** régulièrement — c'est toutes vos images
- **Ajoutez une authentification** en production via `htpasswd` pour protéger l'accès :
```yaml
environment:
  - REGISTRY_AUTH=htpasswd
  - REGISTRY_AUTH_HTPASSWD_REALM=Registry
  - REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd
volumes:
  - ./auth:/auth
```
- **Ne commitez jamais `REGISTRY_UI_SECRET_KEY`** dans votre dépôt Git

#### ✅ Conclusion

Le registry privé ferme la boucle des images Docker dans votre homelab : Jenkins build
et pousse, le registry stocke, Coolify déploie. Le double push vers GHCR garantit
que vos images sont disponibles même quand votre homelab est éteint.

Dans le prochain article, nous verrons comment configurer
[Coolify](/blog/article/12-docker-coolify-init) pour déployer
automatiquement ces images en production.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::