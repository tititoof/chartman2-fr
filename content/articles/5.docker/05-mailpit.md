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
      local_dev:
        aliases:
          - ${MAILPIT_HOST}
```

```bash [.env]
MAILPIT_PORT=1025
MAILPIT_UI_PORT=8025
MAILPIT_HOST=mailpit.domain.tld
```

Il ne reste plus qu'à configurer dans votre application l'envoi des emails vers `mailpit.domain.tld` sur le port `1025` 👍️
