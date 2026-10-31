---
title: "Lab DevSecOps (11/11) : serveurs MCP, qui tient la clé ?"
description: "Quatre serveurs MCP auto-hébergés, quatre variantes du même défaut : le serveur ou le proxy détenait le jeton à la place du client, et quiconque atteignait l'adresse héritait de ses droits. Comment on l'a vu, les trois tests à lancer, pourquoi un filtre par IP derrière Docker ne marche pas, et le modèle à suivre : OAuth."
icon: "i-mdi:key-chain-variant"
article_id: "11-devsecops-mcp-qui-tient-la-cle"
color: "orange"
draft: true
publishedAt: '2026-10-29'
---
#### 📌 Où on en est

Les épisodes [6](/blog/article/06-devsecops-k3s-homelab) à [10](/blog/article/10-devsecops-cloudnativepg) ont déplacé tout le homelab dans un cluster k3s. Une famille de services n'a pas été « migrée » au sens strict, mais elle a été **auditée** pendant la migration, parce qu'il fallait bien la rebrancher : les **serveurs MCP**.

MCP (*Model Context Protocol*) est le protocole qui permet à un assistant comme Claude d'utiliser des outils : lire des tickets, lancer un build, consulter une analyse de qualité, exécuter une commande sur un serveur. Chaque service a son serveur MCP, qui traduit les demandes de l'assistant en appels à l'API du service.

Pendant l'audit, **quatre** serveurs MCP sur six avaient le même défaut. Aucun n'était exposé sur Internet, mais tous étaient joignables depuis le réseau local. Cet épisode raconte le défaut, sans la carte du réseau : on garde la leçon, pas l'adresse.

#### 🔑 L'image : le majordome qui porte la clé

Un serveur MCP, c'est un **majordome** qui agit dans ta maison à ta place : ouvrir les placards (lire), déplacer les meubles (modifier), entrer dans les maisons voisines (exécuter des commandes à distance).

La bonne façon de faire : le majordome n'a **aucune clé**. Chaque visiteur montre la sienne, et le majordome ne fait que ce que **cette clé-là** autorise.

La mauvaise : le majordome **porte lui-même la clé**, et il obéit à **quiconque sonne**. Il suffit alors de connaître l'adresse de la maison pour avoir tous les droits du propriétaire.

#### 🧩 Quatre variantes du même défaut

::tool-table
| Serveur MCP | D'où venait le jeton | Ce qu'un inconnu du réseau local pouvait faire |
|---|---|---|
| Forge Git | le serveur utilisait **son propre jeton** pour toute requête sans authentification | agir sur les dépôts, les tickets et les PR avec les droits du propriétaire |
| Serveur d'intégration continue | le **reverse proxy** ajoutait le jeton à chaque requête | utiliser l'API de la CI avec les droits du propriétaire |
| Analyse de qualité | le reverse proxy ajoutait le jeton, et le conteneur l'avait aussi en secours | lire les analyses, **changer le statut des problèmes** |
| SSH | aucun jeton : un « chemin secret » dans l'URL… qui valait `/mcp` | **exécuter des commandes** sur les serveurs configurés |
::

Deux mécanismes différents, une même conséquence.

**Le jeton dans le serveur.** Beaucoup de serveurs MCP se configurent avec une variable du type `SERVICE_TOKEN=…`. Dans un usage local (un seul utilisateur, une connexion `stdio`), c'est normal. Exposé en HTTP, le serveur s'en sert pour **toute** requête qui arrive sans authentification. Celui de la forge Git le faisait jusqu'à sa version 3 : depuis, il refuse toute requête sans en-tête `Authorization`, et il écoute sur `127.0.0.1` par défaut.

**Le jeton dans le proxy.** Pour « simplifier » la configuration du client, le reverse proxy ajoutait lui-même l'en-tête :

```yaml
# À NE PAS FAIRE : Traefik ajoute le jeton du serveur à toute requête
- "traefik.http.middlewares.mcp-auth.headers.customrequestheaders.Authorization=Bearer ${SERVICE_TOKEN}"
```

Le client n'a plus rien à configurer… et n'importe quel client non plus. Pire : `customrequestheaders` **écrase** l'en-tête envoyé par le client. Même un client qui envoyait son propre jeton se voyait imposer celui du proxy.

