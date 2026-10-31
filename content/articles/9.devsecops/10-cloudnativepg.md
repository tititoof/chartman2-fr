---
title: "Lab DevSecOps (10/11) : PostgreSQL dans le cluster avec CloudNativePG"
description: "Remplacer le PostgreSQL partagé en Docker par trois instances répliquées dans k3s : réplication synchrone en quorum, sauvegardes continues hors du cluster, un test de restauration qui prouve quelque chose, des pannes chronométrées, puis la bascule de six bases, une par une. Avec le client invisible trouvé au dernier moment."
icon: "i-mdi:database-sync-outline"
article_id: "10-devsecops-cloudnativepg"
color: "orange"
draft: true
publishedAt: '2026-10-29'
---
#### 📌 Où on en est

Après les épisodes [8](/blog/article/08-devsecops-migrer-sans-casser) et [9](/blog/article/09-devsecops-jenkins-kubernetes), tous les services tournent dans k3s… et tous dépendent toujours d'un **unique conteneur PostgreSQL**, en Docker, sur une seule machine. Si cette machine tombe, Forgejo, Jenkins, SonarQube, Windshift, DefectDojo et Coolify tombent avec elle. Et il n'existe **aucune sauvegarde**.

C'est la dernière brique, et la plus sensible. On l'a gardée pour la fin exprès : avant d'y toucher, tout le reste devait être stable.

L'inventaire de départ :

::tool-table
| Base | Taille | Propriétaire | Remarque |
|---|---|---|---|
| sonarqube | 66 Mo | sonarqube | |
| windshift | 38 Mo | windshift | |
| defectdojo | 34 Mo | defectdojo | extension `pg_trgm` |
| coolify | 30 Mo | **superutilisateur** | client hors du cluster (Docker) |
| forgejo | 19 Mo | **superutilisateur** | |
| base de test de la CI | 11 Mo | **superutilisateur** | recréée vide |
| deux bases sans client | 44 Mo | | archivées, pas migrées |
::

260 Mo en tout : la taille n'est pas le problème. Le problème, c'est que **trois applications se connectaient avec le superutilisateur**, que le port 5432 était publié par Docker (donc ignoré par le pare-feu), et qu'une panne de disque aurait tout effacé.

#### 🎻 CloudNativePG, en une image

Imagine une **chorale** de trois chanteurs. Un seul chante la mélodie (le **primaire**), et les deux autres répètent chaque note juste après lui (les **répliques**). Un **chef de chœur** surveille. Si le chanteur principal perd sa voix, le chef désigne un remplaçant, qui connaît déjà toute la chanson. Et chaque soir, une partition complète part dans un autre bâtiment, pendant qu'on y envoie **chaque note** au fur et à mesure.

Le chef de chœur, c'est l'**opérateur** CloudNativePG : un programme qui étend Kubernetes avec de nouveaux types d'objets (`Cluster`, `Database`, `Backup`…) et qui connaît PostgreSQL. On lui dit « je veux trois instances, avec ces rôles, sauvegardées là », et il s'occupe de la réplication, des bascules et des sauvegardes.

::tool-table
| Objet | Rôle |
|---|---|
| `Cluster` | « 3 instances PostgreSQL 18, réparties comme ceci, avec ces rôles » |
| Service `pg-rw` | va toujours vers le primaire, même après une bascule |
| Service `pg-ro` | va vers les répliques (lecture seule) |
| `Database` | une base déclarée : nom, propriétaire, extensions |
| `ObjectStore` | où envoyer les sauvegardes |
| `ScheduledBackup` | quand faire une sauvegarde complète |
::

L'opérateur et son plugin de sauvegarde (`barman-cloud`) sont installés par Terraform, avec des versions figées, comme le reste du socle. Le `Cluster` lui-même est dans un petit chart local, pour la même raison que la configuration de MetalLB dans l'[épisode 7](/blog/article/07-devsecops-k3s-socle) : ses types n'existent pas tant que l'opérateur n'est pas installé.

#### 🗂️ Le stockage : pas de Longhorn cette fois

