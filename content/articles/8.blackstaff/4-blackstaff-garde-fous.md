---
title: "Blackstaff : les garde-fous d'un générateur de code"
description: "Exécuter des commandes sans donner le socket Docker à n8n, détecter les réponses vides, tronquées ou qui modifient du code existant sans le dire, et mesurer chaque changement de prompt : les garde-fous ajoutés à Blackstaff, un incident après l'autre."
icon: "i-mdi:shield-alert-outline"
article_id: "blackstaff-garde-fous"
color: "purple"
draft: true
publishedAt: '2026-11-10'
---
#### 📌 Le pire bug : celui qui répond `error: null`

Un générateur de code qui plante, ce n'est pas grave : on voit l'erreur, on relance. Le vrai danger, c'est le générateur qui répond **« tout va bien »** alors que le résultat est vide, tronqué, ou a cassé autre chose en passant.

Presque tous les garde-fous de Blackstaff sont nés d'un incident de ce genre. Cet article les passe en revue, des plus structurels aux plus fins.

#### 🔐 Exécuter des commandes sans donner Docker à n8n

Après la génération, il faut parfois agir **dans le conteneur du projet** : vérifier la syntaxe avec Ruby ou TypeScript, patcher une méthode, **lancer les tests**, installer une dépendance. Or [n8n](/blog/article/n8n-self-hosted) tourne lui-même dans un conteneur minimal, sans Ruby, PHP ni Composer.

(Les fichiers complets générés par le workflow principal, eux, sont écrits directement par n8n, dans le dossier des projets monté dans son conteneur. On y revient plus bas.)

La solution évidente serait de laisser n8n piloter Docker. C'est aussi la pire : quiconque peut modifier un workflow aurait alors un accès **complet** à Docker, et donc à la machine.

À la place, un tout petit service, **docker-bridge**, est le seul à utiliser le socket Docker. Il expose un unique endpoint, `POST /exec`, qui lance une commande dans un conteneur :

<mermaid>
graph LR
  N8N["⚙️ n8n"] -->|"POST /exec<br/>+ jeton Bearer"| Bridge["🛡️ docker-bridge"]
  Bridge -->|"socket Docker"| Projet["🐳 Conteneur<br/>du projet"]
  Bridge -.->|"jeton absent<br/>ou conteneur hors liste"| Refus["⛔ Refus"]
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class N8N,Bridge,Projet containerStyle;
</mermaid>

Ses protections tiennent en quelques lignes :

```js [docker-bridge/server.js (extrait simplifié)]
// Jeton lu dans un fichier monté en lecture seule : sans lui, le service refuse de démarrer
const TOKEN = fs.readFileSync('/run/secrets/docker-bridge-token', 'utf8').trim();
if (!TOKEN) process.exit(1);

function isAuthorized(req) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(TOKEN);
  // timingSafeEqual exige deux tampons de même taille : le test de longueur
  // ne révèle que la taille du jeton, jamais son contenu
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// … puis, pour chaque requête (réponses abrégées ici) :
if (!isAuthorized(req)) { res.writeHead(401); return res.end(); }
if (!ALLOWED_CONTAINERS.includes(container)) { res.writeHead(403); return res.end(); }
execFile('docker', ['exec', container, ...args]);  // jamais de shell côté bridge
```

::tool-table
| Protection | Détail |
|------------|--------|
| Jeton Bearer | Lu dans un fichier monté en lecture seule, jamais dans le code ni dans l'environnement. Côté n8n, les nœuds HTTP l'envoient via un identifiant *Header Auth*, les nœuds Code lisent le même fichier |
| Liste blanche de conteneurs | `ALLOWED_CONTAINERS` : seuls les conteneurs de mes projets, rien d'autre |
| Aucun port publié | Pas de `ports:` dans le compose : seul n8n le joint, par le réseau Docker |
| Pas de shell côté bridge | `execFile` reçoit un tableau d'arguments, pas une chaîne à interpréter |
::

#### 🔎 Ce que la relecture a trouvé

Ce tableau n'a pas toujours été aussi propre. En rédigant cette série, j'ai relu le code de docker-bridge et des workflows… et trouvé quatre problèmes, corrigés depuis :

