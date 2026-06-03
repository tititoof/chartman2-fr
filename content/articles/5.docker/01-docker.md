---
title: "Docker"
description: "Apprenez Docker, la plateforme open source qui permet de créer, exécuter et déployer des applications dans des conteneurs légers, portables et reproductibles."
icon: "i-mdi:docker"
article_id: "1-docker-description"
color: "blue"
---

#### 📌 Qu’est-ce que Docker ?

Docker, c’est une plateforme open source super pratique qui permet de créer, déployer et faire tourner des applications dans ce qu’on appelle des conteneurs.

Un conteneur, c’est comme une petite boîte autonome qui contient tout ce qu’il faut pour faire fonctionner ton application : le code, les bibliothèques, les outils système et toutes les dépendances nécessaires.

Contrairement aux machines virtuelles (VM), Docker ne virtuelise pas tout un système d’exploitation. Il partage le noyau de l’OS de ton ordinateur, ce qui le rend beaucoup plus léger et rapide.

##### 🛠️ Une plateforme open-source

L’open-source, c’est la possibilité pour tout le monde d’accéder au code source de Docker. Cela signifie que les entreprises comme les particuliers peuvent le personnaliser, le faire évoluer et le partager gratuitement, sans payer de licence.

Docker, ce n’est pas juste un simple outil : c’est tout un univers ! On parle d’un véritable écosystème avec le Docker Engine (le moteur qui fait tourner vos conteneurs), Docker Compose (pour gérer plusieurs conteneurs en même temps), Dockerfile (pour créer vos images), Docker Hub (le grand registre d’images en ligne) et plein d’autres fonctionnalités.

##### 🧩 Les conteneurs : des « boîtes » autonomes

Un conteneur, c’est comme une petite boîte contenant tout ce qu’une application a besoin pour fonctionner : le code, les bibliothèques (comme NPM ou Composer), les dépendances système (les packages Linux, les fichiers de configuration) et même certains outils (PHP, MySQL, Redis, etc.).

Et le mieux, c’est que ces conteneurs sont très légers : ils ne comprennent pas un système d’exploitation entier, juste un petit système minimal, ce qui permet d’économiser de la mémoire et du CPU.

Chaque conteneur fonctionne dans son propre espace, séparé des autres. Deux conteneurs ne partagent pas leurs bibliothèques sauf si vous le décidez, ce qui évite les conflits de versions et facilite la gestion.

<mermaid>
flowchart LR
  subgraph Client
    subgraph entrypointClient [" "]
      direction LR
      cli["CLI"]
      api["API"]
      dockerdesktop["Docker Desktop"]
    end
  end
  subgraph "Moteur Docker"
    direction TB
    demon(["Démon"])
    subgraph images
      direction TB
      image2["Image 1"]
      image3["Image 2"]
      image1["Image 3"]
    end
    subgraph containers
      direction TB
      container1["Conteneur 1"]
      container3["Conteneur 2"]
      container2["Conteneur 3"]
    end
  end
  subgraph registries["Registres"]
    private["registry privé"]
    ghrc["ghrc.io"]
    hubdocker["hub.docker.com"]
  end
  entrypointClient e01@-->|build| demon
  entrypointClient e02@-->|run| demon
  entrypointClient e03@-->|pull| demon
  entrypointClient e04@-->|push| demon
  demon -->|build| image2
  demon -->|run| image3
  image3 -->|run| container3
  registries -->|pull| image1
  demon -->|pull| registries
  image1 --> |push| registries
  demon --> |push| image1
  linkStyle 0,4 stroke:blue;
  linkStyle 1,5,6 stroke:green;
  linkStyle 2,7,8 stroke:red;
  linkStyle 3,9,10 stroke:orange;
</mermaid>

#### 🆚 Docker vs Machine Virtuelle

