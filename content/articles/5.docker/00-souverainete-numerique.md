---
title: "self-hosted"
description: "Découvrez pourquoi héberger soi-même ses outils DevOps et ses données - souveraineté numérique, réduction de la dépendance aux SaaS, contrôle, réversibilité et apprentissage technique."
icon: "i-mdi:docker"
article_id: "0-pourquoi-heberger-soi-meme-souverainete-numerique-self-hosted"
color: "blue"
---

Pendant des années, j'ai utilisé GitHub, GitLab, Jenkins, SonarQube ou Vercel sans vraiment me poser de questions. Puis un jour, j'ai voulu comprendre ce qu'il se passait derrière ces interfaces. Cette série est née de cette curiosité.

#### 🏛️ Pourquoi héberger soi-même ?

Avant de vous lancer dans Docker, Traefik, Forgejo, Jenkins ou SonarQube, prenons un moment pour se poser une question importante : pourquoi héberger soi-même ses outils et son infrastructure alors qu'il existe aujourd'hui toute une gamme de services SaaS performants, souvent gratuits ou très faciles à utiliser ?  

Ce n’est pas une question de rejet du cloud ou des plateformes modernes, bien au contraire.  

Des services comme GitHub, GitLab Cloud, Jira, Vercel, Netlify, Heroku ou encore SonarCloud sont parmi les meilleurs pour gagner du temps et accélérer la mise en production de vos projets. Pour certaines équipes, ils représentent même la solution idéale.  

L’objectif de cet article n’est pas de confronter SaaS et auto-hébergement. Il s’agit plutôt de comprendre ce qui se cache derrière ces services, de reprendre en main certains aspects de son infrastructure et de construire une véritable culture DevOps autour du self-hosted.

#### 🧩 Ce qui se cache derrière les plateformes cloud

Derrière chaque plateforme cloud se trouvent des composants bien réels :

- un serveur Git
- un reverse proxy
- des pipelines CI/CD
- des bases de données
- des systèmes de supervision
- des registres d'images Docker
- des mécanismes de déploiement automatisés

Quand on héberge soi-même ces briques, on cesse d'être uniquement utilisateur d'un service pour devenir acteur de son fonctionnement.

C'est là que commencent réellement l'apprentissage, l'autonomie et la compréhension de l'écosystème.


#### 🔒 Souveraineté numérique et contrôle des données

Le self-hosting n’est pas une opposition aux solutions SaaS ni un rejet du cloud. C’est plutôt une réponse concrète à un besoin de souveraineté numérique : il s’agit de décider où résident nos données principales, qui supervise nos services essentiels, et jusqu’où nous sommes prêts à dépendre d’un fournisseur.

Dans cette série, Forgejo héberge le code en priorité. Mais nous continuons aussi à utiliser GitHub en miroir, pour assurer une visibilité publique et avoir un filet de sécurité. Le registre Docker privé stocke les images en local, avec GHCR en backup en cas d’indisponibilité de l’infrastructure. Ce mode hybride est souvent la solution la plus pratique : vous gardez le contrôle de votre infrastructure principale, tandis que le cloud sert à valoriser votre projet et à assurer la résilience.

Héberger soi-même, c’est faire le choix de garder la maîtrise sur ce qui compte vraiment :
- vos dépôts Git principaux restent sur votre serveur,
- vos pipelines CI/CD ne sont pas limités par un quota de minutes,
- vos données de projet sont dans un environnement que vous maîtrisez,
- et vous pouvez gérer vos accès selon vos propres règles.

La souveraineté numérique, ce n’est pas couper tout lien — c’est faire des choix éclairés sur ce que l’on veut garder sous contrôle.

Et dans un contexte où cette question est devenue stratégique en Europe et en France, cela dépasse largement la simple technique.


#### 🔍 Éviter l'effet boîte noire

Les plateformes SaaS rendent notre quotidien plus simple, c’est clair, mais parfois elles ont leur petit défaut : elles cachent toute la complexité technique derrière une interface conviviale.

- Créer un dépôt sur GitHub peut se faire en quelques clics.
- Déployer une application sur Vercel ne prend souvent pas plus d’une minute.
- Configurer une pipeline GitHub Actions se résume à quelques lignes de YAML.

Tout ça peut donner l’impression que tout est magique, un peu comme par enchantement.