1. **Aucune authentification.** N'importe quel client qui joignait le service pouvait lancer une commande.
2. **Un port publié sur toutes les interfaces** (`3001:3001`). Combiné au point précédent, n'importe quel appareil du réseau local pouvait exécuter une commande dans le conteneur d'un projet.
3. **Une injection shell.** Certains workflows construisent une commande `sh -c` qui contient le chemin du fichier à écrire, reçu dans la requête et simplement entouré d'apostrophes. Un chemin contenant lui-même une apostrophe sortait de la chaîne, et le reste devenait une commande.
4. **Une écriture hors du projet.** L'étape d'écriture assemblait le chemin final à partir du dossier du projet et du chemin renvoyé… par le modèle. Un chemin en `../../` aurait écrit ailleurs : dans un autre dépôt, ou dans les données de n8n.

![Requête refusée par le bridge sans authentification valide](/img/content/blackstaff/blackstaff-bridge-401.png){ width=100% }

Les deux premiers se sont réglés avec le jeton et la suppression du port. Le troisième, avec une fonction d'échappement appliquée à chaque valeur venue de l'extérieur :

```js [nœud Code n8n « Build Patch Command » (extrait)]
// Une valeur venant de la requête ne doit jamais sortir de ses apostrophes
function shq(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }

const sh = 'ruby ast_patch_ruby.rb --file ' + shq(targetFile) + ' --method ' + shq(method);
```

Le quatrième, avec une vérification avant chaque écriture : le chemin résolu doit rester **dans** le dossier du projet.

```js [nœud Code n8n « 07b · File Writer » (extrait)]
function safeJoin(base, rel) {
  const b = path.resolve(base);
  const full = path.resolve(b, String(rel));
  if (!full.startsWith(b + path.sep)) throw new Error('chemin hors du projet refusé : ' + rel);
  return full;
}
```

C'est une vérification lexicale : elle bloque les `../` qu'un modèle pourrait renvoyer, pas un lien symbolique qui pointerait hors du projet. Pour mes dépôts, c'est suffisant.

> ⚠️ Une liste blanche de **conteneurs** ne dit rien de ce qu'on **exécute** dedans. Dès qu'une commande est construite à partir d'une donnée reçue, l'échappement n'est pas optionnel, même sur un service interne.

> ⚠️ docker-bridge fait confiance à n8n, qui détient le jeton. Protéger le bridge ne sert donc à rien si l'entrée n'est pas protégée elle aussi : chez moi, n8n n'est joignable que depuis le réseau local, et ajouter une authentification sur ses webhooks est la prochaine étape.

> 💡 La leçon la plus inattendue de cette série : **écrire sur un outil oblige à le relire**. Ces quatre trous existaient depuis des semaines, et aucun incident ne les avait révélés.

#### 🕳️ Attraper les réponses vides ou tronquées

Voici les échecs silencieux rencontrés, et ce que la réponse du webhook renvoie maintenant pour chacun :

::tool-table
| Incident | Avant | Maintenant |
|----------|-------|------------|
| Un refactoring renvoie le fichier **identique** à l'original | `filesWritten: 1`, `qualityScore: 100`, `error: null` | `error: "no_op: …"`, rien n'est écrit |
| La réponse ne contient aucun bloc de code | `error: null` | `error: "empty_generation: …"` |
| La consigne ou les conventions dépassent la taille prévue | Coupées en silence (2000 et 6000 caractères) | Limites élargies, et la troncature est signalée dans `meta.promptTruncations` |
| Un gros fichier existant est envoyé pour modification | Coupé à 16 000 caractères… et le fichier tronqué était écrit | Envoyé jusqu'à 60 000 caractères, au-delà : `existing_content_truncated`, rien n'est écrit |
| La réponse semble coupée (plus de la moitié des lignes existantes disparues) | Écrite telle quelle | Refusée : `suspected_truncated_output` |
::

> 💡 Le cas du `no_op` est le plus traître : tous les indicateurs étaient au vert. Seule une comparaison avec le fichier d'origine montrait que **rien n'avait changé**. Depuis, un refactoring est toujours comparé à son point de départ.

#### ✂️ Les modifications que personne n'a demandées

Quand on demande d'**ajouter** quelque chose à un fichier existant, le modèle renvoie le fichier complet. Et il en profite parfois pour retoucher des lignes qui n'avaient rien à voir.

Exemple réel : en demandant d'ajouter des exemples à un fichier de specs, Blackstaff a transformé une ligne existante, `"X-Total-Pages"` → `"X-Total-PAGES"`, **3 fois sur 4**. Les specs restaient vertes, rien ne le signalait.