**Le chemin secret.** Le serveur SSH protège son accès par une URL de la forme `/private_<22 caractères aléatoires>`, générée au premier démarrage et gardée dans un fichier. Le fichier avait été réécrit avec `/mcp`, sans doute pour correspondre à la configuration d'un client. C'est l'adresse que tout le monde essaie en premier. Le mot de passe était écrit sur la porte.

#### 🔍 Comment on l'a vu

Par une question toute bête, posée à chaque serveur en le rebranchant : **et si j'appelle sans jeton ?**

Une requête `initialize`, la première de toute session MCP, sans aucun en-tête d'authentification :

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://mcp.homelab.example/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"audit","version":"0"}}}'
```

Un serveur bien configuré répond **401**. Quatre ont répondu **200**. Pour mesurer la gravité sans rien casser, on enchaîne sur `tools/list` (quels outils sont proposés ?), puis sur **un seul outil en lecture**, sans effet : lister des projets, des jobs, des serveurs.

- Deux serveurs ont renvoyé leurs données à un appelant anonyme.
- Un troisième listait ses outils, mais l'API derrière refusait (« anonymous is missing the Overall/Read permission »). L'application elle-même tenait bon.

On n'a lancé aucun outil d'écriture : pour savoir qu'une porte est ouverte, pas besoin d'entrer dans toutes les pièces.

#### 🛠️ La correction

##### Principe : le serveur ne détient plus aucun jeton

Chaque client envoie le sien. Le format dépend du service :

::tool-table
| Service | En-tête envoyé par le client |
|---|---|
| Forge Git (Forgejo) | `Authorization: token <jeton>` |
| CI (Jenkins) | `Authorization: Basic <base64 de utilisateur:jeton d'API>` |
| Analyse de qualité (SonarQube) | `Authorization: Bearer <jeton>` |
::

Côté serveur : on retire la variable de jeton du conteneur, et on supprime le middleware du proxy. Pour la CI, le serveur MCP séparé disparaît même : Jenkins a son propre plugin MCP (`/mcp-server/mcp`), qui applique les **droits Jenkins** de l'utilisateur authentifié.

Côté client (ici Claude Code), on enregistre l'en-tête **sans que le jeton apparaisse** dans l'historique du terminal :

```zsh
read -rs "T?Jeton : "; echo        # zsh ; en bash : read -rs -p "Jeton : " T
claude mcp add --transport http -s user ci https://ci.homelab.example/mcp-server/mcp \
  --header "Authorization: Basic $(printf 'utilisateur:%s' "$T" | base64 -w0)"
unset T
```

Un piège au passage : en zsh, `read -p` ne veut pas dire « prompt » mais « lire depuis un coprocessus » (`read: -p: no coprocess`). L'invite s'écrit `"T?Invite : "`.

##### Les trois tests, à chaque fois

::tool-table
| Test | Résultat attendu |
|---|---|
| Sans jeton | **401**, ou accès refusé par l'application |
| Avec un faux jeton | refus |
| Avec le vrai jeton | ça marche |
::

Le premier est le plus important : c'est lui qui a révélé les quatre trous. Le troisième évite de « sécuriser » un service jusqu'à le rendre inutilisable.

##### Retrouver le jeton à révoquer

Corriger ne suffit pas : l'ancien jeton a circulé, il faut le **révoquer**. Encore faut-il savoir lequel, quand un compte en a cinq. Jenkins garde des statistiques par jeton (dans `apiTokenStats.xml`) : nombre d'utilisations et date de la dernière. L'ancien jeton du proxy se reconnaissait sans hésiter : **plus de 30 000 utilisations**, la dernière quelques minutes avant la migration. Les jetons jamais utilisés, eux, peuvent partir aussi.

#### 🚧 Le cas du serveur SSH : pourquoi le filtre par IP n'a pas marché

Le serveur SSH a un seul client : l'assistant, **sur le même poste**. Première idée : garder le reverse proxy, et n'autoriser que l'adresse du poste.

```yaml
- "traefik.http.middlewares.poste-seul.ipallowlist.sourcerange=127.0.0.1/32,<IP du poste>/32,<passerelle Docker>/32"
```

Test depuis une autre machine du réseau : **toujours ouvert**. On retire la passerelle Docker de la liste : le poste **et** l'autre machine sont refusés tous les deux. Traefik voyait donc **la même adresse** pour tout le monde.