L'épisode 7 a installé Longhorn, qui garde **deux copies** de chaque volume sur deux nœuds. Pour PostgreSQL, ce serait une mauvaise idée : CloudNativePG réplique **déjà** les données entre ses instances. Longhorn recopierait chaque écriture une seconde fois, par le réseau, sur un autre disque dur. Ce serait photocopier les photocopies.

Le plan prévoyait donc une classe Longhorn à **une seule copie**, gardée sur le disque local. Impossible : un des trois serveurs, ilmater, **n'a pas de disque Longhorn** (exclu à cause de son contrôleur lent). Et PostgreSQL veut une instance par serveur.

La solution : **local-path-provisioner**, qui crée un volume dans un simple dossier du nœud. C'est exactement ce que recommande la documentation de CloudNativePG pour un cluster qui se réplique lui-même. Le `local-storage` intégré à k3s était désactivé (pour ne pas avoir deux classes par défaut) : on installe local-path nous-mêmes, avec une classe qui **n'est pas** celle par défaut.

Deux pièges à l'installation :

- **le nom codé en dur.** local-path crée de petits pods d'aide pour fabriquer les dossiers, avec un compte de service nommé `local-path-provisioner-service-account`, codé en dur. Le nôtre s'appelait autrement, et les volumes restaient `Pending` (« serviceaccount not found »). L'option `--service-account-name` règle ça ;
- **`fsGroup` ne s'applique pas aux volumes `hostPath`.** Kubernetes sait changer le groupe d'un volume pour que le conteneur puisse y écrire, mais pas pour un dossier de l'hôte. PostgreSQL (UID 26) ne pourrait pas écrire dans un dossier appartenant à root en `0770`. Comme le projet d'origine, on crée chaque dossier en `0777`, et on met leur dossier parent en `0700` pour que rien d'autre sur l'hôte n'y entre.

#### 🏗️ Le cluster

```yaml [charts/postgres/templates/cluster.yaml]
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: pg
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:18.6-standard-trixie
  # Bascule vers une réplique pour les mises à jour, plutôt qu'un redémarrage du primaire
  primaryUpdateStrategy: unsupervised
  primaryUpdateMethod: switchover

  storage:
    storageClass: local-path
    size: 10Gi
  # WAL sur un volume à part : un WAL plein ne bloque pas les données, et inversement
  walStorage:
    storageClass: local-path
    size: 5Gi

  # Une instance par serveur, jamais deux sur le même nœud, jamais sur l'agent
  affinity:
    enablePodAntiAffinity: true
    podAntiAffinityType: required
    topologyKey: kubernetes.io/hostname
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: node-role.kubernetes.io/control-plane
                operator: Exists

  postgresql:
    # Chaque écriture est confirmée par au moins une réplique ; si les deux
    # répliques sont absentes, le primaire continue d'écrire seul (preferred)
    synchronous:
      method: any
      number: 1
      dataDurability: preferred
    # CloudNativePG termine toujours par « host all all all scram-sha-256 » :
    # la dernière règle ci-dessous refuse tout ce qui n'est pas listé avant
    pg_hba:
      - host all all 10.42.0.0/16 scram-sha-256     # pods du cluster
      - host all all 192.168.1.0/24 scram-sha-256   # réseau local
      - host all all 172.16.0.0/12 scram-sha-256    # conteneurs Docker (voir plus bas)
      - host all all all reject

  # Pas de superutilisateur accessible par mot de passe
  enableSuperuserAccess: false
```

##### Explications

- **`podAntiAffinityType: required`** : deux instances sur le même nœud, c'est une seule panne pour deux instances. `required` refuse de les y mettre, quitte à laisser une instance en attente.
- **`nodeAffinity` sur `control-plane`** : seulement sur les trois serveurs. L'agent, une machine de lab, peut redémarrer à tout moment.
- **La réplication synchrone en quorum** (`any 1`) : chaque `COMMIT` attend qu'**au moins une** des deux répliques ait reçu l'écriture. Si le primaire meurt, aucune transaction validée n'est perdue. `dataDurability: preferred` assume un compromis : si les **deux** répliques sont absentes, le primaire continue seul plutôt que de bloquer toutes les écritures.
- **`pg_hba` fermé** : CloudNativePG ajoute toujours une dernière règle qui accepte tout le monde avec un mot de passe. La règle `reject` placée juste avant coupe tout ce qui n'a pas été autorisé plus haut.
- **Pas de superutilisateur par mot de passe** : l'administration passe par `kubectl exec … psql`, une connexion **locale** dans le pod.