Le **patch AST** décrit dans l'[article sur les mesures](/blog/article/generation-code-llm-local) évite ce problème quand on génère une seule méthode : le reste du fichier n'est jamais touché. Mais quand le modèle doit renvoyer le fichier complet (une spec, un fichier de traduction, un fichier sans classe), il faut un autre filet. Un contrôle a été ajouté (`mergeCheck`) : dès qu'un contenu existant est fourni, la réponse liste **chaque ligne existante supprimée ou modifiée**, avec l'avant et l'après.

```json [réponse (extrait simplifié)]
"mergeCheck": {
  "alteredExisting": [
    { "line": 42, "before": "\"X-Total-Pages\"", "after": "\"X-Total-PAGES\"" }
  ]
}
```

Pour une tâche purement additive, l'option `"mergePolicy": "additive"` va plus loin : les lignes existantes modifiées sont **remises en place** avant l'écriture.

![Détection des lignes modifiées par mergeCheck](/img/content/blackstaff/blackstaff-mergecheck.png){ width=100% }

> ⚠️ Jamais pour une correction : là, modifier des lignes existantes est justement le but. Il faut alors lire la liste et vérifier que chaque changement a bien été demandé.

#### 🧪 Contrôler les specs générées

Les specs générées ont leurs propres pièges : un adaptateur de jobs supposé au lieu de celui du projet, des stubs sur des méthodes qui n'existent pas, des matchers inventés, des factories qui ne correspondent à aucun modèle…

Quand le projet déclare un conteneur de vérification dans son `.blackstaff/index.md` (`stack.backend.checkContainer`), Blackstaff lance lui-même un script d'analyse (`rspec_pitfalls.rb`) sur chaque spec générée. La réponse contient alors un `specCheck` : si la spec est rejetée, les indications du script deviennent directement le message de la relance.

C'est la même leçon que dans l'[article sur les mesures](/blog/article/generation-code-llm-local) : **un défaut mécanique se corrige avec un outil**, pas avec un rappel dans le prompt.

#### 💥 L'incident : écrire dans le vrai dépôt

Pendant les premières séries de mesures, j'ai découvert que Blackstaff écrivait ses fichiers **directement dans le dépôt de travail**, en plus de les renvoyer dans la réponse : 4 fichiers sur 4. Ce n'était pas un bug : le workflow contient bien une étape d'écriture (`07b · File Writer`), et le dossier des projets est monté dans le conteneur n8n. Mes mesures, elles, supposaient qu'il se contentait de renvoyer le code.

Aucun commit, `git checkout --` a tout restauré. Mais la règle est maintenant claire :

* tout essai se fait dans un **`git worktree` jetable**, monté dans un conteneur jetable ;
* `git status` après **chaque** appel, pas en fin de session ;
* à terme, un vrai **mode « à blanc »** dans le workflow, qui renvoie sans jamais écrire.

#### 📊 Tout journaliser, tout mesurer

Deux outils ferment la boucle :

- **Un journal** : chaque génération ajoute une ligne dans une table n8n (`llm_generation_log`) : fichier, méthodes, résultat (`written`, `failed`, `rejected_wrapper`), erreur. La journalisation est configurée pour ne **jamais** faire échouer une génération. Ce journal est distinct de celui de l'agent (`review-log.jsonl`, présenté dans le [premier article](/blog/article/blackstaff-presentation)) : n8n enregistre chaque appel, l'agent enregistre ses décisions de relecture.
- **Une CI des prompts** : un script qui monte une infrastructure jetable, rejoue des tickets réels, passe le garde-fou, note avec les vraies specs et compare à une référence. Le code de sortie est exploitable par Jenkins. Un changement de prompt ou de modèle qui fait baisser le score ne passe pas.

C'est cette CI qui a permis de rejeter, chiffres à l'appui, plusieurs « bonnes idées » : rappels dans le prompt, fiche de conventions, modèle plus récent.

![Rejeu automatisé des générations dans la CI des prompts](/img/content/blackstaff/blackstaff-replay-ci.png){ width=100% }

#### ✅ Conclusion

Aucun de ces garde-fous n'était prévu au départ. Chacun est arrivé après un incident (souvent un `error: null` qui mentait) ou après une relecture du code, comme pour docker-bridge.

Si je ne devais retenir qu'une chose : **un générateur de code doit être aussi bavard sur ses doutes que sur ses succès**. Une réponse qui dit « j'ai tronqué », « je n'ai rien changé » ou « j'ai modifié la ligne 42 » vaut bien plus qu'un `qualityScore: 100`.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