L'explication : Traefik tourne dans un conteneur, derrière des ports publiés par Docker. Dans cette configuration, le relais `docker-proxy` réexpédie chaque connexion **en son propre nom**, avec l'adresse de la passerelle du réseau Docker. C'est un standardiste qui transmet tous les appels en disant « c'est moi » : impossible de savoir qui est au bout du fil, donc impossible de filtrer par appelant.

La vraie solution était plus simple : **pas de réseau du tout**.

```yaml
mcp-ssh:
  # Joignable seulement depuis ce poste : plus de route dans le reverse proxy
  ports:
    - "127.0.0.1:8086:8086"
  labels:
    - "traefik.enable=false"
```

Avec un **vrai** chemin secret, régénéré et écrit directement dans le fichier et dans la configuration du client, sans jamais l'afficher. Et une **version figée** du paquet : il était lancé avec `@latest`, donc réinstallé depuis PyPI à chaque démarrage, pour un programme qui détient une clé SSH. Le tableau de bord du reverse proxy, ouvert sans mot de passe, a suivi le même chemin : publié sur `127.0.0.1` seulement.

> 💡 Un serveur qui n'a qu'un client, sur la même machine, n'a pas besoin d'écouter le réseau. `127.0.0.1` est la règle de pare-feu la plus fiable qui existe.

Et après coup ? Impossible de savoir si quelqu'un s'en était servi : le serveur ne voyait que l'adresse du proxy, et ses journaux sont partis avec le conteneur recréé. La seule piste restante, ce sont les journaux d'authentification des serveurs eux-mêmes.

#### 🌟 Le modèle à suivre : OAuth

Un serveur MCP sur six faisait déjà les choses bien : celui de **Windshift**. Il applique le mécanisme que prévoit la spécification MCP, **OAuth 2.1** :

```bash
$ curl -si -X POST https://windshift.homelab.example/mcp | grep -i www-authenticate
www-authenticate: Bearer resource_metadata="https://windshift.homelab.example/.well-known/oauth-protected-resource/mcp", scope="items:read items:write …"
```

- sans authentification, il répond **401**, et l'en-tête `WWW-Authenticate` indique **où** obtenir un jeton ;
- sa fiche `/.well-known/oauth-protected-resource` liste les **droits** qu'on peut demander (`items:read`, `items:write`, `workspaces:read`…) ;
- le client ouvre une page de connexion dans le navigateur, l'utilisateur accepte, et le client reçoit un jeton **à lui**, avec **ces** droits seulement, qui expire et se révoque.

Aucun jeton à copier-coller dans un terminal, aucun jeton partagé entre clients, et des droits limités à ce dont l'assistant a besoin.

::tool-table
| | Jeton dans le serveur ou le proxy | Jeton par client (en-tête) | OAuth |
|---|---|---|---|
| Un inconnu qui atteint l'adresse | a tous les droits | rien | rien |
| Jeton à copier à la main | non | oui | **non** |
| Droits limités par client | non | selon le service | **oui** (scopes) |
| Expiration, révocation par client | non | à la main | **oui** |
::

Le serveur MCP de la forge Git sait aussi faire de l'OAuth depuis sa version 3 : c'est la prochaine étape.

#### ✅ Conclusion

Aucun de ces serveurs n'avait de faille au sens habituel : pas de bug, pas de CVE. Chacun faisait **exactement** ce qu'on lui avait demandé. Le défaut était dans la configuration, et il venait toujours de la même envie : **simplifier la vie du client**, en mettant la clé ailleurs que chez lui.

Devant un serveur MCP, une seule question suffit : **qui tient la clé ?**

- si c'est le serveur ou le proxy, quiconque atteint l'adresse a ses droits ;
- si c'est le client, l'adresse ne suffit plus ;
- et si le client obtient sa clé par OAuth, avec des droits limités, c'est encore mieux.

Le test qui le révèle tient en une ligne : un appel **sans** jeton. S'il répond autre chose que 401, la porte est ouverte.

C'est le dernier épisode de cette série. Elle a commencé par un pare-feu sur un serveur de lab, et elle se termine sur la même idée qu'au premier jour : ne rien laisser ouvert par défaut, et le **vérifier**, plutôt que le supposer.

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
