---
title: "Docker - Mailpit"
description: "Découvrez Mailpit avec Docker : intercepter les emails en développement, tester l’envoi sans envoyer de vrais messages, et visualiser les emails dans une interface web."
icon: "i-mdi:docker"
article_id: "5-docker-mailpit-init"
color: "blue"
draft: false
publishedAt: '2026-07-08'
---

#### 📌 Mailpit ![Mailpit](/img/mailpit.png){ width=30px }


[Mailpit](https://github.com/axllent/mailpit){:target="\_blank"} est un outil pour les développeurs. Il permet d’intercepter tous les emails envoyés par votre application, mais sans les envoyer à de vrais destinataires. À la place, vous pouvez voir tous ces emails dans une interface sur votre ordinateur, en direct, dans votre navigateur.

C’est comme une boîte aux lettres virtuelle : tous vos emails passent par Mailpit, mais ne quittent jamais votre machine. Cela évite d’envoyer des faux emails à de vraies personnes quand vous testez votre application.

Ce que vous pouvez faire avec Mailpit :

- **Serveur SMTP intégré** : votre application envoie vers Mailpit (`SMTP_HOST=mailpit`),
  les emails sont interceptés sans quitter votre environnement.
- **Interface web** : visualisez les emails capturés (HTML, texte brut, pièces jointes,
  headers) directement dans votre navigateur.
- **API REST** : récupérez, analysez ou supprimez les emails capturés pour automatiser
  vos tests. [Documentation API](https://mailpit.axllent.org/docs/api-v1/){:target="\_blank"}
- **Léger et sans dépendances** : pas de Postfix, Sendmail ou autre — un seul binaire, parfait pour Docker et les pipelines CI/CD.


#### ⚙️ Exemple

Voici comment intégrer Mailpit avec [Traefik](/blog/article/3-docker-traefik-introduction){:target="\_blank"} :

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

> 💡 Remplacez `traefik:v3` par une version épinglée (ex. `traefik:v3.6.7`) en production
> pour éviter les mises à jour non contrôlées. Consultez les
> [releases officielles](https://github.com/traefik/traefik/releases){:target="\_blank"}.

> ⚠️ `--api.insecure=true` expose le dashboard Traefik sans authentification.
> Acceptable en développement local, à ne jamais utiliser en production.

> ⚠️ La section `ports` du service Mailpit est utile en développement pour accéder
> directement au service. En production, supprimez-la : Traefik gère l'accès,
> exposer ces ports publiquement constitue une surface d'attaque inutile.


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

#### 🔧 Configuration dans votre application

Une fois Mailpit lancé, configurez votre application pour envoyer ses emails vers lui.

**Laravel / Symfony (.env applicatif) :**
```bash [.env]
MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
```

**Rails (config/environments/development.rb) :**
```ruby
config.action_mailer.smtp_settings = {
  address: "mailpit",
  port: 1025
}
```

> 💡 Utilisez `mailpit` comme hostname si votre application tourne dans le même
> réseau Docker (`devops`). Utilisez `mailpit.domain.tld` uniquement pour y accéder
> depuis votre navigateur ou depuis l'extérieur du réseau.

#### 🧪 Tester via l'API REST

Mailpit expose une API REST pour automatiser vos tests d'emails.

```bash
# Lister les emails reçus
curl http://mailpit.domain.tld/api/v1/messages

# Supprimer tous les emails
curl -X DELETE http://mailpit.domain.tld/api/v1/messages
```

Pratique dans un pipeline Jenkins pour vérifier qu'un email de confirmation a bien été envoyé après une action utilisateur.

#### ✅ Conclusion

Mailpit est simple à mettre en place, ne nécessite aucune dépendance externe et s'intègre parfaitement avec la plupart des frameworks comme Laravel, Symfony ou Rails. En quelques lignes de configuration Docker, vous disposez d'un intercepteur d'emails fiable pour tous vos environnements de développement.

Dans le prochain article, nous allons mettre en place [Forgejo](/blog/article/6-docker-forgejo-init) — la forge Git self-hosted qui hébergera vos dépôts de code et déclenchera automatiquement vos pipelines CI/CD via des webhooks vers Jenkins.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::