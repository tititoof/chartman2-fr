---
title: "Blackstaff : du ticket au code relu avec n8n et un LLM"
description: "Présentation de Blackstaff, mon générateur de code maison : un workflow n8n, une base de connaissances, des modèles cloud et locaux, et un agent qui orchestre le tout, du ticket au code testé."
icon: "i-mdi:wizard-hat"
article_id: "blackstaff-presentation"
color: "purple"
draft: true
publishedAt: '2026-10-20'
---
#### 📌 Pourquoi un générateur de code maison ?

Je développe **candlekeep**, l'outil qui me sert à gérer mon auto-entreprise : un backend Rails 8 et un frontend Nuxt, branchés sur les services de mon homelab ([OpenProject](/blog/article/10-docker-openproject-init), Forgejo, Jenkins, SonarQube…).

Beaucoup de tickets s'y ressemblent : un nouveau client HTTP pour une API, un service qui agrège deux sources, une action de contrôleur de plus, les specs qui vont avec. C'est du code utile, mais répétitif, et il suit des conventions très précises.

Les assistants de code du marché savent faire ça. Mais je voulais :

* **comprendre** ce qu'un LLM sait vraiment faire sur mon code, mesures à l'appui ;
* garder la main sur les étapes qui comptent (git, tests) ;
* faire tourner **en local** tout ce qui peut l'être, sur une machine modeste.

C'est devenu **Blackstaff** (oui, comme la tour des mages d'Eauprofonde : candlekeep, Blackstaff… il y a un thème).

#### 🧭 Vue d'ensemble

Blackstaff, ce sont trois pièces :

