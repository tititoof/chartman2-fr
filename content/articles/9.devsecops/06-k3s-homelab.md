---
title: "Lab DevSecOps (6) : passer le homelab sous k3s, mesurer avant de migrer"
description: "Trois vieux serveurs Dell, une quinzaine de stacks Docker Compose et des disques durs à plateaux : avant d'installer un cluster k3s à trois nœuds, on mesure. Ce que fio révèle des contrôleurs RAID, pourquoi trois serveurs etcd et pas quatre, le plan de migration du homelab, et ce que la réalité y a changé."
icon: "i-mdi:server-network"
article_id: "06-devsecops-k3s-homelab"
color: "orange"
draft: true
publishedAt: '2026-10-28'
---
#### 📌 Où on en est

La [série](/blog/article/05-devsecops-jenkins-trivy-defectdojo) s'est terminée sur un serveur de lab, **bhaal**, avec k3s, DefectDojo et un pipeline Jenkins qui scanne chaque image. Mais bhaal reste un bac à sable. Les services que j'utilise tous les jours tournent ailleurs, sur trois autres machines du homelab, en Docker Compose :

- **cyric** : Forgejo, PostgreSQL, le registry Docker
- **baine** : Windshift, Coolify, SonarQube…
- **ilmater** : Jenkins et ses agents

Chaque machine a son Traefik, ses certificats et son fichier compose de plusieurs centaines de lignes. Si une machine tombe, ses services tombent avec elle. Cet épisode ouvre une nouvelle étape : regrouper ces trois machines dans **un cluster k3s**, pour qu'un service puisse redémarrer sur un autre nœud.

Avant d'installer quoi que ce soit, on mesure.

#### 🖥️ L'inventaire

Les trois machines sont des serveurs Dell de la même génération :

::tool-table
| | cyric | baine | ilmater |
|---|---|---|---|
| CPU | Xeon X3430, 4 threads | Xeon X3440, 8 threads | Xeon X3440, 8 threads |
| RAM | 24 Go | 24 Go | 24 Go |
| Contrôleur | PERC H700 | PERC H700 | PERC H700 |
| Disques | 931 Go + 297 Go (vierge) | 464 Go | 297 Go |
| Réseau | 1 GbE | 1 GbE | 1 GbE |
::

72 Go de RAM au total et le même Debian 13 partout : pour un homelab, c'est une bonne base. Le point faible, ce sont les **disques durs à plateaux**.

#### 💽 Pourquoi les disques comptent : etcd

Avec plusieurs serveurs, k3s remplace sa base SQLite par **etcd**, la base de données de Kubernetes. etcd est très exigeant sur un point : à chaque écriture, il attend que le disque confirme qu'elle est réellement enregistrée (un `fdatasync`). La recommandation officielle est que **99 % de ces confirmations prennent moins de 10 ms**. Un disque dur à plateaux nu tourne plutôt autour de 10 à 20 ms.

Quand le disque est trop lent, les symptômes sont pénibles à diagnostiquer : élections de leader à répétition, API qui ne répond plus, nœuds qui passent `NotReady` sans raison apparente.

La documentation d'etcd propose un test fio qui reproduit son comportement : des écritures de 2,3 Ko, chacune suivie d'un `fdatasync`.

```bash
fio --rw=write --ioengine=sync --fdatasync=1 \
    --directory=$HOME/fio-etcd-test --size=22m --bs=2300 --name=etcd
```

#### 📊 Les résultats

::tool-table
| Nœud | p50 | **p99** | p99.9 | max |
|---|---|---|---|---|
| baine | 0,20 ms | **0,90 ms** | 1,06 ms | 3,9 ms |
| cyric | 0,93 ms | **1,43 ms** | 2,11 ms | 4,6 ms |
| ilmater | 1,32 ms | **15,0 ms** | 35,9 ms | 214 ms |
::

Première surprise : sur baine et cyric, de vieux disques durs répondent **en moins de 1,5 ms**, dix fois mieux que le seuil. Ce n'est pas le disque qui répond, c'est le **contrôleur RAID**. Le PERC H700 a un cache d'écriture protégé par une batterie : il confirme l'écriture dès qu'elle est dans son cache, et l'écrit sur les plateaux ensuite. Si le courant coupe, la batterie garde le cache le temps de redémarrer.

Deuxième surprise : ilmater, avec le **même contrôleur**, est dix fois plus lent, avec des pics à 214 ms.

#### 🔍 L'enquête sur ilmater

Premier suspect, la charge. Le noyau publie la part du temps pendant laquelle des tâches attendent le disque (`/proc/pressure/io`) :

```text
cyric    some avg10=0.57 avg60=1.48 avg300=0.47
baine    some avg10=0.06 avg60=0.24 avg300=0.07
ilmater  some avg10=8.27 avg60=26.24 avg300=40.79
```