##### Un rôle par application

```yaml [charts/postgres/templates/cluster.yaml]
managed:
  roles:
    - name: forgejo
      ensure: present
      login: true
      passwordSecret:
        name: pg-role-forgejo
    # … un rôle par application
    # Lecture seule sur toutes les bases (sauvegardes logiques)
    - name: postgresus
      ensure: present
      login: true
      inRoles: [pg_read_all_data]
      passwordSecret:
        name: pg-role-postgresus
```

L'opérateur crée les rôles et leur applique le mot de passe de leur Secret. Les Secrets sont créés par Ansible depuis le vault, comme tous les autres : aucun mot de passe ne passe par Terraform. Chaque base est ensuite une ressource `Database`, avec son propriétaire et ses extensions (`pg_trgm` pour DefectDojo).

Un réglage manque à CloudNativePG : par défaut, PostgreSQL laisse **n'importe quel rôle se connecter à n'importe quelle base**. Il ne peut pas lire les tables des autres, mais il peut s'y connecter. Vérifié : le rôle de SonarQube ouvrait la base de Windshift. On le corrige en SQL, une fois :

```sql
REVOKE CONNECT, TEMPORARY ON DATABASE windshift FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE windshift TO windshift;
```

Après : « User does not have CONNECT privilege ». Comme ce n'est pas géré par la ressource `Database`, c'est à refaire si une base est recréée.

##### Un accès depuis l'extérieur du cluster

Coolify reste en Docker, hors du cluster, et l'outil de sauvegardes logiques tourne sur une autre machine. Les deux ont besoin de PostgreSQL. CloudNativePG peut créer un Service supplémentaire, ici de type `LoadBalancer`, que MetalLB place sur `192.168.1.52`. Il pointe toujours vers le primaire, même après une bascule.

**Le piège.** Depuis le poste : connexion OK. Depuis la machine qui héberge Coolify : OK. Depuis **le conteneur** Coolify, sur cette même machine : rien, pas même une réponse TCP. Le paquet part avec l'adresse **du réseau Docker** (`172.19.x`), absente des sources autorisées par le Service. D'où la plage `172.16.0.0/12` ajoutée aux sources du Service **et** à `pg_hba` : quand le primaire tourne sur le même nœud que le conteneur, le paquet arrive sans traduction d'adresse.

> 💡 Teste depuis l'endroit **exact** où tourne le vrai client. « Ça marche depuis la machine » ne dit rien d'un conteneur sur cette machine.

#### 💾 Les sauvegardes

Le plugin **barman-cloud** envoie deux choses vers un stockage compatible S3 :

- **une sauvegarde complète**, tous les jours à 3 h ;
- **chaque fichier WAL**, le journal des écritures de PostgreSQL, dès qu'il est rempli. C'est ce qui permet de restaurer la base **à n'importe quelle minute**, pas seulement à 3 h du matin.

La destination est un bucket sur un **RustFS** (un stockage S3 auto-hébergé) installé sur **une autre machine**, gond, qui ne fait pas partie du cluster. La sauvegarde survit donc à la perte d'un nœud. Elle ne survivrait pas à un incendie, puisque gond est dans la même maison : une copie hors site viendra plus tard.

```yaml [charts/postgres/templates/backup.yaml]
apiVersion: barmancloud.cnpg.io/v1
kind: ObjectStore
metadata:
  name: gond-rustfs
spec:
  retentionPolicy: "30d"
  configuration:
    destinationPath: s3://cnpg-backups/
    endpointURL: https://rustfs-api.homelab.example
    s3Credentials:
      accessKeyId: {name: pg-s3, key: ACCESS_KEY_ID}
      secretAccessKey: {name: pg-s3, key: ACCESS_SECRET_KEY}
    wal:
      compression: gzip
    data:
      compression: gzip
```

