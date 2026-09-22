---
title: "De Git à OpenProject : une CI/CD complète avec Forgejo, Jenkins et SonarQube"
description: "Après la théorie, la pratique : une démo complète où un simple push déclenche Jenkins, les tests, SonarQube, le Quality Gate et un commentaire dans OpenProject. Architecture, pièges rencontrés et code réel consultable."
icon: "i-mdi:docker"
article_id: "14-docker-demo-cicd"
color: "blue"
draft: false
publishedAt: '2026-09-21'
---

#### 📌 De la théorie à une démo qui tourne

Les [articles précédents de cette série](/blog/category/docker) ont présenté les briques une par une : Forgejo, Jenkins, SonarQube, OpenProject, Coolify, les sauvegardes. Chaque outil fonctionne très bien seul, mais une infrastructure DevOps ne prend vraiment son sens que lorsqu'ils travaillent ensemble. Cette fois, je ne présente pas un nouvel outil : je mets toute la chaîne à l'épreuve.

J'ai donc monté une démo complète sur un serveur dédié, avec deux « organisations » fictives — **Harpers** et **Zhentarim** — chacune disposant de ses dépôts, de ses pipelines et de son suivi de projet. L'objectif : montrer concrètement ce que je sais mettre en place, avec du code réel que vous pouvez consulter.

Un simple `git push` déclenche :

1. **Forgejo** notifie Jenkins par webhook
2. **Jenkins** récupère le code et lance le pipeline sur un agent Docker éphémère
3. les **tests** s'exécutent avec mesure de couverture
4. **SonarQube** analyse le code, avec la couverture
5. le **Quality Gate** bloque le pipeline si la qualité n'est pas au niveau
6. **OpenProject** reçoit un commentaire sur la tâche citée dans le commit (`OP#42`)

#### 🏗️ Architecture

<mermaid>
graph LR
  Dev["👩‍💻 Développeur"] -->|git push| Forgejo["🦊 Forgejo"]
  Forgejo -->|webhook| Jenkins["🧰 Jenkins"]
  Jenkins -->|agent éphémère| Vue["🐳 Agent Node / pnpm"]
  Jenkins -->|agent éphémère| Rails["🐳 Agent Ruby / RSpec"]
  Vue -->|sonar-scanner| Sonar["📊 SonarQube"]
  Rails -->|sonar-scanner| Sonar
  Sonar -->|webhook Quality Gate| Jenkins
  Jenkins -->|commentaire OP#id| OpenProject["📋 OpenProject"]
  Rails --> PG["🗄️ PostgreSQL de CI"]
</mermaid>

Quelques choix structurants :

- **Une organisation Forgejo par organisation fictive**, et un *Organization Folder* Jenkins par organisation : ajouter un dépôt ne demande **aucune** configuration Jenkins, il est découvert tout seul.
- **Deux agents Docker dédiés**, un par techno (Node/pnpm pour le front Nuxt, Ruby pour le back Rails). Ils sont créés à la demande et détruits après le build.
- **Un seul Postgres de CI** partagé pour les tests du backend, plutôt qu'un conteneur par build : ça évite de donner l'accès au socket Docker aux agents. Les bases de test sont isolées logiquement par build, ce qui suffit pour cette démo mais mériterait une isolation plus stricte à fort volume.
- **Les deux projets de démo** sont un front Nuxt et un back Rails (une application de gestion de tâches).

#### ⚙️ Le pipeline

Voici le pipeline du frontend, simplifié. Il est tel que je l'ai déployé, sans les étapes de déploiement réel :

```groovy
pipeline {
  agent { node { label 'agent_vuejs_1' } }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Install')  { steps { sh 'pnpm install --no-frozen-lockfile' } }
    stage('Tests') {
      steps { sh 'pnpm test --run --coverage --reporter=junit --outputFile=sonar-report.xml' }
      post { always { junit allowEmptyResults: true, testResults: 'sonar-report.xml' } }
    }
    stage('SonarQube') {
      steps {
        withSonarQubeEnv('sonarqube-server') {
          sh 'sonar-scanner/bin/sonar-scanner -Dsonar.projectKey=${PROJECT_KEY} ...'
        }
      }
    }
    stage('Quality Gate') {
      steps { timeout(time: 5, unit: 'MINUTES') { waitForQualityGate abortPipeline: true } }
    }
  }
  post { always { cleanWs() } }
}
```

