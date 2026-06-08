---
title: 'Reactive Resume — Self-hosted'
description: 'Hébergez votre CV sur votre propre infrastructure avec Reactive Resume, Docker et Traefik'
icon: 'i-mdi:file-account-outline'
article_id: 'reactive-resume-self-hosted'
color: 'blue'
draft: false
publishedAt: '2026-06-10'
---

#### 📄 Reactive Resume — Votre CV, chez vous

Pour un développeur, un CV n'est pas seulement un document PDF. C'est souvent
la porte d'entrée vers une mission, un entretien ou un nouveau projet.

Plutôt que de dépendre d'un service tiers, pourquoi ne pas héberger votre CV
sur votre propre infrastructure ?

Reactive Resume est un éditeur de CV open-source moderne qui permet de créer,
gérer et publier plusieurs CV depuis une interface web élégante.

Vous bénéficiez notamment de :

- 🎨 Un éditeur en temps réel
- 📄 Un export PDF professionnel
- 🌍 Une URL publique partageable
- 🗂️ Plusieurs versions de CV selon vos clients ou postes visés
- 🔒 Un contrôle total sur vos données

Le tout sans abonnement, sans limitation artificielle et sans dépendance à une plateforme externe.

> 💡 Le dépôt officiel :
> [github.com/AmruthPillai/Reactive-Resume](https://github.com/AmruthPillai/Reactive-Resume){:target="_blank"}


#### 🏠 Pourquoi l'héberger soi-même ?

Reactive Resume est disponible en ligne, mais l'intégrer à votre propre
infrastructure présente plusieurs avantages.

- Vos données restent sur votre serveur.
- Vous pouvez personnaliser les sauvegardes.
- L'application s'intègre naturellement à votre stack DevOps.
- Vous contrôlez les mises à jour et les évolutions.
- Vous disposez d'une URL professionnelle sous votre propre domaine.

Pour un développeur freelance ou un consultant, cela permet également de centraliser portfolio, CV, forge Git et outils professionnels au même endroit.


#### 🗺️ Schéma d'architecture

<mermaid>
graph LR
  User["🌍 Navigateur"]
  Traefik["🚦 Traefik\nReverse proxy + TLS"]
  Resume["📄 Reactive Resume\n:3000"]
  PG["🗄️ PostgreSQL\n:5432"]
  Volume["💾 Volume local\n.docker/reactive-resume"]
  User -->|"HTTPS"| Traefik
  Traefik -->|"HTTP interne"| Resume
  Resume --> PG
  Resume --> Volume
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  classDef dbStyle fill:#ddf,stroke:#00d,stroke-width:2px;
  class Traefik,Resume containerStyle;
  class PG,Volume dbStyle;
</mermaid>


#### ⚙️ Prérequis

Cette installation s'appuie sur l'infrastructure mise en place dans la
[série DevOps](/blog/article/0-pourquoi-heberger-soi-meme-souverainete-numerique-self-hosted) :

::tool-table
| Service | Rôle | Article |
|---------|------|---------|
| Traefik | Reverse proxy + TLS | [Article 3](/blog/article/3-docker-traefik-introduction) |
| PostgreSQL | Base de données | [Article 4](/blog/article/4-docker-postgresql-init) |
| Réseau `projects_local_dev` | Réseau Docker partagé | [Article 2](/blog/article/2-docker-compose-description) |
::

> 💡 Si PostgreSQL tourne déjà sur votre stack, vous pouvez créer
> une base dédiée à Reactive Resume sans service supplémentaire.

#### 🚀 Mise en place

##### 1. Créer la base de données

Connectez-vous à votre instance PostgreSQL et créez une base dédiée :

```bash
docker compose exec postgresql psql -U postgres
```

```sql
CREATE USER reactive_user WITH PASSWORD 'votre_mot_de_passe';
CREATE DATABASE reactive_resume OWNER reactive_user;
GRANT ALL PRIVILEGES ON DATABASE reactive_resume TO reactive_user;
\q
```

##### 2. Créer `.env-reactive-resume`

Créez ce fichier à la racine de votre projet Docker. Il ne doit **jamais**
être commité — ajoutez-le à votre `.gitignore` :

```bash [.env-reactive-resume]
# Application
PORT=3000
NODE_ENV=production
PUBLIC_URL=https://reactive-resume.domain.tld
ALLOWED_ORIGINS=https://reactive-resume.domain.tld

# Base de données
DATABASE_URL=postgresql://reactive_user:votre_mot_de_passe@postgresql:5432/reactive_resume

# Secrets — générez avec : openssl rand -hex 32
ACCESS_TOKEN_SECRET=changez_moi_openssl_rand_hex_32
REFRESH_TOKEN_SECRET=changez_moi_openssl_rand_hex_32

# Stockage local (volume monté)
STORAGE_PROVIDER=local

# Email (optionnel — utilise Mailpit si disponible)
MAIL_FROM=noreply@chartman2-fr.ovh
SMTP_URL=smtp://mailpit:1025
```

Générez les secrets :

```bash
openssl rand -hex 32  # pour ACCESS_TOKEN_SECRET
openssl rand -hex 32  # pour REFRESH_TOKEN_SECRET
```

> ⚠️ `DATABASE_URL` pointe vers `postgresql` — le nom du service PostgreSQL
> dans votre réseau Docker. Adaptez si votre service a un autre nom.

##### 3. Ajouter le service dans `docker-compose.yml`

```yaml [docker-compose.yml]
services:
  reactive-resume:
    image: amruthpillai/reactive-resume:latest
    restart: unless-stopped
    env_file:
      - .env-reactive-resume
    volumes:
      # Stockage local des uploads quand S3 n'est pas configuré
      - ./.docker/reactive-resume:/app/data
    labels:
      - "traefik.enable=true"

      # HTTP → HTTPS redirection
      - "traefik.http.routers.reactive-resume.rule=Host(`reactive-resume.domain.tld`)"
      - "traefik.http.routers.reactive-resume.entrypoints=http"
      - "traefik.http.middlewares.reactive-resume-redirect.redirectscheme.scheme=https"
      - "traefik.http.routers.reactive-resume.middlewares=reactive-resume-redirect"

      # HTTPS
      - "traefik.http.routers.reactive-resume-secure.service=reactive-resume-secure"
      - "traefik.http.routers.reactive-resume-secure.rule=Host(`reactive-resume.domain.tld`)"
      - "traefik.http.routers.reactive-resume-secure.entrypoints=https"
      - "traefik.http.routers.reactive-resume-secure.tls=true"

      # Port interne
      - "traefik.http.services.reactive-resume-secure.loadbalancer.server.port=3000"
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1));"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - homelab

networks:
  homelab:
    name: projects_local_dev
    driver: bridge
    external: true
```

##### 4. Healthcheck — vérification de l'état

Le conteneur expose un endpoint `/api/health` utilisé par Docker pour vérifier
que l'application est opérationnelle.

En cas de problème au démarrage ou lors d'une mise à jour, cette vérification
permet de détecter rapidement un service défaillant.

##### 5. Démarrer le service

Ajoutez la ligne dans votre `.gitignore` :

```bash
echo ".env-reactive-resume" >> .gitignore
```

Démarrez le service :

```bash
docker compose up -d reactive-resume

# Vérifier que le service est healthy
docker compose ps reactive-resume

# Suivre les logs
docker compose logs -f reactive-resume
```

Une fois le statut `healthy`, l'application est accessible sur
`https://reactive-resume.domain.tld`.

##### 6. Premier accès et configuration

À la première ouverture, créez votre compte administrateur via l'interface web.

Les fonctionnalités clés :

🎨 **Éditeur en temps réel** : modification et aperçu côte à côte.
📄 **Export PDF** : rendu via Chromium headless — propre et fidèle.
🔗 **URL publique** : chaque CV a une URL partageable (`/r/votre-slug`).
🌍 **Multi-langues** : interface disponible en français.
📋 **Templates** : plusieurs templates professionnels inclus.

> 💡 Pour activer l'export PDF, vous pouvez connecter un service Chrome
> headless via les variables `CHROME_TOKEN` et `CHROME_URL`. Sans ça,
> Reactive Resume tente d'utiliser Chromium embarqué — fonctionnel mais
> plus lent.

#### 🔖 Ajout au `docker-compose.yml`

```bash
git add docker-compose.yml .gitignore
git commit -m "feat: ajout Reactive Resume self-hosted"
git push origin main
```
#### 💾 Sauvegardes

Les CV, profils et paramètres sont stockés dans PostgreSQL.

Si vous avez déjà mis en place Postgresus et RustFS dans la série DevOps,
aucune configuration supplémentaire n'est nécessaire : les sauvegardes
de Reactive Resume seront automatiquement intégrées à votre stratégie
de sauvegarde existante.

Vous disposez ainsi d'un historique restaurable de vos données sans dépendre
d'un fournisseur externe.

#### ✅ Résumé

::tool-table
| Élément | Détail |
|---------|--------|
| Image | `amruthpillai/reactive-resume:latest` |
| Port interne | `3000` |
| Base de données | PostgreSQL (instance partagée) |
| Stockage | Volume local `./.docker/reactive-resume` |
| URL | `https://reactive-resume.domain.tld` |
| Healthcheck | `node` → `/api/health` toutes les 30s |
::

#### ✅ Conclusion

Avec quelques conteneurs Docker et une base PostgreSQL existante, Reactive Resume
s'intègre facilement à une infrastructure personnelle.

Vous disposez ainsi d'un outil moderne pour gérer vos CV, publier différentes
versions selon vos besoins et conserver la maîtrise complète de vos données.

Ce n'est probablement pas l'application la plus critique de votre homelab,
mais c'est souvent l'une des plus visibles : celle qui présente votre parcours,
vos compétences et votre travail aux futurs clients, recruteurs ou collaborateurs.

Autant qu'elle soit hébergée chez vous.

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::