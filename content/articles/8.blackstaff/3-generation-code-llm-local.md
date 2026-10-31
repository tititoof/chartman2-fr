---
title: "Blackstaff : ce que 13 vrais tickets m'ont appris sur la génération de code avec un LLM local"
description: "Blackstaff, n8n, Ollama et qwen2.5-coder:7b sur une carte graphique de 4 Go : j'ai rejoué de vrais commits de mon projet Rails et noté chaque génération avec les vraies specs. Ce qui marche, ce qui ne marche pas, et pourquoi le problème n'est presque jamais le code lui-même."
icon: "i-mdi:robot-outline"
article_id: "generation-code-llm-local"
color: "purple"
draft: true
publishedAt: '2026-11-03'
---
#### 📌 Le point de départ

Dans le [premier article de la série](/blog/article/blackstaff-presentation), j'ai présenté Blackstaff : un workflow n8n qui génère du code pour **candlekeep**, l'outil de gestion de mon auto-entreprise. Avec une carte graphique de 4 Go, la chaîne est hybride : les fichiers simples sont générés d'un bloc dans le **cloud**, et les fichiers complexes sont découpés pour être générés **en local** avec `qwen2.5-coder:7b`, une méthode à la fois. Claude joue l'architecte : il découpe le ticket, écrit les contrats et relit.

La question que je me posais : **qu'est-ce qu'un petit modèle local sait vraiment faire sur un vrai projet ?** Pas sur un benchmark, mais sur mon code, avec mes conventions.

#### 🧪 La méthode : rejouer de vrais commits

Plutôt que d'inventer des exercices, j'ai rejoué **13 commits réels** de candlekeep. Les plus parlants sont détaillés ci-dessous. Pour chacun :

1. On se place sur le **commit parent**, dans un `git worktree` jetable, avec une base PostgreSQL jetable dans Docker.
2. Le modèle reçoit l'énoncé du ticket, reformulé en prose, et le code existant. **Jamais les specs.**
3. On applique la génération, puis on lance **les vraies specs du vrai commit**. Le score, c'est le nombre de specs qui passent.
4. On lance aussi toute la suite de tests, pour attraper les régressions.

L'avantage : le juge n'est pas mon impression, c'est le code que j'ai réellement écrit et testé à l'époque.

> 💡 Petite erreur de méthode, corrigée en route : sur un des premiers tickets, j'avais recopié le fichier « avant » à la main… en oubliant une méthode. Depuis, le contenu de départ vient toujours de `git show <sha>:<chemin>`, jamais d'une retranscription.

#### ✅ Ce qui marche (presque) du premier coup

Sur les tickets à **un seul enchaînement logique clair**, les résultats sont bons, voire très bons :