La clé du projet SonarQube est calculée depuis le nom du job (`organisation-dépôt`) : un nouveau dépôt s'analyse sans modifier le pipeline.

Voici la vue Jenkins du backend Harpers, telle que la voit un compte de démonstration : les neuf étapes, le résultat du Quality Gate SonarQube, et l'historique des builds. Les deux échecs des premiers essais (`#21`, `#22`) laissent place à une série de builds verts une fois les pièges corrigés.

![Jenkins - pipeline du backend Harpers](/img/content/demo-jenkins-pipeline.jpg){ width=100% }

##### Lier un commit à une tâche

Un commit dont le message contient `OP#42` publie automatiquement, sur la tâche 42 d'OpenProject, un commentaire avec le lien vers le commit. Un stage Jenkins parcourt `currentBuild.changeSets`, extrait les références avec une expression régulière, puis appelle l'API OpenProject avec un compte technique aux droits minimaux (*Work package commenter*).

C'est simple, mais c'est ce qui rend le suivi de projet **vivant** : l'organisation voit l'avancement sans que personne ait à recopier quoi que ce soit.

Voici le début de ce stage dans le `jenkinsfile` du dépôt `harpers/todo-frontend`, tel qu'il est consultable publiquement :

![Forgejo - jenkinsfile du dépôt todo-frontend](/img/content/demo-forgejo-jenkinsfile.png){ width=100% }

Et le résultat côté OpenProject : la tâche #37 a reçu, sans aucune intervention manuelle, un commentaire pour chaque commit qui la mentionne, avec le message et le lien vers Forgejo.