ilmater passait près de **40 % de son temps** à attendre son disque. Il héberge les agents Jenkins, qui construisent des images via le Docker de l'hôte. `docker system df` montre le résultat de mois de builds :

```text
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          92        9         75.97GB   64.67GB (85%)
Build Cache     641       0         116.7GB   51.77GB
```

Un `docker image prune -a` et un `docker builder prune` plus tard, le disque passe de 66 % à 32 % d'occupation, et la pression I/O retombe à zéro. On relance le test :

::tool-table
| ilmater | p50 | **p99** | p99.9 | max |
|---|---|---|---|---|
| Avant le nettoyage | 1,32 ms | **15,0 ms** | 35,9 ms | 214 ms |
| Après, au repos | 1,25 ms | **15,3 ms** | 21,4 ms | 32,5 ms |
::

Les gros pics ont disparu, mais **le p99 n'a pas bougé**. La charge expliquait les pics, pas la lenteur de fond. Avec le même contrôleur qu'à côté et une machine au repos, le suspect restant est le cache du PERC : batterie morte, et contrôleur repassé en *write-through*, où chaque écriture attend les plateaux.

La vérification se fait au démarrage, dans l'utilitaire du contrôleur (Ctrl+R) : état de la batterie (BBU) et politique du disque virtuel, *Write Back* ou *Write Through*. Au moment d'écrire ces lignes, elle n'est pas encore faite. On a donc construit le cluster **en tenant compte** de la lenteur d'ilmater, plutôt qu'en attendant de la corriger.

> 💡 Leçon : sans la mesure, j'aurais conclu « vieux disques durs, donc etcd impossible » et acheté trois SSD. La mesure montre que deux machines sur trois sont excellentes, et que la troisième a probablement une batterie à 30 €.

#### 🗳️ Trois serveurs etcd, et pas quatre

Faut-il exclure ilmater du control plane ? Non, grâce au fonctionnement d'etcd. Il utilise l'algorithme **Raft** : une écriture est validée dès qu'une **majorité** de membres l'a enregistrée. Avec trois membres, il en faut deux. Le leader plus le plus rapide des deux autres suffisent : un ilmater lent ne ralentit pas le cluster tant qu'il n'est pas leader.

<mermaid>
graph LR
  W["✍️ Écriture"] --> L["👑 Leader<br/>(baine)"]
  L --> C["✅ cyric<br/>1,4 ms"]
  L --> I["🐢 ilmater<br/>15 ms"]
  C --> OK["Majorité 2/3<br/>écriture validée"]
</mermaid>

Et bhaal ? Avec lui, on aurait quatre machines. Mais quatre membres etcd demandent une majorité de trois : le cluster ne tolère toujours qu'**une seule** panne, comme avec trois, avec une machine de plus qui peut tomber.

::tool-table
| Membres etcd | Majorité | Pannes tolérées |
|---|---|---|
| 1 | 1 | 0 |
| 2 | 2 | **0** |
| 3 | 2 | 1 |
| 4 | 3 | 1 |
| 5 | 3 | 2 |
::

Le piège symétrique : deux serveurs, c'est **pire** qu'un seul. La perte de l'un des deux bloque tout.

bhaal ne sera donc pas un quatrième **serveur**. Le plan initial le gardait comme cluster séparé, pour la préproduction. En pratique, il a rejoint le homelab comme **agent** : un nœud k3s qui fait tourner des pods, mais qui ne vote pas dans etcd. Le quorum reste à trois, et le cluster gagne le seul disque SSD du parc pour son stockage.

::tool-table
| Rôle k3s | Vote dans etcd | Fait tourner des pods | Ici |
|---|---|---|---|
| Serveur | ✅ | ✅ | cyric, baine, ilmater |
| Agent | ❌ | ✅ | bhaal |
::

#### 🧭 Ce qui migre, et ce qui reste

Tout ne passe pas sous k3s, et c'est volontaire. Voici le plan de départ, et ce qu'il est devenu deux jours plus tard :

::tool-table
| Service | Plan de départ | Ce qui s'est passé |
|---|---|---|
| Forgejo | ➡️ k3s (chart officiel, 68 Mo de données) | ✅ migré |
| Windshift | ➡️ k3s (pas de chart : des manifests à écrire) | ✅ migré, et passé de SQLite à PostgreSQL au passage |
| Jenkins | ➡️ k3s (agents en pods, fin du `docker.sock` partagé) | ✅ migré, images construites sans Docker |
| PostgreSQL | ⏸️ Docker sur cyric, migré en dernier avec un opérateur | ✅ CloudNativePG, 3 instances, sauvegardes hors du cluster |
| Coolify | 🐳 Docker sur baine (il pilote Docker lui-même) | 🐳 resté en Docker, avec son Valkey à côté de lui |
| OpenProject | ⏸️ plus tard (usage à confirmer) | ⏹️ arrêté : Windshift fait le même travail |
| SonarQube, DefectDojo, mailpit, registry, Trilium | non prévus au départ | ✅ migrés aussi |
| itsaplan | non prévu | 🗑️ migré, puis supprimé le jour même : un projet, aucun ticket |
::

