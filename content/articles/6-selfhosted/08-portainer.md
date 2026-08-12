---
title: "Docker – Portainer"
description: "Découvrez comment installer et configurer Portainer avec Docker : interface web pour gérer vos conteneurs, images, volumes et réseaux sans passer par la ligne de commande."
icon: "i-mdi:docker"
article_id: "docker-portainer-init"
color: "blue"
draft: false
publishedAt: '2026-08-12'
---

#### 📌 Portainer ![Portainer](/img/portainer.webp){ width=30px }

Au fil des articles de la série sur le CI/CD, votre `docker-compose.yml` s'est étoffé : Jenkins, SonarQube, n8n, Linkwarden, OpenProject… Vérifier l'état d'un conteneur, consulter ses logs ou identifier les ressources qui occupent inutilement le disque à coup de `docker ps` et `docker logs` devient vite fastidieux.

[Portainer](https://www.portainer.io){:target="_blank"} est l'interface web la plus répandue pour gérer Docker sans quitter le navigateur :

* **Vue d'ensemble** : conteneurs, images, volumes, réseaux, tout est visible en un coup d'œil
* **Logs et console** : consultez les logs ou ouvrez un terminal dans un conteneur, sans SSH
* **Déploiement de stacks** : lancez un `docker-compose.yml` directement depuis l'interface
* **Gestion multi-environnements** : plusieurs hôtes Docker, un seul dashboard
* **Open-source** : édition Community gratuite, largement suffisante pour un usage personnel ou freelance

#####

Pourquoi l'ajouter à la stack ? Pas pour remplacer le `docker-compose.yml` — vous continuerez à versionner vos fichiers comme avant — mais pour les journées où vous avez juste besoin de vérifier rapidement pourquoi un conteneur redémarre en boucle, sans rouvrir un terminal SSH pour ça.

<mermaid>
graph TD
  Navigateur["🌍 Navigateur<br/>https://portainer.domain.tld"] -->|HTTPS 443| Traefik["🚦<br/>Traefik"]
  subgraph DH["🐳 Docker Host"]
      subgraph local_dev["🌐 local_dev (Docker network)"]
          Traefik --> Portainer["📦<br/>Portainer<br/>:9000"]
      end
      Portainer -.->|docker.sock| Daemon["⚙️<br/>Docker daemon"]
  end
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  class Navigateur,DH cluster;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Traefik,Portainer,Daemon containerStyle;
</mermaid>

#### ⚙️ docker-compose.yml

```yml [docker-compose.yml]
services:
  portainer:
    image: portainer/portainer-ce:sts
    restart: unless-stopped
    command: -H unix:///var/run/docker.sock
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./.docker/portainer/data:/data
    environment:
      TZ: "Europe/Paris"
    labels:
      # Ajout dans traefik
      - "traefik.enable=true"

      # HTTP
      - "traefik.http.routers.portainer.rule=Host(`portainer.domain.tld`)"
      - "traefik.http.routers.portainer.entrypoints=http"

      # HTTPS
      - "traefik.http.routers.portainer-secure.service=portainer-secure"
      - "traefik.http.routers.portainer-secure.rule=Host(`portainer.domain.tld`)"
      - "traefik.http.routers.portainer-secure.entrypoints=https"
      - "traefik.http.routers.portainer-secure.tls=true"

      # Port interne
      - "traefik.http.services.portainer-secure.loadbalancer.server.port=9000"
    profiles:
      - freelance
      - devops
    networks:
      local_dev:
        aliases:
          - portainer.domain.tld

networks:
  local_dev:
    external: true
```

##### Explications

::tool-table
| Paramètre | Rôle |
|-----------|------|
| `command: -H unix:///var/run/docker.sock` | Indique à Portainer de piloter le daemon Docker via le socket local |
| `/var/run/docker.sock:...:ro` | Monte le fichier socket en lecture seule dans le conteneur — ⚠️ ce flag ne restreint pas les appels que Portainer peut faire à l'API Docker via ce socket, voir l'avertissement ci-dessous |
| `./.docker/portainer/data:/data` | Persistance de la configuration Portainer (utilisateurs, environnements, endpoints) |
| `image: portainer-ce:sts` | Version Community, canal STS (Short-Term Support) — c'est aussi le canal utilisé dans l'exemple officiel de la documentation Portainer pour un déploiement derrière Traefik |
| `profiles` | Activé uniquement dans les contextes `freelance` et `devops`, comme les autres outils d'administration de la stack |
::

######

> ⚠️ Monter `/var/run/docker.sock` donne à Portainer un accès très privilégié au daemon Docker. L'option `:ro` du montage restreint seulement les permissions du *fichier* socket dans le conteneur — il ne transforme pas l'API Docker en accès lecture seule pour autant : Portainer peut toujours demander au daemon de créer, modifier ou supprimer des conteneurs, volumes et réseaux. Considérez donc Portainer comme une interface d'administration de l'hôte, pas comme un simple outil de consultation. Il est important d’assurer sa sécurité : ne l'exposez jamais sans Traefik en frontal, et utilisez un mot de passe robuste dès la première configuration.

[Github](https://github.com/portainer/portainer){:target="_blank"} · [Documentation officielle](https://docs.portainer.io){:target="_blank"}

```bash [.env]
PORTAINER_HOST=portainer.domain.tld
```

#### 🚀 Premier démarrage

```bash
docker compose up -d portainer
```

Rendez-vous sur `https://portainer.domain.tld`. Portainer vous demande de créer le compte administrateur dès la première connexion — vous avez **5 minutes** pour le faire, passé ce délai le conteneur redémarre et il faut relancer `docker compose restart portainer`.

![Portainer - Login](/img/content/portainer-login.png)

Sélectionnez ensuite l'environnement **Docker local** (déjà détecté via le socket monté) pour accéder au dashboard.

![Portainer - Dashboard](/img/content/portainer-dashboard.png)

#### 🗂️ Structure des fichiers

```
.
├── docker-compose.yml
├── .env
└── .docker/
     └── portainer/
         └── data/          ← configuration, utilisateurs, endpoints
```

> 💡 Le dossier `data` ne contient que la configuration de Portainer lui-même, pas vos données applicatives — mais sans lui, vous perdez vos comptes utilisateurs et la liste des environnements déclarés. À inclure dans votre stratégie de sauvegarde comme les autres services de la stack.

#### 🔒 Bonnes pratiques de sécurité

- **Créez le compte administrateur immédiatement** après le premier démarrage — le délai de 5 minutes n'est pas qu'un détail
- **Ne jamais exposer Portainer directement** — toujours derrière Traefik, en HTTPS
- **Ne vous fiez pas au `:ro`** sur le montage du socket — il ne limite pas les opérations que Portainer peut effectuer via l'API Docker, seulement les permissions du fichier dans le conteneur
- **Limitez les comptes utilisateurs** à ce qui est nécessaire — chaque compte avec accès à Portainer a de facto un accès équivalent root sur l'hôte

#### 🔎 Portainer ou Arcane ?

Portainer reste la référence la plus installée, mais son édition Community a perdu des fonctionnalités au fil des versions récentes — RBAC avancé et SSO/OIDC sont désormais réservés à l'édition Business.

Si vous cherchez quelque chose de plus léger et pensé nativement pour du Compose, [Arcane](https://github.com/ofkm/arcane){:target="_blank"} mérite un coup d'œil : plus sobre en ressources, il travaille directement avec vos fichiers `docker-compose.yml` sur disque plutôt que de les stocker dans sa propre base. En contrepartie, il est plus jeune que Portainer et son écosystème est encore limité.

Le choix dépend surtout de votre usage : Portainer pour une interface éprouvée avec beaucoup de documentation, Arcane si vous privilégiez un outil léger et Git-friendly.

> 💡 Portainer sait aussi gérer un cluster Docker Swarm ou Kubernetes depuis la même interface, en plus d'un simple hôte Docker. Ce n'est pas un besoin que j'ai aujourd'hui sur cette stack — un seul hôte suffit largement pour l'usage visé ici — mais si votre infrastructure grandit vers plusieurs nœuds, ce sera l'objet d'un prochain article dédié.

#### ✅ Conclusion

Compose décrit l'infrastructure. Portainer permet de l'observer et de l'administrer.

Il ne remplace pas votre `docker-compose.yml` versionné — il vient simplement s'ajouter par-dessus pour les vérifications rapides du quotidien : un conteneur qui redémarre en boucle, un volume qu'on a oublié, un espace disque à libérer. Le genre de tâche pour laquelle rouvrir un terminal SSH est disproportionné.

Combiné à Traefik pour l'accès HTTPS, il referme une dernière brique pratique de la stack : celle qui rend la supervision au quotidien plus rapide, sans jamais devenir indispensable.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::