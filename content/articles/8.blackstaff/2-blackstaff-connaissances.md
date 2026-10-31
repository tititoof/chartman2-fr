---
title: "Blackstaff : donner du contexte à un LLM sans le noyer"
description: "Configuration par projet, fiches de faits tirées des specs et de la documentation, conventions au format OKF : comment Blackstaff choisit ce qu'il envoie au modèle, et pourquoi tout ce qui peut être décidé une fois sort du prompt."
icon: "i-mdi:book-open-variant"
article_id: "blackstaff-connaissances"
color: "purple"
draft: true
publishedAt: '2026-10-27'
---
#### 📌 Le problème du contexte

Un LLM ne connaît pas votre projet. Pour qu'il génère du code qui ressemble au vôtre, il faut lui donner du contexte : vos conventions, les API que vous appelez, les versions de vos frameworks.

La tentation est d'en donner **beaucoup** : tout le dossier, toute la doc, tout l'historique. Avec un grand modèle, ça passe à peu près. Avec un petit modèle, c'est l'inverse : mes mesures montrent que **plus de contexte fait inventer plus** (voir le [troisième article de la série](/blog/article/generation-code-llm-local)). Et même un grand modèle se trompe moins quand on lui donne moins de choses, mais exactes.

La question n'est donc pas « combien de contexte ? » mais « **quel type d'information, à quel endroit ?** ».

#### 🧱 La règle : ce qui peut être décidé une fois sort du prompt

Cette base de connaissances a d'abord été pensée pour un petit modèle (7 à 14 milliards de paramètres). Un tel modèle suit très bien une règle courte avec un exemple, mais échoue souvent à **déduire** une information du contexte : calculer l'URL d'une API à partir du chemin d'un fichier, ou choisir entre deux stratégies d'authentification.

Aujourd'hui, le générateur Blackstaff tourne sur un grand modèle cloud, et la règle est restée : ce qui n'est pas laissé au hasard ne peut pas être mal deviné, quelle que soit la taille du modèle.

Dans Blackstaff, chaque information est donc rangée selon sa nature, sans jamais être dupliquée :

::tool-table
| Source | Contenu | Nature |
|--------|---------|--------|
| `.blackstaff/index.md` (dans chaque projet) | Les faits du projet : framework, version, authentification, sérialiseur… | Déclaré une fois, jamais deviné |
| Fiches de faits (JSON) | Les faits externes exacts : endpoints d'une API, exports d'une bibliothèque | Précis, lisible par une machine |
| Base de conventions (Markdown) | Les conventions et recettes de génération | Stable, rédigé |
| Nœuds Code dans n8n | Tout ce qui se calcule : chemins, URL, noms de classes | Déterministe |
::

Le modèle ne reçoit à la fin que **ce qui concerne le fichier en cours**.

#### 📄 La configuration par projet

Chaque projet contient un fichier `.blackstaff/index.md`. Exemple avec le backend de la [to-do list](/blog/category/todolist) :

```yaml [.blackstaff/index.md]
---
type: project
title: todo-backend
description: "API Rails 8 — Devise API, JSON:API, services versionnés"

stack:
  backend:
    framework: rails
    version: "8"
    lang: ruby
    auth: devise-api
    serializer: jsonapi-serializer
    patterns:
      - crud
      - auth

devops:
  forgejo:
    owner: tititoof
    repo: todo-backend
  jenkins:
    job: todo-backend/main
  sonarqube:
    projectKey: todo-backend
  openproject:
    projectId: 6

related:
  - todo-frontend
---
```

Ce fichier ne contient aucun secret, il peut être commité avec le projet. Il répond une fois pour toutes aux questions qu'un modèle aurait sinon tranchées au hasard, différemment à chaque appel : quelle version de Rails, quelle gem d'authentification, quel format de réponse.

Le bloc `devops` sert à l'outillage autour de la génération : savoir quel job Jenkins surveiller, quel projet SonarQube consulter, où ouvrir la pull request.

#### 🗂️ Les fiches de faits : jamais écrites à la main

Pour les faits externes, Blackstaff utilise des **fiches de faits** au format JSON. Aucune n'est écrite à la main, et leur origine dépend de ce qu'elles décrivent :

::tool-table
| Fiches | Source |
|--------|--------|
| API appelées par le projet (Jenkins, Forgejo, OpenProject, SonarQube…) | **Extraites des specs qui passent** : les réponses simulées avec WebMock, vérifiées contre le vrai code du client |
| Bibliothèques et backends d'authentification (Zod, nuxt-auth-utils, Devise, Sanctum…) | Générées par un LLM à partir de la **documentation officielle**, téléchargée par le workflow |
| Environnement de test | **Observées** en lançant la suite de tests dans Jenkins |
::

Les plus fiables sont les premières : elles décrivent ce que le code fait **réellement**. Exemple avec Jenkins :