Mais en se lançant dans la création de sa propre infrastructure, on découvre ce qui se cache vraiment derrière le bouton "Deploy" :

- comment sont générés les certificats TLS
- comment un reverse proxy oriente les requêtes
- comment une image Docker est construite
- comment une pipeline CI/CD orchestre chaque étape
- comment les sauvegardes et la supervision sont mises en place

Ces découvertes permettent non seulement de mieux maîtriser les outils SaaS quand on y retourne, mais aussi de diagnostiquer plus rapidement les problèmes en production.


#### 💶 Maîtriser les coûts

Pour un développeur indépendant ou une petite équipe, il est facile de voir rapidement ces coûts mensuels s’accumuler :

::tool-table
| Service | Coût mensuel | Lien |
|---------|-------------|---------|
| GitHub Team | 4 USD / utilisateur | [Github](https://github.com/pricing) |
| Jira Software | à partir de 7,91 USD / utilisateur | [Jira](https://www.atlassian.com/fr/software/jira/pricing) |
| Vercel Pro | 20 USD / utilisateur | [Vercel](https://vercel.com/pricing) |
| Heroku Basic | 7 EUR | [Heroku](https://www.salesforce.com/fr/heroku/pricing/?bc=OTH) |
| SonarCloud Team | à partir de 30 EUR | [Sonarcloud](https://www.sonarsource.com/fr/plans-and-pricing/sonarcloud/) |
::

Au final, il n'est pas rare de dépasser **50 à 100 € par mois**, voire davantage selon la taille de l'équipe et les fonctionnalités utilisées.

Avec un VPS à **10 à 20 € par mois**, il devient possible de disposer de ses propres outils de gestion de code, de suivi de projet, d'intégration continue, de déploiement et de supervision.

L'intérêt du self-hosting n'est donc pas seulement financier. Il repose aussi sur la maîtrise technique, la personnalisation et la capacité à bâtir une infrastructure qui correspond parfaitement à vos besoins.


#### 🧠 Comprendre les outils de l'intérieur

Il y a un autre avantage, peut-être un peu moins visible mais tout aussi précieux : construire sa propre infrastructure, c’est aussi une super occasion de mieux comprendre ce qu’on utilise au quotidien.

- En configurant Traefik, vous maîtrisez le routage HTTP, les certificats TLS et les reverse proxies.
- En déployant Jenkins, vous découvrez l’intégration continue, les agents et la gestion des pipelines.
- En administrant une base PostgreSQL, vous vous familiarisez avec les sauvegardes, les migrations et l’optimisation des performances.

Ce n'est pas de la curiosité gratuite : c'est de la compétence directement applicable sur vos missions professionnelles.

Un développeur qui a monté sa propre stack DevOps comprend instinctivement les problématiques d’infrastructure lorsqu’il travaille en production.

C'est exactement ce qui m'a motivé : pas par obligation, mais parce que comprendre les outils de l'intérieur change tout à la façon dont on les utilise — et dont on les conseille à ses clients.

#### 🏗️ Construire un patrimoine technique

Une infrastructure auto-hébergée n'est pas seulement un ensemble de services. C'est aussi un patrimoine technique que vous construisez au fil du temps.

Chaque configuration Docker, chaque pipeline Jenkins, chaque règle Traefik ou stratégie de sauvegarde devient une connaissance réutilisable pour vos futurs projets.

Contrairement à un abonnement SaaS qui disparaît lorsque vous arrêtez de payer, les compétences et l’expérience que vous accumulez restent avec vous. 

Après quelques mois, vous ne possédez pas seulement une infrastructure fonctionnelle : vous possédez une compréhension approfondie de son fonctionnement, de ses points forts et de ses limites.

#### ⚖️ Les limites du self-hosted

Héberger soi-même n'est pas sans contraintes.

- **La disponibilité** : un VPS personnel ou un homelab n'offre pas les mêmes garanties qu'un grand cloud provider.
- **La maintenance** : les mises à jour, les sauvegardes et la surveillance reposent sur vous.
- **La sécurité** : exposer des services sur internet demande de la rigueur.
- **Le temps** : la configuration initiale prend du temps.

Ces contraintes sont réelles. Mais elles sont aussi formatrices. Pour un développeur qui veut progresser, elles valent souvent largement le temps investi.

#### 🔀 Le modèle hybride : self-hosted + cloud en spare

Héberger soi-même ne signifie pas couper les ponts avec les plateformes cloud.

Dans cette stack, Forgejo est la forge principale — tous les commits y arrivent en premier. Mais chaque dépôt est mirrored automatiquement vers GitHub pour deux raisons :

- **La visibilité** : GitHub reste la vitrine du développeur. Vos projets open-source y sont accessibles, indexés, découvrables.
- **La résilience** : si votre serveur est indisponible, le code reste accessible. GitHub devient un filet de sécurité, pas une dépendance.

C'est le même principe pour les images Docker : Jenkins pousse vers votre registry privé en priorité (rapide, sur votre réseau), et vers un registry externe en spare — GHCR, Docker Hub, ou les deux — accessible depuis n'importe où si le homelab est éteint.

Ce modèle hybride est souvent le plus pragmatique :
- Votre infrastructure principale reste sous votre contrôle
- Les plateformes cloud jouent un rôle de backup et de vitrine
- Vous n'êtes jamais totalement dépendant d'un seul point de défaillance

#### 🗺️ Ce que nous allons construire

Dans cette série, nous allons monter brique par brique une stack DevOps complète, entièrement self-hosted et open-source. À la fin, un simple `git push` sur Forgejo déclenchera automatiquement tout le pipeline :

::tool-table
| Outil | Rôle | Spare |
|-------|------|-------|
| 🐳 Docker | Conteneurisation de tous les services | |
| 🔀 Traefik | Reverse proxy, TLS, routage | |
| 🗄️ PostgreSQL | Base de données | |
| 📬 Mailpit | Emails de développement | |
| 🦌 Forgejo | Forge Git self-hosted | GitHub |
| 🧰 Jenkins | Intégration continue | |
| 📊 SonarQube | Qualité de code | SonarCloud |
| 🚀 Coolify | Déploiement automatisé | |
| 📦 Registry | Images Docker privées | GHCR |
| 📋 OpenProject | Gestion de projets | |
::

<mermaid>
graph TD
  DEV["👨‍💻 Développeur\ngit push"] --> FORGEJO["🦌 Forgejo\nForge Git + webhook"]
  FORGEJO --> JENKINS["🧰 Jenkins\nBuild + tests + pipeline"]
  JENKINS --> SONAR["📊 SonarQube\nQuality Gate"]
  JENKINS --> REGISTRY["📦 Registry\nImages Docker"]
  JENKINS --> COOLIFY["🚀 Coolify\nDéploiement automatique"]
  SONAR -->|résultat| JENKINS
  REGISTRY -->|pull| COOLIFY
  COOLIFY --> PROD["✅ Production\nApplication en ligne"]
  subgraph SUPPORT["🛠️ Outils support"]
    PG["🗄️ PostgreSQL"]
    MAIL["📬 Mailpit"]
    TRAEFIK["🔀 Traefik"]
    OP["📋 OpenProject"]
    DOCKER["🐳 Docker"]
  end
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  classDef supportStyle fill:#ddf,stroke:#00d,stroke-width:2px;
  classDef prodStyle fill:#dfd,stroke:#0d0,stroke-width:2px;
  class DEV,FORGEJO cluster;
  class JENKINS,SONAR,REGISTRY,COOLIFY containerStyle;
  class PG,MAIL,TRAEFIK,OP,DOCKER supportStyle;
  class PROD prodStyle;
</mermaid>


#### ✅ Conclusion

Installer et gérer soi-même son environnement, ce n’est pas une démarche rétrograde, bien au contraire ! C’est souvent une façon plus réfléchie de choisir ses outils, de limiter sa dépendance aux plateformes externes et de retrouver la maîtrise totale de son espace technique.

Pour certains projets, le SaaS reste une solution pratique et efficace. Mais pour d’autres, opter pour une infrastructure self-hosted, c’est gagner en liberté, en contrôle et en souveraineté numérique.

C’est justement ce compromis que cette série va vous faire découvrir.

On va partir d’un simple serveur tout nu pour construire peu à peu une plateforme complète de développement et de déploiement.

Chaque article vous apportera une nouvelle pièce au puzzle, jusqu’à obtenir une chaîne CI/CD entièrement maîtrisée, reproductible et prête à accueillir de vrais projets.

Et pour commencer, place à la base de tout l’écosystème : [Docker](/blog/article/1-docker-description).

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::