La clé S3 utilisée n'a de droits **que** sur ce bucket : lecture, écriture et suppression (barman applique lui-même la rétention de 30 jours en supprimant les vieilles sauvegardes). Vérifié avec la clé elle-même : accès refusé à un autre bucket, à la création d'un bucket et à l'administration.

##### Le piège du nom d'hôte

Première tentative : `NoSuchBucket` pour une simple liste des buckets, alors que la même requête, envoyée directement au port de RustFS, fonctionnait. RustFS était configuré avec `RUSTFS_SERVER_DOMAINS` sur le nom de sa **console**. Une requête arrivant par le nom de l'**API**, `rustfs-api.homelab.example`, était lue en « virtual-host style » : RustFS croyait que le sous-domaine désignait un **bucket**. La démonstration tient en deux requêtes qui ne diffèrent que par l'en-tête `Host` :

```bash
curl --aws-sigv4 "aws:amz:us-east-1:s3" --user "$CLE:$SECRET" -H "Host: rustfs-api.homelab.example" http://127.0.0.1:9000/
# <Code>NoSuchBucket</Code>
curl --aws-sigv4 "aws:amz:us-east-1:s3" --user "$CLE:$SECRET" -H "Host: rustfs.homelab.example" http://127.0.0.1:9000/
# la liste des buckets
```

La correction : déclarer le nom de l'API dans `RUSTFS_SERVER_DOMAINS`.

#### 🧪 La seule preuve qui compte : restaurer

> Une sauvegarde jamais restaurée ne compte pas.

Le test doit prouver deux choses : que la sauvegarde complète est bonne, **et** que les WAL se rejouent. Pour ça :

1. écrire une **ligne témoin**, 17 minutes **après** la sauvegarde complète ;
2. forcer l'envoi du WAL qui la contient :

```sql
INSERT INTO restore_probe(note) VALUES ('témoin avant test de restauration');
SELECT pg_switch_wal();
```

3. créer un **cluster neuf**, à partir de la sauvegarde sur gond ;
4. y chercher la ligne témoin.

```yaml [k8s/postgres-restore-test/cluster.yaml]
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: pg-restore-test
spec:
  instances: 1
  imageName: ghcr.io/cloudnative-pg/postgresql:18.6-standard-trixie
  storage:
    storageClass: local-path
    size: 10Gi
  # Pas d'archivage : le cluster de test ne doit rien écrire dans le bucket
  bootstrap:
    recovery:
      source: origin
      # Pour une restauration à un instant donné (PITR) :
      # recoveryTarget:
      #   targetTime: "2026-10-29 09:30:00+00"
  externalClusters:
    - name: origin
      plugin:
        name: barman-cloud.cloudnative-pg.io
        parameters:
          barmanObjectName: gond-rustfs
          serverName: pg
```

Le cluster restauré est prêt en **71 secondes**, avec toutes les bases, tous les rôles, l'extension `pg_trgm`… et **la ligne témoin**. Elle ne pouvait venir que des WAL archivés : la restauration à un instant précis fonctionne. Le manifeste reste dans le dépôt, avec la procédure en commentaire, pour rejouer le test de temps en temps.

#### ⏱️ Les pannes, chronométrées

Toujours **avant** d'y mettre des données réelles. Un petit pod écrit une ligne toutes les demi-secondes par `pg-rw`, et note OK ou KO avec l'adresse du serveur qui a répondu :

::tool-table
| Test | Ce que fait l'opérateur | Écritures coupées |
|---|---|---|
| Suppression du pod primaire | promeut une réplique ; l'ancien primaire revient en réplique | **≈ 6 s** |
| Bascule planifiée vers un autre nœud | attend que la cible ait tout rejoué, puis bascule | **≈ 8 s** |
::