![OpenProject - commentaires automatiques sur la tâche #37](/img/content/demo-openproject-tache.jpg){ width=100% }

#### 📈 Résultats

Les quatre pipelines (2 organisations × front et back) sont verts, avec une vraie couverture de code remontée dans SonarQube — ces taux sont ceux des projets de démonstration, pas un seuil de qualité universel à reproduire tel quel :

::tool-table
| Projet | Couverture |
|---|---|
| Frontend (Nuxt, Vitest) | **61,5 %** |
| Backend (Rails, RSpec) | **96,9 %** |
::

Un build est déclenché en une vingtaine de secondes après un push, grâce au webhook. Le Quality Gate par défaut de SonarQube (« Sonar way ») applique les conditions définies par SonarQube sur le code nouvellement ajouté, notamment la couverture, les bugs, les vulnérabilités et les duplications. Voici le rapport SonarQube du backend Harpers : Quality Gate passé, 96,9 % de couverture sur 161 lignes.

![SonarQube - rapport du backend Harpers](/img/content/demo-sonarqube-backend.jpg){ width=100% }

#### 🐛 Ce qui n'a pas marché du premier coup

C'est la partie que je trouve la plus instructive. Aucun de ces problèmes n'était visible avant de faire tourner le pipeline pour de vrai :

::tool-table
| Symptôme | Cause | Correction |
|---|---|---|
| `Quality Gate` en erreur 401 alors que l'analyse réussit | Le nom de la credential avait été rangé dans le mauvais champ de la configuration Jenkins : `waitForQualityGate` interrogeait SonarQube sans authentification | Corriger le champ `credentialsId` dans la configuration |
| Couverture à **0 %** malgré des tests verts | Le reporter `lcov` n'était pas activé, et `@vitest/coverage-v8` n'était pas déclaré dans les dépendances | Ajouter les deux |
| `Cannot read coverage report file` côté Ruby | SonarQube attend la sortie du **formatter JSON** de SimpleCov, pas son `.resultset.json` par défaut | Ajouter `simplecov_json_formatter` et pointer `coverage/coverage.json` |
| Un dépôt n'est pas détecté | Jenkins cherche `Jenkinsfile` avec une majuscule, mes fichiers s'appellent `jenkinsfile` | Renseigner explicitement le `scriptPath` |
| Les pushs sont ignorés par moments | Le scan périodique seul ne redétecte pas toujours les nouveaux commits | Créer un webhook Forgejo → Jenkins |
| Une variable d'environnement ajoutée n'est pas prise en compte | `docker restart` ne relit **pas** le fichier compose | `docker compose up -d <service>` |
| Le scanner plante au démarrage | `jar xf` ne préserve pas le bit exécutable | `chmod -R +x` après extraction |
::


L'historique des commits de la démo raconte d'ailleurs ces allers-retours, un correctif à la fois :

![Forgejo - historique des commits de la branche develop](/img/content/demo-forgejo-commits.png){ width=100% }

Un conseil qui m'a fait gagner beaucoup de temps : **reproduire l'échec dans un conteneur jetable** avec la vraie image d'agent, plutôt que de pousser à l'aveugle et d'attendre trois minutes de build à chaque essai.

#### 🔒 Sécurité et isolation

Une démo accessible à des tiers doit être pensée comme une plateforme, pas comme un bac à sable :

- **Agents sans privilèges** : ni root, ni accès au socket Docker. Pour le Postgres de CI, j'ai préféré une base permanente partagée plutôt que de donner ces droits à un agent.
- **Secrets hors du code** : aucune valeur sensible versionnée dans les dépôts. Les identifiants utilisés par Jenkins passent par son gestionnaire de credentials (chiffré, référencé par un nom dans le pipeline), pas par une valeur en clair dans un script — une simple variable d'environnement n'est pas un mécanisme de gestion de secrets en soi.
- **Comptes techniques minimaux** : le compte utilisé par Jenkins pour lire les dépôts ou commenter dans OpenProject n'a que les droits strictement nécessaires.
- **Droits Jenkins resserrés** : en préparant cet article, j'ai audité mes propres réglages et remplacé « tout utilisateur connecté est administrateur » par une **matrice de permissions** : seuls les administrateurs configurent, les autres consultent et lancent des builds.
- **Une organisation publique, une privée** : Harpers est en lecture publique, Zhentarim est privée, pour illustrer les deux cas.

Cette architecture reprend des pratiques que j'utiliserais en production (agents sans privilèges, secrets gérés, comptes minimaux), avec quelques simplifications assumées pour garder la démo autonome et réinitialisable — le Postgres de CI partagé et les organisations fictives en font partie.

#### 💾 Sauvegarde et remise à zéro

Une démo doit pouvoir être remise à l'état initial en quelques secondes. Un script capture un état de référence (*golden*), et un autre le restaure :

- sauvegarde quotidienne avec rotation sur 7 jours, l'état de référence n'étant jamais purgé ;
- restauration complète en environ **40 secondes** ;
- Jenkins rescanne les organisations au redémarrage et relance les pipelines tout seul.

Ce cycle a été validé en conditions réelles, **webhooks compris** : après une restauration, un nouveau push déclenche bien un build. Et une règle simple : **vérifier l'âge de l'état de référence avant chaque démonstration**, sous peine de tout écraser par une version obsolète.

#### 🔍 Venez voir par vous-même !

Le code, les rapports de qualité et le suivi de tâches de la démo Harpers sont **publics, en lecture seule, sans compte** :

- [organisation Harpers sur Forgejo](https://moradin.chartman2-fr.ovh/harpers){:target="_blank"} — dépôts, branches, historique des commits, pipelines (`jenkinsfile`)
- rapport SonarQube du [backend](https://savras.chartman2-fr.ovh/dashboard?id=harpers-todo-backend){:target="_blank"} et du [frontend](https://savras.chartman2-fr.ovh/dashboard?id=harpers-todo-frontend){:target="_blank"} — Quality Gate, couverture, issues
- [projet Harpers sur OpenProject](https://redknight.chartman2-fr.ovh/projects/harpers/work_packages){:target="_blank"}, dont la [tâche #37](https://redknight.chartman2-fr.ovh/work_packages/37){:target="_blank"} qui reçoit les commentaires automatiques des commits.

![Forgejo - organisation Harpers, consultable sans compte](/img/content/demo-forgejo-org.png){ width=100% }

Zhentarim reste privée sur les trois outils, pour garder le contraste intact. Seul Jenkins n'est pas ouvert publiquement : y lancer un build touche à de l'exécution, pas seulement à de la lecture, donc je le réserve à une **démonstration commentée** — un push en direct, le pipeline qui s'enchaîne, le rapport de qualité et le commentaire qui arrive sur la tâche. Contactez-moi via LinkedIn ou le contact du site pour convenir d'un créneau.

#### ✅ Conclusion

Chaque outil de cette série a son article, mais la valeur est dans l'assemblage : un flux continu du commit au rapport de qualité, avec un suivi de projet à jour, sur une infrastructure auto-hébergée que je maîtrise de bout en bout.

Ce que cette démo illustre, c'est ma façon de travailler : automatiser, mesurer, documenter, et **tester ce que j'affirme**. Les pièges listés plus haut sont ceux que vous rencontrerez aussi, autant les avoir déjà traversés.

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