```json [reference-sheets/http-apis/jenkins.json (extrait)]
{
  "displayName": "Jenkins::Client",
  "clientFile": "app/clients/jenkins/client.rb",
  "source": "recorded from the passing specs of the repository",
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/json",
      "clientMethods": ["jobs"],
      "queryParams": ["tree"],
      "responses": [
        { "status": 200, "bodySample": "{\"jobs\":[{\"name\":\"develop\",\"color\":\"blue\", …}]}" }
      ]
    }
  ]
}
```

Le modèle voit ainsi la **forme exacte** des requêtes et des réponses, plutôt qu'une description approximative. Et si l'API change, ce sont les specs qui cassent en premier, et il suffit de réenregistrer la fiche à partir d'elles.

> 💡 Ces fiches comblent exactement le type de trou observé pendant les mesures : un modèle qui ne connaît pas la syntaxe `tree=jobs[name]{0,10}` de l'API Jenkins filtre tout l'historique après coup en Ruby. Avec la forme exacte sous les yeux, il n'a plus à deviner.

#### 📚 Les conventions au format OKF

Les conventions sont rangées dans un ensemble de fichiers Markdown au format **OKF** ([*Open Knowledge Format*](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing/?hl=en){:target="_blank"}, proposé par Google Cloud) : chaque fichier est un « concept » autonome, avec un en-tête YAML et un champ `type` obligatoire, relié aux autres par de simples liens Markdown.

```
okf/
├── frameworks/     conventions par framework et par version (Rails 8, Nuxt 4…)
├── backends/       format de réponse, pagination, erreurs
├── integrations/   patterns entre systèmes (ex. nuxt-auth-utils ↔ Devise)
├── patterns/       recettes de génération, un concept par type de fichier
└── contracts/      schémas JSON qui valident les fiches et les décisions
```

![Arborescence des concepts OKF de Blackstaff](/img/content/blackstaff/blackstaff-okf-tree.png.png){ width=100% }

Exemple d'en-tête :

```md [frameworks/rails.md]
---
type: Framework
title: Rails — conventions générales
tags: [rails, backend]
---
```

##### Choisir par chemin, pas par mots-clés

Un détail fait une grosse différence : le choix des concepts à charger se fait par **motif de chemin de fichier**, pas par tags. Côté Nuxt, une route serveur `GET` de liste et une route `DELETE` peuvent partager les mêmes tags. Mais leurs fichiers ne se ressemblent pas : `server/api/articles/index.get.ts` d'un côté, `server/api/articles/[id].delete.ts` de l'autre. En lisant le verbe HTTP et la présence d'un segment dynamique dans le nom du fichier, le pipeline sait exactement **quelle** recette charger, sans ambiguïté.

![Résolution des concepts à partir du chemin du fichier](/img/content/blackstaff/blackstaff-concept-resolver.png){ width=100% }

> ⚠️ J'ai appris à mes dépens qu'une correspondance par mot-clé est fragile : pendant un temps, le pattern `auth` se chargeait dès qu'un ticket contenait le mot « authentication ». Les tags se comparent maintenant sur des mots entiers, et ne servent plus à trancher entre deux recettes.

##### Une seule stratégie active par projet

Plusieurs stratégies d'authentification Nuxt ↔ Rails coexistent dans la base (Devise JWT, devise_token_auth, session avec CSRF, proxy BFF…). Le modèle ne choisit jamais : c'est le champ `auth` du `.blackstaff/index.md` (`devise-api` dans l'exemple plus haut) qui déclare la stratégie du projet, et seuls les concepts qui la concernent sont envoyés.

#### 🔢 Ce qui se calcule ne se demande pas

Dernière couche : tout ce qui est **déterministe** est calculé dans des nœuds Code de n8n, avant ou après l'appel au modèle :

- l'URL d'une page Nuxt à partir de son chemin de fichier ;
- les modules et la classe Ruby attendus pour un chemin, avec Zeitwerk (`app/controllers/api/v1/projects/reports_controller.rb` donne `Api::V1::Projects::ReportsController`) ;
- les dépassements de taille du prompt, signalés dans la réponse plutôt que subis en silence.

Sur ce dernier point, la leçon a été rude : pendant des semaines, la description de la tâche était coupée à 2000 caractères et les conventions à 6000, **sans aucun avertissement**. Le modèle travaillait avec une consigne amputée, et rien ne le signalait. Les limites sont maintenant plus larges, et chaque troncature apparaît dans la réponse (`meta.promptTruncations`).

#### ✅ Conclusion

Le contexte d'un LLM se construit comme une API : **peu de choses, mais exactes**. Les faits du projet se déclarent, les faits externes s'enregistrent depuis les tests ou la documentation officielle, les conventions se rangent par concept, et tout ce qui se calcule est calculé.

Le modèle n'a plus qu'une seule chose à faire : écrire la logique. C'est justement ce qu'il fait le mieux, comme le montrent les mesures du [prochain article](/blog/article/generation-code-llm-local).

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