La bascule planifiée a servi à déplacer le primaire vers le nœud au disque le plus rapide. Elle se commande d'ordinaire avec le plugin `kubectl cnpg`. Sans lui, on fait ce qu'il fait lui-même : modifier la cible du primaire dans le statut du cluster.

```bash
kubectl -n postgres patch cluster pg --subresource=status --type=merge \
  -p '{"status":{"targetPrimary":"pg-3","targetPrimaryTimestamp":"<maintenant>","phase":"Switchover in progress"}}'
```

Et le coût de la réplication synchrone, sur des disques durs, mesuré avec `pgbench` :

::tool-table
| Mode | Latence | Transactions/s |
|---|---|---|
| Synchrone (`ANY 1`) | **2,4 ms** | 1 683 |
| Sans attendre les répliques | 1,3 ms | 3 089 |
::

La réplication double la latence, mais 2,4 ms, pour une charge réelle de quelques requêtes par seconde, c'est invisible.

#### 🔀 La bascule, base par base

La méthode de l'épisode 8, appliquée six fois, de la moins critique à la plus critique :

1. arrêter l'application, et vérifier qu'il ne reste **aucune** connexion sur l'ancienne base ;
2. `pg_dump` sur l'ancien serveur, envoyé directement dans `pg_restore` sur le nouveau primaire ;
3. compter les lignes de **chaque** table, des deux côtés ;
4. pointer l'application vers `pg-rw`, et la redémarrer.

```bash
ssh admin@cyric "docker exec homelab-postgresql-1 sh -c 'pg_dump -U \$POSTGRES_USER -Fc -d forgejo'" \
  | kubectl -n postgres exec -i pg-3 -c postgres -- \
    pg_restore -U postgres -d forgejo --no-owner --no-privileges --role=forgejo
```

`--no-owner --role=forgejo` fait appartenir chaque table au **rôle de l'application**, et plus au superutilisateur. Le comptage, lui, interroge vraiment chaque table au lieu de se fier aux statistiques :

```sql
select n.nspname||'.'||c.relname||'='||(xpath('/row/c/text()',
       query_to_xml(format('select count(*) as c from %I.%I', n.nspname, c.relname), false, true, '')))[1]::text
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r' and n.nspname not in ('pg_catalog', 'information_schema') order by 1;
```

::tool-table
| Base | Contrôle | Coupure |
|---|---|---|
| test de la CI | recréée vide | — |
| sonarqube | 126 tables, 77 584 lignes | ~ 6 min |
| defectdojo | 208 tables, 7 155 lignes | ~ 5 min |
| windshift | 300 tables, 30 761 lignes | ~ 6 min |
| forgejo | 127 tables, 2 398 lignes | **55 s** |
| coolify | 64 tables, 1 210 lignes | **34 s** |
::

Les trois applications qui se connectaient en superutilisateur ont maintenant **leur propre rôle**. Et les connexions vérifiées (Forgejo, Windshift, Coolify) passent en **TLS**, là où l'ancienne configuration le désactivait parfois explicitement (`sslmode=disable`).

##### Quatre pièges de la bascule

**Un commentaire qui échoue.** La restauration de DefectDojo a échoué sur `COMMENT ON EXTENSION pg_trgm` : l'extension, créée par l'opérateur, appartient à `postgres`, pas au rôle de l'application. Sans conséquence. D'où la règle : restaurer **sans** `--exit-on-error`, puis lire **chaque** erreur, plutôt que de s'arrêter à la première ou de les ignorer toutes.

**Une base neuve lance les seeds.** La base de test de la CI a été recréée vide. Premier build : 5 tests en échec, « Position has already been taken ». Sur une base **neuve**, `rails db:prepare` charge le schéma **puis lance `db/seeds.rb`**. L'ancienne base, déjà initialisée, ne l'avait jamais fait. On vide les tables en gardant le schéma, et le build suivant passe.

**Une variable partagée.** L'adresse de l'ancien PostgreSQL était une seule variable Terraform, utilisée par plusieurs services. La changer aurait basculé tout le monde d'un coup. Une nouvelle variable permet de passer les services **un par un**, et l'ancienne disparaît à la fin.