::tool-table
| Ticket | Générateur | Résultat |
|--------|-----------|----------|
| Corriger la synchronisation OpenProject | Cloud | **20/20** specs, aucune régression. Le bon diagnostic (un filtre implicite de l'API) a été trouvé à partir du seul énoncé du bug |
| Ajouter un timeout aux clients HTTP des LLM | Cloud | Aucune spec dans le vrai commit : 207/207 sur la suite complète, valeurs vérifiées à la main |
| Limiter l'historique des builds Jenkins | Local (qwen) | **11/15** : le modèle ne connaît pas la syntaxe `{0,limit}` de l'API Jenkins, et filtre après coup en Ruby |
::

Le dernier échec est instructif : ce n'est pas un problème de logique, c'est un **trou de connaissance** sur une API externe précise. C'est exactement ce que les fiches de faits de l'[article 2](/blog/article/blackstaff-connaissances) sont là pour combler : donner au modèle la forme exacte des appels, plutôt que de le laisser deviner.

#### 💥 Le premier vrai piège : « réécris le fichier »

Ticket suivant : ajouter une méthode à un client Jenkins qui en contenait déjà plusieurs. Résultat : **3/13**. Le modèle a bien écrit la nouvelle méthode… et **supprimé les méthodes existantes**. Deux routes qui fonctionnaient sont cassées.

Avec une consigne explicite (« recopie à l'identique les méthodes X, Y et Z, sous peine de rejet »), on remonte à **12/13**. Mais la vraie correction est ailleurs : **ne plus jamais demander un fichier complet** quand le fichier existe déjà. La chaîne utilise maintenant un **patch AST** (en Ruby et en TypeScript) : le modèle génère une seule méthode, et un script l'insère ou la remplace dans le fichier sans toucher au reste. Quand un fichier complet doit malgré tout être renvoyé, un autre contrôle prend le relais (voir l'[article sur les garde-fous](/blog/article/blackstaff-garde-fous)).

![Diff produit par le patch AST de Blackstaff](/img/content/blackstaff/blackstaff-patch-ast-diff.png){ width=100% }

#### 🧩 Leçon n°1 : le modèle ne rate pas le code, il rate l'architecture

Le ticket le plus difficile : un **rapport de progression de projet**, qui agrège trois sources (tickets OpenProject, builds Jenkins, qualité SonarQube) et y ajoute un résumé rédigé par un LLM. Nouveau client, nouveau service, contrôleur, serializer modifié.

::tool-table
| Approche | Specs | Ce qui s'est passé |
|----------|:---:|--------------------|
| Tout en une génération | **2/12** | Logique principale jamais appelée, méthode inventée, consigne public/privé inversée, client incomplet |
| Une génération par fichier | **6/12** | Mieux, mais le service reste cassé |
| Une génération **par méthode**, dépendances passées en paramètres | **12/12** | 303/303 sur la suite complète |
::

Pour cette dernière étape, il n'a même pas fallu tout régénérer : les méthodes déjà correctes de l'essai précédent ont été gardées telles quelles, et seules les deux pièces fautives ont été régénérées, avec leurs dépendances en paramètres.

Chaque méthode prise isolément était largement à la portée du modèle. Ce qui le faisait échouer, c'était de **faire tenir ensemble** plusieurs responsabilités et des variables partagées dans une seule génération.

J'ai voulu trouver le seuil exact avec des exercices synthétiques : agréger de 1 à 5 sources, passer une valeur à 1 à 4 méthodes. Résultat : **10/10 et 8/8**, aucun point de rupture… parce que mes énoncés décrivaient déjà la structure, et contenaient donc la solution.

La vraie difficulté n'est pas mesurable en « nombre de sources » : c'est **la quantité de décisions d'architecture laissées implicites dans l'énoncé**. Où couper en méthodes, quelles données vont où, quoi préserver. Quand l'architecte prend ces décisions à la place du modèle, un 7B local s'en sort très bien.

> 💡 Le coût du découpage côté modèle local est négligeable : quelques milliers de caractères de plus, sur une machine qui tourne de toute façon. Le vrai coût, ce sont les **tours de diagnostic** côté architecte. D'où une règle simple : on redécoupe **une fois** au maximum (fichier → méthode). Si un deuxième tour est nécessaire, l'architecte écrit le morceau lui-même : c'est à ce stade le chemin le plus sûr **et** le moins cher.

#### 🔧 Leçon n°2 : un défaut mécanique se corrige avec un outil, pas avec une consigne

C'est la leçon qui m'a le plus surpris. Plusieurs défauts reviennent sans cesse, et j'ai d'abord essayé de les corriger dans le prompt.

**Le namespace inventé.** Rails (via Zeitwerk) exige que le nom de la classe corresponde au chemin du fichier. Le modèle ajoutait régulièrement un `module` en trop, et l'application refusait de démarrer.

::tool-table
| Tentative | Résultat |
|-----------|----------|
| Relancer avec l'erreur exacte (« la classe doit être X, sans module en trop ») | **0/7** corrigés : le modèle reproduit le même module à chaque fois |
| Réparation déterministe : garder le corps de la classe, la ré-envelopper sous le bon nom | **7/7** démarrent |
| Ne plus demander l'enveloppe au modèle : la déduire du chemin | Validé sur les 120 fichiers de `app/` du projet |
::

**Les bugs Ruby classiques.** Une variable qui se masque elle-même (`age_in_years = age_in_years`, toujours `nil`), ou une chaîne `a&.b.c` qui plante quand `a` est `nil`. J'ai ajouté des rappels précis dans le prompt système, qui décrivaient exactement ces cas.

**Aucun effet.** La variable masquée revient sur 6 essais sur 6, avec ou sans le rappel. Et pour `a&.b.c`, une relance ciblée ne fait que déplacer le bug.

Ce qui a marché, c'est un petit détecteur basé sur Ripper (le parseur de Ruby), qui reprend le principe de deux règles RuboCop :

::tool-table
| Défaut | Correction | Résultat |
|--------|-----------|----------|
| `x = x` | Signalé, relance avec le message exact | **6/6** corrigés |
| `a&.b.c` | Relance | **0/2** : le modèle déplace le bug |
| `a&.b.c` | Réparation automatique en `a&.b&.c` | **2/2** |
| Faux positifs | Sur les 143 commits écrits à la main du projet | **0** |
::

La règle qui en découle : **si un défaut est détectable mécaniquement, c'est un script qui le corrige**. Le prompt ne sert qu'à ce qui demande une intention.

#### 🔍 Leçon n°3 : plus de contexte, ce n'est pas mieux

Choisir à la main les fichiers à donner au modèle (quoi modifier, quel modèle imiter) est l'étape la plus coûteuse. J'ai essayé de l'automatiser avec une recherche vectorielle : Qdrant, des embeddings `qwen3-embedding:0.6b` via Ollama, et un découpage du code par méthode.

- Pour trouver **quoi modifier**, ça marche : 13 fichiers sur 14 dans les 5 premiers résultats.
- Pour trouver **quoi imiter**, ça ne marche pas. Sur le ticket du rapport, la recherche ne ramenait pas le contrôleur voisin du **même dossier**, et le modèle réinventait son module en trop : **0/12**, application qui ne démarre pas.

La solution n'a pas été plus d'IA, mais une **règle déterministe** : donner les fichiers existants du dossier où le nouveau fichier sera créé. Sur 4 tickets (dont 2 jamais vus pendant les réglages), ce choix automatique fait aussi bien que mon choix manuel.

Et quand j'ai ajouté en plus les « dépendances » trouvées par la recherche vectorielle, le score a **baissé** (16 → 9 sur un ticket) : avec plus de contexte, le modèle invente plus.

> 💡 Autre essai raté : traduire les tickets en anglais pour mieux matcher le code. Le petit modèle traduisait aussi les noms propres (« work packages » → « issues »), et la recherche par mots-clés s'effondrait. Ce qui aide, ce sont **les identifiants du code**, pas la langue.

#### 🧪 Leçon n°4 : qui écrit les vérifications ?

Restent les vrais bugs de logique : une règle métier lue à l'envers, une table de correspondance approximative. L'idée : avant d'assembler le code, faire écrire des **vérifications exécutables** à partir des règles du ticket.

::tool-table
| Vérifications écrites par… | Fausses | Signalent à tort la vraie solution |
|----------------------------|:---:|:---:|
| qwen, à partir des règles | **45 %** | 6 jeux sur 6 |
| L'architecte, **avant** de voir le vrai code ni les specs | **0** | 0 |
::

Branchées telles quelles, les vérifications de qwen auraient renvoyé chaque génération en correction, juste ou non. Celles de l'architecte, quelques lignes par règle, ont attrapé le seul bug réel (une méthode inventée) et nommé l'erreur exacte, là où les specs ne montraient qu'une erreur 500 opaque dans un autre test. Le retry l'a corrigé du premier coup.

> 💡 Une table métier (des tranches, des seuils) se **donne** au modèle comme une donnée. Lui demander de la déduire d'une règle, c'est s'assurer qu'elle sera fausse : 6 essais sur 6, et aucune spec ne le voyait.

#### 🚫 Ce qui n'a pas marché

::tool-table
| Essai | Résultat |
|-------|----------|
| Spark-X2.5-4B, un modèle de 4B récent et bien noté sur les benchmarks de code, qui tient entièrement dans 4 Go | **0/60** sans réflexion, 12/60 avec (5 à 10 fois plus lent), contre **37/60** pour qwen2.5-coder:7b. Un bon score de benchmark ne garantit pas de bons résultats sur de la génération Rails dans un vrai dépôt |
| RAG sur les guides Rails officiels | Aide quand le bon idiome remonte, **nuit** quand une API voisine remonte. Non déployé |
| Une fiche de règles maison ajoutée **en bloc** au prompt système du modèle local (7 règles tirées des échecs) | Effet mitigé, et réglée sur les tickets de test. Non déployée. À ne pas confondre avec les conventions chargées **selon le fichier généré**, décrites dans l'[article 2](/blog/article/blackstaff-connaissances), qui restent en place |
| Donner des commits passés comme exemples | Le bon commit était au rang 19 sur 35 : son message ne ressemblait pas au ticket, seule sa forme était analogue |
::

#### ⚠️ L'incident

Pendant les premiers rejeux, les tests se faisaient bien dans un worktree jetable… mais le workflow n8n de génération cloud écrivait aussi ses fichiers **directement dans le vrai dépôt**, monté dans le conteneur n8n : 4 fichiers sur 4. Rien n'a été commité, mais depuis, la génération elle-même passe par des conteneurs jetables, montés sur les worktrees. Les détails et les correctifs sont dans l'[article sur les garde-fous](/blog/article/blackstaff-garde-fous).

#### 📏 Les limites de l'exercice

Pour rester honnête :

- **Les échantillons sont petits.** Souvent 2 ou 3 essais par configuration. Sur certains tickets, le même prompt donne de 0 à 26 specs vertes selon la seed.
- **Un biais optimiste existe.** Pour écrire les énoncés de certains tickets, j'ai lu le vrai diff. Le modèle n'a jamais vu ni le code ni les specs, mais les contrats de méthodes ont parfois été écrits par quelqu'un qui connaissait la solution. Le dernier ticket a été fait avec un protocole plus strict : contrats et vérifications commités **avant** toute lecture du diff.
- **Ce n'est pas du 100 % local.** Avec 4 Go de VRAM, le découpage et la relecture passent par un modèle cloud. Ce qui tourne en local, c'est la partie répétitive : écrire chaque méthode. Et si la génération locale échoue lors de la création d'un fichier, un modèle cloud prend le relais.

Pour garder ces mesures dans le temps, elles sont rejouées dans une petite **CI des prompts**, décrite dans l'[article sur les garde-fous](/blog/article/blackstaff-garde-fous).

#### ✅ Conclusion

Un modèle de 7B sur une carte de 4 Go ne remplace pas un développeur. Mais il **écrit très bien une méthode** quand on lui dit exactement laquelle, avec quelles entrées et quelle sortie. Tout le reste (découper, choisir quoi imiter, vérifier, réparer les erreurs mécaniques) se fait mieux avec des règles et des scripts qu'avec un plus gros prompt.

Au final, la chaîne n'est pas « une IA qui code ». C'est un **atelier** : un architecte qui décide, un petit modèle local qui exécute, et des outils bêtes et fiables autour, qui vérifient tout.

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
