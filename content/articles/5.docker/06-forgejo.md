---
title: "Docker - Forgejo"
description: "Découvrez Forgejo avec Docker : forge Git self-hosted complète pour gérer vos dépôts, pull requests, issues et projets, sans dépendre de GitHub ou GitLab."
icon: "i-mdi:docker"
article_id: "6-docker-forgejo-init"
color: "blue"
draft: false
publishedAt: '2026-07-08'
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

---

#### 🧩 Schéma

<mermaid>
graph LR
  Browser["🌍 Navigateur"]
  Dev["💻 Git Client\nSSH :222"]
  Traefik["🚦 Traefik\nReverse proxy + TLS"]
  Forgejo["📦 Forgejo\n:3000 / :22"]
  PG["🗄️ PostgreSQL\n:5432"]
  Mailpit["📬 Mailpit\n:1025 SMTP"]
  Browser -->|"HTTPS"| Traefik
  Dev -->|"SSH :222"| Forgejo
  Traefik -->|"HTTP interne"| Forgejo
  Forgejo --> PG
  Forgejo -->|"SMTP interne"| Mailpit
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  classDef dbStyle fill:#ddf,stroke:#00d,stroke-width:2px;
  class Traefik,Forgejo containerStyle;
  class PG,Mailpit dbStyle;
</mermaid>

---

#### ⚙️ Configuration

##### `docker-compose.yml`

```yaml [docker-compose.yml]
services:
  forgejo:
    image: codeberg.org/forgejo/forgejo:14
    restart: unless-stopped
    environment:
      - USER_UID=${UID}
      - USER_GID=${GID}

      # Base de données PostgreSQL
      - FORGEJO__database__DB_TYPE=postgres
      - FORGEJO__database__HOST=${URL_HOST}:5432
      - FORGEJO__database__NAME=${DB_DATABASE_FORGEJO}
      - FORGEJO__database__USER=${DB_USERNAME}
      - FORGEJO__database__PASSWD=${DB_PASSWORD}

      # Webhooks — restreint les hôtes autorisés (Jenkins uniquement)
      - FORGEJO__webhook__ALLOWED_HOST_LIST=${URL_JENKINS}

      # Mailer → Mailpit en interne
      - FORGEJO__mailer__ENABLED=true
      - FORGEJO__mailer__SMTP_ADDR=mailpit
      - FORGEJO__mailer__SMTP_PORT=1025
      - FORGEJO__mailer__FROM=forgejo@domain.tld
      - FORGEJO__mailer__PROTOCOL=smtp
    volumes:
      - ${PWD}/.docker/forgejo:/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    ports:
      - "222:22"     # SSH Git — nécessaire pour les clients Git
    labels:
      - traefik.enable=true

      # HTTP → HTTPS redirection
      - traefik.http.routers.forgejo.rule=Host(`${URL_FORGEJO}`)
      - traefik.http.routers.forgejo.entrypoints=http
      - traefik.http.middlewares.forgejo-redirect.redirectscheme.scheme=https
      - traefik.http.routers.forgejo.middlewares=forgejo-redirect

      # HTTPS
      - traefik.http.routers.forgejo-secure.service=forgejo-secure
      - traefik.http.routers.forgejo-secure.rule=Host(`${URL_FORGEJO}`)
      - traefik.http.routers.forgejo-secure.entrypoints=https
      - traefik.http.routers.forgejo-secure.tls=true

      # Port interne
      - traefik.http.services.forgejo-secure.loadbalancer.server.port=3000
    networks:
      homelab:
        aliases:
          - ${URL_FORGEJO}
    profiles:
      - devops
    depends_on:
      postgresql:
        condition: service_healthy

  postgresql:
    image: postgres:17
    user: "${UID}:${GID}"
    restart: unless-stopped
    volumes:
      - ${PWD}/.docker/postgresql:/var/lib/postgresql/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    environment:
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_DATABASE_FORGEJO}
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -h localhost -U ${DB_USERNAME} -d ${DB_DATABASE_FORGEJO}']
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      homelab:
        aliases:
          - ${URL_HOST}
    profiles:
      - devops

networks:
  homelab:
    name: projects_local_dev
    driver: bridge
    external: true
```

##### `.env`

```bash [.env]
UID=1000
GID=1000

# Forgejo
URL_FORGEJO=forgejo.domain.tld
URL_HOST=postgresql.domain.tld
URL_JENKINS=jenkins.domain.tld

# Base de données
DB_DATABASE_FORGEJO=forgejo
DB_USERNAME=forgejo_user
DB_PASSWORD=superSecretPwd
```

---

#### 🔐 Points de sécurité

Plusieurs éléments méritent attention avant de passer en production.

**Le port `3000` n'est pas exposé directement**