::tool-table
| | Machine Virtuelle | Conteneur Docker |
|---|---|---|
| **OS complet** | ✅ Oui (plusieurs Go) | ❌ Non (noyau partagé) |
| **Démarrage** | Plusieurs minutes | Quelques secondes |
| **Poids** | Plusieurs Go | Quelques Mo |
| **Isolation** | Totale | Par processus |
| **Performance** | Plus lourde | Proche du natif |
| **Cas d'usage** | OS différents, isolation totale | Microservices, CI/CD, dev |
::

#### 🖥️ Les commandes de base

```bash
# Télécharger une image
docker pull nginx

# Lancer un conteneur
docker run -d -p 8080:80 nginx

# Lister les conteneurs actifs
docker ps

# Arrêter un conteneur
docker stop <id>

# Supprimer un conteneur
docker rm <id>

# Lister les images téléchargées
docker images
```

#### 🚀 Pourquoi adopter Docker ?

- **Une isolation parfaite des applications** : Chaque conteneur fonctionne de manière indépendante. Vous pouvez donc gérer plusieurs projets sans risque de conflits de dépendances.

- **Une portabilité sans souci** : Vos conteneurs fonctionnent partout où Docker est installé. Idéal pour passer facilement du poste de développement au serveur de production.

- **Une utilisation efficace des ressources** : En partageant le noyau de l’ordinateur hôte, les conteneurs évitent la lourdeur des machines virtuelles et boostent la performance.

- **Un écosystème dynamique** : Avec Docker Hub et une communauté active, des milliers d’images sont à votre disposition pour accélérer vos projets.

#### 🧰 Pourquoi c’est génial pour les développeurs ?

En phase de création, Docker est un véritable atout car il garantit que tous les environnements sont identiques. Fini de passer des heures à configurer votre poste pour chaque projet : un simple `docker compose up` et toute l’infrastructure se met en place — base de données, serveur web, cache…

Chaque membre de l’équipe travaille dans le même environnement, ce qui évite le classique « ça marche chez moi mais pas chez toi ». Les tests sont plus fiables, puisqu’ils se déroulent dans des conteneurs identiques à ceux utilisés en production. Et si vous souhaitez tester une nouvelle version de PHP, MySQL ou Redis, pas besoin de prendre le risque : Docker permet de le faire rapidement, sans perturber votre système principal.

En résumé, Docker n’est pas juste un outil de déploiement. C’est un véritable compagnon du quotidien pour les développeurs. Il simplifie la configuration, facilite la collaboration, assure la stabilité des projets, garantit une cohérence d’environnement et optimise l’utilisation des ressources. Un outil incontournable pour tous les projets modernes !

#### ✅ Conclusion

Docker a profondément changé la manière de développer, tester et déployer des applications. En encapsulant chaque service dans un conteneur léger et autonome, il permet de reproduire facilement un environnement complet, quel que soit le système utilisé ou l'équipe qui travaille sur le projet.

Au-delà de la simple exécution d'applications, Docker est devenu un véritable standard de l'industrie. Des startups aux grandes entreprises, il est aujourd'hui utilisé pour construire des plateformes modernes, automatiser les déploiements et simplifier la gestion des infrastructures.

Dans cette série d'articles, Docker servira de fondation à l'ensemble de notre environnement de développement. Nous allons progressivement ajouter les briques nécessaires à la construction d'une plateforme complète : Traefik pour le routage et le HTTPS, PostgreSQL pour les données, Mailpit pour les emails de développement, Forgejo pour l'hébergement Git, Jenkins pour l'intégration continue et bien d'autres services encore.

L'objectif n'est pas seulement d'apprendre Docker, mais de construire pas à pas un écosystème cohérent, reproductible et entièrement maîtrisé. Une fois ces bases en place, lancer un nouveau projet ou déployer une nouvelle application ne prendra plus que quelques commandes.

Dans le prochain article, nous découvrirons comment orchestrer plusieurs conteneurs 
simultanément grâce à [Docker Compose](/blog/article/2-docker-compose-description), 
le premier outil indispensable de notre future plateforme.


---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::