::tool-table
| Pièce | Rôle | Dépôt |
|-------|------|-------|
| Workflow [n8n](/blog/article/n8n-self-hosted) | Le moteur : construit les prompts, appelle les modèles, vérifie les réponses | [blackstaff/n8n](https://github.com/tititoof/blackstaff/tree/main/n8n){:target="_blank"} |
| Base de connaissances | Les conventions et les faits que le modèle ne doit pas deviner | [blackstaff](https://github.com/tititoof/blackstaff){:target="_blank"} |
| Un agent de code (Claude Code) | Le chef d'orchestre : découpe le ticket, appelle n8n, relit, lance les tests | — |
::

<mermaid>
graph LR
  Ticket["📋 Ticket"] --> Agent["🧠 Agent<br/>découpe + relecture"]
  Agent -->|webhook| N8N["⚙️ n8n<br/>Blackstaff"]
  N8N --> KB["📚 Base de<br/>connaissances"]
  N8N -->|génération| Cloud["☁️ Modèle cloud"]
  Agent -->|"webhooks qwen-*<br/>méthode par méthode"| Local["🏠 Ollama<br/>local"]
  N8N --> Agent
  Agent --> Tests["🧪 Vraie suite<br/>de tests"]
  Tests -->|échec| Agent
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Agent,N8N,KB,Local,Tests containerStyle;
</mermaid>

#### 🧠 L'agent, chef d'orchestre

n8n génère **un fichier à la fois**. Pour un ticket complet, il faut quelqu'un qui découpe, enchaîne et vérifie. C'est le rôle de l'agent de code, guidé par des instructions écrites (des « skills ») qui décrivent la boucle à suivre :

1. **Planifier** : lister les fichiers à créer ou modifier, dans l'ordre (modèle → service → contrôleur → serializer…).
2. **Générer et relire**, un fichier à la fois, en appelant le webhook n8n.
3. **Générer les tests** à partir du code **réellement écrit**, jamais à partir du plan.
4. **Lancer la vraie suite de tests** et le linter.
5. **En cas d'échec** : relancer la génération avec un diagnostic précis, avec un nombre d'essais limité.
6. **Refactoriser** si nécessaire, puis relire une dernière fois.

L'agent travaille en autonomie, sauf à deux points de contrôle où il **me demande confirmation** : les actions git (branche, commit, pull request) et le premier lancement de la suite de tests. Une fois ce lancement validé, l'agent relance lui-même les tests pendant la boucle de correction.

> 💡 Chaque relecture de l'agent est consignée dans un journal (`review-log.jsonl`) : quel fichier, quel générateur, accepté ou rejeté, et pourquoi. C'est ce journal qui a permis de comparer les approches, chiffres à l'appui. Il est distinct du journal tenu par n8n, qui enregistre chaque appel de génération (voir l'[article sur les garde-fous](/blog/article/blackstaff-garde-fous)).

#### ⚙️ Un seul webhook n8n

Côté n8n, le workflow Blackstaff n'a qu'**un seul point d'entrée** : `POST /webhook/blackstaff`. Ce qui change d'un appel à l'autre, c'est le champ `step` du JSON envoyé :

::tool-table
| `step` | Ce que fait le workflow |
|--------|-------------------------|
| `contracts` | Extraire les « contrats » d'un fichier (méthodes, exports) avant de le générer |
| `generate` (par défaut) | Générer un fichier |
| `local-review` | Relecture rapide du fichier généré, avant la relecture plus poussée de l'agent |
| `generate-tests` | Écrire les tests d'un fichier déjà généré |
::

Un appel de génération ressemble à ceci :

```json
{
  "project": "candlekeep/candlekeep-backend",
  "mode": "task",
  "taskSubject": "Client Jenkins",
  "taskDescription": "Suivre exactement le modèle de app/clients/dolibarr/client.rb : …",
  "currentFile": { "path": "app/clients/jenkins/client.rb", "fileType": "ruby" },
  "existingContent": null,
  "correctionNotes": null
}
```

Et la réponse renvoie le fichier généré, accompagné des résultats des contrôles :

```json
{
  "filesWritten": 1,
  "generatedFiles": [{ "path": "app/clients/jenkins/client.rb", "content": "…" }],
  "localCheckOk": true,
  "localReviewOk": true,
  "error": null
}
```

`filesWritten` est à prendre au pied de la lettre : aujourd'hui, n8n écrit aussi le fichier sur le disque, en plus de le renvoyer. Ce comportement a provoqué un incident, raconté dans l'[article sur les garde-fous](/blog/article/blackstaff-garde-fous).

Garder un seul webhook a un avantage concret : toute la logique commune (chargement de la configuration du projet, des conventions, journalisation, contrôles) est écrite **une seule fois** dans n8n. Et n'importe quel client peut s'en servir : un agent, un script, un simple `curl`.

> 💡 La qualité dépend surtout de `taskDescription`. « Fais un client Jenkins » donne un résultat vague. « Suis exactement le modèle de `app/clients/dolibarr/client.rb` : le constructeur appelle `super(base_url:, headers:)`… » donne un client correct du premier coup.

#### ☁️🏠 Cloud ou local ?

Ma carte graphique est une **GTX 1650 Ti avec 4 Go de VRAM**. Un modèle de code de 7 milliards de paramètres y tient à peine, et un grand modèle n'y tient pas du tout. Blackstaff est donc **hybride**, et je l'assume :

::tool-table
| Tâche | Modèle | Où |
|-------|--------|----|
| Génération d'un fichier complet | Un grand modèle via l'API NVIDIA, avec Groq en secours | ☁️ |
| Planification, fiches de faits | Gemini et Claude Haiku, dans le workflow n8n | ☁️ |
| Génération découpée, méthode par méthode | `qwen2.5-coder:7b` via [Ollama](/blog/article/ollama-openwebui-self-hosted), avec NVIDIA en secours pour la création de fichiers | 🏠 (☁️ en secours) |
| Découpage des tickets complexes, relecture finale | Claude | ☁️ |
::

Le workflow Blackstaff lui-même est donc entièrement cloud. La génération locale passe par des workflows n8n séparés, appelés directement par l'agent, en deux familles déclinées pour Ruby et pour TypeScript : l'une crée un nouveau fichier à partir de méthodes générées une par une, l'autre insère ou remplace une seule méthode dans un fichier existant.

Le découpage « méthode par méthode » avec le modèle local est né des mesures présentées dans le [troisième article de la série](/blog/article/generation-code-llm-local) : un petit modèle écrit très bien une méthode, à condition qu'on lui dise exactement laquelle.

#### 🧱 Le principe qui guide tout le reste

En construisant Blackstaff, une règle s'est imposée, et elle revient dans chaque article de cette série :

> **Tout ce qui peut être calculé ou décidé une fois sort du prompt.**

Le chemin d'une URL d'API à partir d'un nom de fichier ? Calculé dans un nœud n8n. La stratégie d'authentification du projet ? Déclarée une fois dans un fichier de configuration. La classe Ruby attendue pour un chemin ? Déduite par un script. Le modèle ne reçoit que ce qu'il doit vraiment **inventer** : la logique du code.

Plus un modèle est petit, plus cette règle compte : il suit très bien une règle courte avec un exemple, mais il échoue souvent à **déduire** une information à partir du contexte.

#### 🗺️ La suite de la série

1. **Présentation** : cet article.
2. [Donner du contexte à un petit modèle](/blog/article/blackstaff-connaissances) : la base de connaissances, les fiches de faits et la configuration par projet.
3. [Ce que 13 vrais tickets m'ont appris](/blog/article/generation-code-llm-local) : les mesures, ce qui marche et ce qui ne marche pas.
4. [Les garde-fous](/blog/article/blackstaff-garde-fous) : sécuriser l'exécution et attraper les échecs silencieux.

#### ✅ Conclusion

Blackstaff n'est pas un concurrent des assistants de code du marché. C'est un **laboratoire** : une chaîne que je comprends de bout en bout, que je peux mesurer, et où chaque étape sensible reste sous mon contrôle.

Et c'est surtout un bon moyen d'apprendre ce qu'un LLM sait faire, et ce qu'il ne faut surtout pas lui demander.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