Traefik gère le routage HTTP/HTTPS — exposer le port `3000` sur l'hôte
créerait un accès non sécurisé sans TLS. Seul le port `222` (SSH Git)
est exposé, car les clients Git en ont besoin pour cloner via SSH.

**`FORGEJO__webhook__ALLOWED_HOST_LIST`**

Cette variable restreint les hôtes vers lesquels Forgejo peut envoyer
des webhooks. Sans elle, n'importe quelle URL peut être configurée —
y compris des adresses internes, ce qui exposerait votre réseau Docker
à des attaques SSRF (Server-Side Request Forgery).

En listant uniquement votre Jenkins, vous limitez la surface d'attaque :

```bash
# Un seul hôte autorisé
FORGEJO__webhook__ALLOWED_HOST_LIST=jenkins.domain.tld

# Plusieurs hôtes
FORGEJO__webhook__ALLOWED_HOST_LIST=jenkins.domain.tld,192.168.1.206
```

**La redirection HTTP → HTTPS est obligatoire**

Les deux labels Traefik travaillent ensemble :

```yaml
- traefik.http.middlewares.forgejo-redirect.redirectscheme.scheme=https
- traefik.http.routers.forgejo.middlewares=forgejo-redirect
```

Oublier l'un des deux laisse le port 80 accessible sans redirection.

**`depends_on` avec `service_healthy`**

Forgejo attend que PostgreSQL soit réellement prêt avant de démarrer.
Sans ça, Forgejo peut démarrer avant que la base soit disponible et
échouer silencieusement.

---

#### 📬 Intégration Mailpit

Forgejo envoie des emails pour de nombreux événements : création de
compte, invitations, notifications de PR, mentions, réinitialisation
de mot de passe.

En développement, ces emails ne doivent pas partir vers de vraies
adresses. Mailpit les intercepte et les affiche dans une interface web —
aucun email ne quitte votre infrastructure.

La configuration mailer dans le `docker-compose.yml` pointe directement
vers le service `mailpit` sur le réseau Docker interne :

```yaml
- FORGEJO__mailer__SMTP_ADDR=mailpit   # nom du service Docker
- FORGEJO__mailer__SMTP_PORT=1025      # port SMTP Mailpit
- FORGEJO__mailer__FROM=forgejo@domain.tld
- FORGEJO__mailer__PROTOCOL=smtp
```

Les emails Forgejo que vous verrez dans Mailpit :

::tool-table
| Événement | Déclencheur |
|-----------|-------------|
| Bienvenue | Création de compte |
| Confirmation | Changement d'email |
| Reset | Demande de mot de passe oublié |
| Notification | Mention dans une issue ou PR |
| Invitation | Ajout d'un membre à une organisation |
| Digest | Résumé d'activité (configurable) |
::

Pour tester l'envoi depuis Forgejo, créez un compte ou utilisez
**Paramètres → Notifications → Envoyer un email de test** dans
l'interface d'administration.

> 💡 L'article [Mailpit](/blog/article/5-docker-mailpit-init)
> explique comment déployer et accéder à l'interface web.

---

#### 🚀 Premier démarrage

```bash
docker compose --profile devops up -d

# Suivre les logs
docker compose logs -f forgejo
```

Ouvrez votre navigateur sur `https://forgejo.domain.tld` et suivez
l'assistant d'installation.

![Forgejo - Install](/img/content/forgejo-installation.png){ width=100% }

Une fois l'installation terminée :

![Forgejo - Page d'accueil](/img/content/forgejo.png){ width=100% }

![Forgejo - Dashboard](/img/content/forgejo-dashboard.png){ width=100% }

Configurez votre utilisateur, ajoutez votre clé SSH, créez un dépôt
et pointez votre projet local vers votre instance :

```bash
git remote set-url origin ssh://git@forgejo.domain.tld:222/utilisateur/depot.git
```

> 💡 En ajoutant `POSTGRES_DB` dans les variables d'environnement
> de PostgreSQL, Docker crée automatiquement la base au premier
> démarrage — aucune intervention SQL manuelle nécessaire.

---

#### ✅ Conclusion

Forgejo vous permet de gérer votre code source vous-même, sans dépendre
d'une plateforme en ligne. Avec PostgreSQL pour la persistance, Traefik
pour le TLS et Mailpit pour intercepter les emails en développement,
vous avez une forge complète, sécurisée et intégrée à votre stack.

Dans la suite de cette série, Forgejo jouera le rôle de point d'entrée
du cycle de développement : les développeurs y publieront leur code,
[Jenkins](/blog/article/7-docker-jenkins-init) y récupérera les
modifications via les webhooks, et les pipelines construiront et
déploieront les applications automatiquement.

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::