**Le mot de passe hors de Terraform.** Le mot de passe de Forgejo était dans son fichier `app.ini`, sur son volume. Pour passer au nouveau rôle, le chart de Forgejo sait lire une variable d'environnement depuis un Secret (`FORGEJO__DATABASE__PASSWD`), que son init container écrit dans `app.ini`. Le mot de passe ne passe ni par Terraform, ni par le dépôt.

#### 🕵️ Le client invisible

Toutes les bases sont basculées. Il ne reste qu'à arrêter l'ancien PostgreSQL. Dernière vérification :

```sql
SELECT datname, usename, client_addr FROM pg_stat_activity WHERE backend_type = 'client backend';
-- (0 ligne)
```

Aucune connexion. On pourrait arrêter. Mais deux comptages à deux minutes d'intervalle disent autre chose :

```sql
SELECT datname, sessions FROM pg_stat_database;
```

`sessions` compte **chaque connexion de client** depuis le démarrage, et il **montait** : une session par minute, sur cinq bases. Les connexions étaient trop brèves pour apparaître dans `pg_stat_activity`. Le journal, lui, ne rate rien. On l'active pour 90 secondes, sans redémarrer :

```sql
ALTER SYSTEM SET log_connections = on;  SELECT pg_reload_conf();
-- … attendre, lire le journal …
ALTER SYSTEM RESET log_connections;     SELECT pg_reload_conf();
```

```text
# extrait du journal, résumé
connection received: host=192.168.1.30 …
connection authorized: user=<superutilisateur> database=forgejo …
```

C'était **l'outil de sauvegardes logiques**, sur gond, configuré bien avant la migration, en superutilisateur, et que personne n'avait listé. Depuis la bascule, il sauvegardait consciencieusement **l'ancienne base, figée**. Arrêter l'ancien PostgreSQL aurait fait échouer ses sauvegardes. Ne pas l'avoir vu aurait été pire : des sauvegardes « vertes » d'une base qui n'était plus la bonne.

Il est maintenant branché sur le nouveau cluster, avec un rôle **en lecture seule** (`pg_read_all_data`). Il peut tout lire pour faire ses dumps, et rien écrire (vérifié : `CREATE TABLE` et `UPDATE` refusés).

Un piège dans le piège : le premier compteur essayé, `xact_commit`, montait **aussi**… sans aucun client, à cause de l'**autovacuum**, qui fait ses propres transactions. Il ne prouve rien. Seul `sessions` compte les clients.

> 💡 « Aucune connexion en ce moment » ne veut pas dire « aucun client ». Mesure sur une durée, avec un compteur qui ne compte **que** ce que tu cherches.

Cette fois, deux minutes et demie de journal : plus aucune connexion de l'extérieur. L'ancien conteneur est arrêté, ses données gardées deux semaines. Le port 5432, publié par Docker par-dessus le pare-feu, n'écoute plus.

#### ✅ Conclusion

::tool-table
| Avant | Après |
|---|---|
| Un conteneur, une machine | 3 instances sur 3 serveurs, bascule automatique en ~6 s |
| Aucune sauvegarde | complète chaque jour + WAL en continu, hors du cluster, **restauration testée** |
| Trois applications en superutilisateur | un rôle par application, propriétaire de sa seule base |
| N'importe quel rôle ouvre n'importe quelle base | `CONNECT` réservé au propriétaire |
| Connexions parfois sans TLS (`sslmode=disable`) | TLS (`sslmode=require`) |
| Port 5432 publié par Docker, hors pare-feu | Service interne, plus une IP dédiée limitée au réseau local |
::

La partie technique, CloudNativePG la rend presque simple : quelques dizaines de lignes de YAML pour la réplication, les sauvegardes et les bascules. Ce qui a demandé de l'attention, ce sont les **preuves** : une ligne témoin pour la restauration, un chronomètre pour les pannes, un comptage par table pour chaque base, et un journal de connexions pour savoir qui utilisait encore l'ancienne base.

Prochain et dernier épisode de cette série : les serveurs MCP, et une question qu'on aurait dû se poser plus tôt : qui tient la clé ?

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
