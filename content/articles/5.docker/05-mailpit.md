---
title: "Docker - Mailpit"
description: "Utilisation de Mailpit avec Docker"
icon: "i-mdi:docker"
article_id: "5-docker-mailpit-init"
---

#### 📌 Mailpit ![Mailpit](/img/mailpit.png){ width=30px }

Découvrez [Mailpit](https://github.com/axllent/mailpit){:target="\_blank"}, l’outil parfait pour les développeurs qui veulent tester leurs emails facilement ! Il vous permet d’intercepter et de simuler l’envoi d’emails lors du développement ou des tests, sans jamais envoyer de vrais messages.

Voici ce que Mailpit peut faire pour vous :

- **Serveur SMTP intégré**

Il remplace votre serveur SMTP habituel pendant que vous travaillez, pour que votre application puisse envoyer des mails vers Mailpit (ex. SMTP_HOST=mailpit), et tout sera intercepté sans souci.

- **Une interface web conviviale**

Accédez simplement via votre navigateur pour voir tous les emails capturés : HTML, texte brut, pièces jointes, headers, et plus encore.

- **Une API REST pratique**

Récupérez, analysez ou supprimez facilement les emails capturés grâce à une API simple à utiliser, idéale pour automatiser vos tests.

- **Léger et rapide**

Conçu pour fonctionner sans encombre dans vos environnements Docker ou CI/CD, sans dépendances lourdes.

- **Facile à prendre en main**

Pas besoin de config compliquée : Mailpit est autonome, pas besoin de Postfix, Sendmail ou autres. L’installation est simple et efficace !

#### ⚙️ Exemple

Voici un exemple pour vous montrer comment utiliser [Traefik](/blog/article/3-docker-traefik-introduction){:target="\_blank"} avec Mailpit, c'est vraiment simple et pratique !

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

  mailpit:
    image: "axllent/mailpit:latest"
    container_name: mailpit
    restart: unless-stopped
    ports:
      - "${MAILPIT_PORT:-1025}:1025"
      - "${MAILPIT_UI_PORT:-8025}:8025"
    labels:
      # Ajout dans traefik
      - "traefik.enable=true"

      # HTTP → HTTPS redirection
      - "traefik.http.middlewares.mailpit-redirect.redirectscheme.scheme=https"

      # HTTP
      - "traefik.http.routers.mailpit.rule=Host(`${MAILPIT_HOST}`)"
      - "traefik.http.routers.mailpit.entrypoints=http"
      - "traefik.http.routers.mailpit.service=mailpit"
      - "traefik.http.routers.mailpit.middlewares=mailpit-redirect"

      # HTTPS
      - "traefik.http.routers.mailpit-secure.service=mailpit-secure"
      - "traefik.http.routers.mailpit-secure.rule=Host(`${MAILPIT_HOST}`)"
      - "traefik.http.routers.mailpit-secure.entrypoints=https"
      - "traefik.http.routers.mailpit-secure.tls=true"

      # Port interne
      - "traefik.http.services.mailpit-secure.loadbalancer.server.port=8025"
    networks:
      - devops

networks:
  devops:
    driver: bridge
```

```bash [.env]
MAILPIT_PORT=1025
MAILPIT_UI_PORT=8025
MAILPIT_HOST=mailpit.domain.tld
```

<mermaid>
graph LR
    Navigateur["🌍<br/>Navigateur<br/>mailpit.domain.tld"] -->|HTTP 80| Traefik[🚦<br/>Traefik<br/>Container]
    Navigateur -->|HTTPS 443| Traefik
    subgraph DH["🐳 Docker Host"]
        subgraph devops ["🌐 devops (Docker network)"]
            Traefik --> Mailpit["📦 <br/>Mailpit<br/>Container"]
            Mailpit --- LabelsTraefik["🏷️<br/>Labels Traefik<br/>
            traefik.enable=true<br/>
            router mailpit (http)<br/>
            → redirect HTTPS<br/>
            router mailpit-secure<br/>
            service port 8025"]
        end
    end
    Traefik --> Redirection["🔁<br/>Redirection HTTP → HTTPS"]
    Traefik --> TLS["🔐<br/>TLS / Certificat"]
    Traefik --> Dashboard["👁️<br/>Dashboard :8080"]
    classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
    class Navigateur,DH cluster;
    classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
    class Traefik,Mailpit containerStyle;
    classDef volumeStyle fill:#ddf,stroke:#00d,stroke-width:2px;
    class LabelsTraefik,Redirection,TLS,Dashboard volumeStyle;
</mermaid>

Il ne reste plus qu'à configurer dans votre application l'envoi des emails vers `mailpit.domain.tld` - toujours à remplacer par le votre - sur le port `1025` 👍️
Et accéder à https://mailpit.domain.tld pour les visualiser ! 