La décision la plus rentable n'est pas dans la colonne « migré » : c'est **mesurer l'usage avant de déménager**. Un service vide qu'on migre, c'est 5 pods et 460 Mo de RAM pour rien.

#### 🏗️ L'architecture visée

<mermaid>
graph TB
  DNS["🌐 Pi-hole<br/>forgejo / windshift / jenkins"] --> VIP["📍 IP virtuelle MetalLB"]
  VIP -->|":443"| T["🔀 Traefik k3s"]
  VIP -->|":22"| SSH["🔑 Forgejo SSH"]
  T --> F["🦊 Forgejo"]
  T --> W["🧭 Windshift"]
  T --> J["🧰 Jenkins"]
  F --> PG["🐘 PostgreSQL<br/>(Docker, cyric)"]
  subgraph Cluster["k3s : cyric · baine · ilmater (etcd ×3)"]
    T
    F
    W
    J
    LH["💾 Longhorn<br/>2 réplicas"]
  end
</mermaid>

Trois choix découlent de la cohabitation avec Docker :

1. **MetalLB en mode L2** plutôt que l'équilibreur intégré de k3s. Ce dernier (`servicelb`) publie les ports 80/443 sur **tous** les nœuds, déjà occupés par les Traefik Docker et Coolify. MetalLB répond pour une **nouvelle IP** du réseau local, sans toucher aux ports des machines.
2. **Le SSH de Forgejo sur le port 22 d'une IP de MetalLB**, sans conflit avec le SSH des serveurs. Les URL de clone perdent leur `:222`. Le plan prévoyait une IP dédiée. En pratique, Traefik (80/443), le SSH de Forgejo (22) et le SMTP de test (1025) **partagent la même IP**, ce que MetalLB autorise tant que les ports ne se chevauchent pas. Un seul nom sert le HTTPS et le SSH.
3. **Longhorn avec deux réplicas**, sur cyric (son disque vierge de 297 Go), baine, puis bhaal. Un volume suit son pod si un nœud tombe. ilmater ne stocke rien, à cause de son contrôleur lent. Ce choix a eu une conséquence inattendue plus tard : pour PostgreSQL, qui veut une instance par serveur, il a fallu un autre type de stockage (on y reviendra).

#### 🗺️ Le plan

Comme dans le reste de la série, tout passe par le dépôt : **Ansible** prépare les machines, **Terraform** installe ce qui tourne dans le cluster.

1. **Préparation** : batterie du PERC d'ilmater, mises à jour, sauvegardes, et rotation de secrets restés en clair dans un fichier compose (oui, ça arrive).
2. **Durcissement** : aucune des trois machines n'avait de pare-feu. On applique le rôle `hardening` de l'[épisode 1](/blog/article/01-devsecops-ansible-durcissement), un nœud à la fois.
3. **k3s multi-serveurs** : le rôle de l'[épisode 3](/blog/article/03-devsecops-k3s-ansible) apprend à initialiser un cluster sur cyric puis à y joindre baine et ilmater.
4. **Briques du cluster** : MetalLB, Longhorn, le certificat wildcard.
5. **Migrations**, de la plus simple à la plus délicate : Forgejo, puis Windshift, puis Jenkins.

Le plan a tenu dans les grandes lignes, et deux jours ont suffi. La suite de la série raconte chaque étape, avec ce qui a coincé :

::tool-table
| Épisode | Sujet |
|---|---|
| 7 | Le socle : k3s à trois serveurs, une seule IP pour tout, le stockage, les certificats |
| 8 | Migrer un service sans le casser : une méthode en 8 temps |
| 9 | Jenkins dans Kubernetes : des agents en pods, des images sans Docker |
| 10 | PostgreSQL avec CloudNativePG : réplication, sauvegardes et pannes chronométrées |
| 11 | Serveurs MCP : qui tient la clé ? |
::

#### ✅ Conclusion

Cet épisode ne contient pas une ligne de Kubernetes, et c'est peut-être le plus utile. Une heure de mesures a évité deux erreurs : acheter des SSD inutiles pour deux machines sur trois, et construire un cluster à quatre serveurs etcd moins solide qu'à trois. Elle a aussi fait tomber 100 Go de cache Docker oublié et une batterie probablement morte, des problèmes qui existaient déjà avant k3s.

Et la mesure ne s'arrête pas au début du projet : c'est en mesurant l'**usage** qu'on a décidé de ne pas garder un service, et c'est en mesurant les **connexions** à l'ancienne base qu'on a trouvé, au dernier moment, un client que personne n'avait listé.

Prochain épisode : le socle du cluster, de l'installation des trois serveurs à la première page servie en HTTPS.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
