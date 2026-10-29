---
title: "Lab DevSecOps (8) : migrer un service sans le casser, une méthode en 8 temps"
description: "Une même recette pour déplacer chaque service de Docker Compose vers k3s : inventaire, version figée, répétition, arrêt, copie contrôlée, bascule, retour arrière. Appliquée à Forgejo, à Windshift (passé de SQLite à PostgreSQL au passage), au registry Docker (21 Go devenus 1,2 Go) et à Trilium."
icon: "i-mdi:truck-delivery-outline"
article_id: "08-devsecops-migrer-sans-casser"
color: "orange"
draft: true
publishedAt: '2026-10-29'
---
#### 📌 Où on en est

Le [socle](/blog/article/07-devsecops-k3s-socle) est prêt : trois serveurs k3s, une IP partagée par MetalLB, Longhorn, un certificat wildcard. Il reste à y déplacer les services, qui tournent toujours en Docker Compose.

On pourrait les migrer un par un « à l'instinct ». C'est la meilleure façon d'oublier un fichier, de mettre à jour une application sans le vouloir, ou de couper un service sans savoir qui s'en servait. Cet épisode présente **une seule méthode**, appliquée à chaque service, puis la montre sur quatre cas qui ont chacun leur piège.

#### 🧭 La méthode en 8 temps

::tool-table
| # | Étape | La question à se poser |
|---|---|---|
| 1 | **Inventaire** | Quelle version tourne vraiment ? Quelles données ? **Qui l'utilise ?** |
| 2 | **Même version** | Est-ce que je migre, ou est-ce que je mets à jour ? (Jamais les deux.) |
| 3 | **Manifestes** | Les secrets passent-ils par Ansible, et pas par Terraform ? |
| 4 | **Répétition** | Est-ce que ça démarre sur une copie, sans toucher au DNS ? |
| 5 | **Arrêt** | Reste-t-il une seule connexion sur l'ancien ? |
| 6 | **Copie contrôlée** | Ai-je **compté** : chaque table, ou chaque fichier ? |
| 7 | **Bascule** | Le DNS, puis un test **réel** par l'utilisateur. |
| 8 | **Retour arrière** | L'ancien est-il encore là, arrêté, avec ses données ? |
::

Trois idées tiennent tout le reste.

**Une seule chose à la fois.** On migre **ou** on met à jour, jamais les deux. Si ça casse après une migration qui changeait aussi la version, on ne sait pas lequel des deux a cassé.

**Compter, pas regarder.** « L'interface a l'air de marcher » ne prouve rien. Le nombre de lignes de **chaque** table, ou l'empreinte sha256 de **chaque** fichier, des deux côtés. Une seule différence, et on ne bascule pas.

**L'ancien reste là.** Le service Docker est arrêté, pas supprimé. Revenir en arrière, c'est remettre l'ancienne adresse dans le DNS et relancer un conteneur. On supprime quelques jours plus tard, une fois sûr.

##### Étape 1 : la version qui tourne vraiment

`image: …:latest` dans un compose ne dit **pas** quelle version tourne. Il faut aller la chercher :

```bash
docker image inspect <image> --format '{{index .RepoDigests 0}} {{index .Config.Labels "org.opencontainers.image.version"}}'
```

puis comparer l'empreinte avec celles des tags publiés. Deux surprises pendant la migration :

- une image `latest` était passée à une nouvelle version majeure **la veille**. Recréer le conteneur l'aurait mise à jour sans prévenir ;
- un conteneur tournait sur une image d'une version, avec un fichier `.war` remplacé à la main depuis l'interface par une version **plus récente**. Recréer le conteneur depuis son image l'aurait **rétrogradé** (on en reparle dans l'épisode 9).

##### Étape 1 bis : qui l'utilise ?

C'est la question qu'on oublie. Deux réponses inattendues :

- un service migré proprement s'est révélé **vide** : un utilisateur, un projet, aucun ticket. Supprimé le jour même. Le déménagement le moins cher, c'est le carton qu'on jette ;
- une base qu'on croyait abandonnée recevait encore **une connexion par minute**, d'un outil de sauvegarde que personne n'avait listé. Comment on l'a trouvé : épisode 10.

##### Étape 4 : tester sans toucher au DNS

Le service tourne dans le cluster, mais tout le monde passe encore par l'ancien. `curl` sait forcer la résolution d'un nom :

```bash
curl --resolve forgejo.homelab.example:443:192.168.1.50 https://forgejo.homelab.example/
```

Le certificat est vérifié pour le vrai nom, la requête part vers le cluster, et rien ne change pour les autres.

#### 🦊 Cas 1 : Forgejo, et les valeurs par défaut du chart

Forgejo a un chart Helm officiel. On choisit la version du chart qui installe **exactement** la version de Forgejo qui tournait sous Docker : le chart 16.2.2 installe Forgejo 14.0.4. Le chart 17 aurait installé Forgejo 15. La montée de version se fera plus tard, à part.

**Le piège : le chart a ses idées.** Il remplace certaines clés de configuration par **ses** valeurs par défaut : le dossier des dépôts, celui des données, le port SSH, le stockage des sessions. Avec les données copiées depuis Docker, Forgejo aurait cherché les dépôts au mauvais endroit et démarré… sans aucun dépôt. Il faut fixer chaque chemin **explicitement** :

```hcl [terraform-homelab/forgejo.tf (extrait)]
config = {
  server = {
    SSH_PORT        = 22
    SSH_LISTEN_PORT = 22
    APP_DATA_PATH   = "/data/gitea"
  }
  # Chemins de l'installation Docker (le chart prendrait gitea-repositories)
  repository = {
    ROOT = "/data/git/repositories"
  }
  session = {
    PROVIDER        = "file"
    PROVIDER_CONFIG = "/data/gitea/sessions"
  }
}
```

**Les secrets restent dans `app.ini`.** `SECRET_KEY` et `INTERNAL_TOKEN` chiffrent des données en base. Les perdre, c'est perdre l'accès à ces données. Le chart ne les régénère pas quand `app.ini` existe déjà. On ne l'a pas supposé : on l'a **vérifié** dans les journaux de son init container avant d'ouvrir l'interface.

**La copie des fichiers.** Les 68 Mo de `/data` partent dans un volume Longhorn de 5 Gi :

1. `replicas: 0` dans Terraform, pour que le chart crée le volume sans démarrer Forgejo ;
2. `docker stop` de l'ancien conteneur ;
3. un pod temporaire qui monte le volume, et une archive envoyée dans un seul flux :

```bash
ssh admin@cyric 'sudo tar --numeric-owner -C ~/.docker/forgejo -cf - .' \
  | kubectl -n forgejo exec -i copie -- tar --numeric-owner -xf - -C /data
```

`--numeric-owner` garde les propriétaires **par leur numéro** (UID) plutôt que par leur nom, qui n'existe pas forcément dans le pod. Contrôle : **5 776 entrées** des deux côtés, propriétaires identiques. Puis `replicas: 1`.

**Le SSH.** La clé d'hôte SSH est dans les données copiées : les clients ne voient pas de « l'identité du serveur a changé ». En revanche, `known_hosts` sur le poste contenait une entrée pour `forgejo…` sur le port 22, qui était en réalité… la clé du **SSH système** de la machine, puisque Forgejo écoutait avant sur le port 222. À supprimer avec `ssh-keygen -R`, puis les remotes de 8 dépôts passent de `ssh://git@forgejo…:222/…` à `git@forgejo…:…`.

#### 🧭 Cas 2 : Windshift, changer de base en chemin

Windshift tournait sur **SQLite**, un fichier unique dans un volume. Dans un cluster, PostgreSQL est plus adapté : sauvegarde, réplication, accès concurrents. Windshift sait parler aux deux… mais n'a **aucun outil** pour passer de l'un à l'autre.

Ici, la règle « une seule chose à la fois » s'applique quand même : on change de moteur de base, **pas** de version de Windshift.

##### Le principe : laisser Windshift créer son schéma

Plutôt que de traduire le schéma SQLite à la main, on laisse Windshift le faire :

1. démarrer Windshift **une fois** sur une base PostgreSQL vide : il crée lui-même ses tables, à la même version de migrations que la base SQLite ;
2. l'arrêter ;
3. copier **seulement les données**, table par table.

Le script tient en 74 lignes. Le cœur :

```python [scripts/windshift-sqlite-to-postgres.py]
pg.execute("SET TIME ZONE 'UTC'")                       # dates SQLite sans fuseau = UTC
pg.execute("SET session_replication_role = replica")    # ni clés étrangères ni triggers

def convert(v, dt):
    if v is None: return None
    if dt == "boolean": return bool(int(v))
    if dt in ("integer", "bigint", "smallint"): return int(v)
    if dt in ("real", "double precision", "numeric"): return float(v)
    # SQLite range parfois du JSON ou du texte en BLOB
    if isinstance(v, bytes) and dt != "bytea": return v.decode("utf-8")
    return v if isinstance(v, (str, bytes)) else str(v)
```

##### Explications

- **`session_replication_role = replica`** suspend les clés étrangères et les triggers pendant la copie. Sans ça, il faudrait copier les tables dans l'ordre exact de leurs dépendances.
- **La conversion se fait selon le type PostgreSQL** de chaque colonne, lu dans `information_schema` : SQLite stocke les booléens en `0`/`1`, et parfois du JSON en BLOB.
- **`COPY … FROM STDIN`** plutôt que des `INSERT` : beaucoup plus rapide.
- **Les séquences sont recalées** après la copie (`setval` sur le plus grand identifiant). Sans ça, le premier ticket créé après la migration aurait reçu l'identifiant 1… déjà pris. 242 séquences ici.

Et surtout, **tout se passe dans une seule transaction**, avec le contrôle **avant** la validation :

```python [scripts/windshift-sqlite-to-postgres.py]
bad = []
for t in tables:
    s = sl.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
    p = pg.execute(sql.SQL("SELECT count(*) FROM {}").format(sql.Identifier(t))).fetchone()[0]
    if s != p: bad.append((t, s, p))
if bad:
    pg.rollback(); print("ÉCARTS, transaction annulée:", bad); sys.exit(1)
pg.commit()
```

Une seule table avec un écart, et **rien** n'est écrit.

##### Une répétition qui ne peut rien envoyer

La répétition tourne sur une **copie** des données, dans un namespace à part. Problème : une copie de Windshift contient les vrais utilisateurs, et elle pourrait envoyer des courriels ou des notifications **pour de vrai**. On l'isole avec une **NetworkPolicy** qui n'autorise qu'une sortie : vers PostgreSQL (et le DNS). Par exemple :

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: sortie-postgres-seulement
  namespace: windshift-test
spec:
  podSelector: {}
  policyTypes: [Egress]
  egress:
    - to:
        - ipBlock: {cidr: 192.168.1.10/32}     # PostgreSQL
      ports: [{protocol: TCP, port: 5432}]
    - ports: [{protocol: UDP, port: 53}]       # DNS
```

On ouvre la copie par `kubectl port-forward`, on vérifie à la main les projets, les tickets et les pièces jointes, puis on supprime le namespace.

##### Le piège SQLite au moment de la coupure

Après un arrêt **propre**, une base SQLite en mode WAL ouverte en **lecture seule** exige son fichier `-shm`… qui n'existe plus, puisque l'arrêt propre l'a supprimé. La copie refusait donc de s'ouvrir. La parade : l'ouvrir avec `immutable=1`, qui dit à SQLite que le fichier ne bougera plus et qu'il n'a besoin d'aucun fichier annexe.

Résultat : **23 897 lignes, comptes identiques sur 298 tables**. Windshift redémarre sur PostgreSQL, et le DNS bascule.

##### Les manifests, écrits à la main

Windshift n'a pas de chart : c'est l'occasion d'écrire des manifests propres, avec Kustomize.

```yaml [k8s/windshift/deployment.yaml]
spec:
  replicas: 1
  # Volume RWO : l'ancien pod doit libérer le volume avant que le nouveau démarre
  strategy:
    type: Recreate
  template:
    spec:
      securityContext:
        runAsUser: 65534
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: windshift
          # Version épinglée (tag + digest) : l'image « latest » change presque tous les jours
          image: ghcr.io/windshiftapp/windshift:v0.9.1@sha256:ad2c2f73…
          # Généreuse : une sonde trop pressée tue l'application qu'elle surveille
          livenessProbe:
            httpGet: {path: /health, port: http}
            initialDelaySeconds: 60
            periodSeconds: 30
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: [ALL]
```

- **`Recreate`** plutôt que la mise à jour progressive : le volume ne peut être monté que par un pod à la fois. Avec une mise à jour progressive, le nouveau pod attendrait indéfiniment que l'ancien libère le volume.
- **tag et digest** : le tag dit quelle version on voulait, et le digest garantit qu'on aura exactement cette image, même si quelqu'un republie le tag.
- **non-root, système de fichiers en lecture seule, aucune capacité** : si l'application est compromise, l'attaquant ne peut presque rien écrire.

#### 📦 Cas 3 : le registry Docker, 21 Go dont 20 inutiles

Le registry contient les images construites par la CI. Un seul dépôt, 6 tags… et **21 Go** sur le disque.

Chaque build repousse `staging`, `latest` et le cache de construction. Les anciennes couches restent sur le disque tant qu'on ne lance pas de **garbage-collect**. On le lance pendant la migration, sur une **copie**, l'original restant intact :

```bash
# Copie (cp -a garde les droits), puis GC sur la copie seulement
docker run --rm --entrypoint sh -v ./registry-data:/src:ro -v ./registry-gc:/dst registry:3.0.0 \
  -c "cp -a /src/. /dst/"
docker run --rm --entrypoint registry -v ./registry-gc:/var/lib/registry registry:3.0.0 \
  garbage-collect --delete-untagged /etc/distribution/config.yml
```

**21 Go → 1,2 Go.** Mais un GC qui supprime trop, c'est une image cassée qu'on découvrira au prochain déploiement. Contrôle sur un registry de test lancé sur la copie : pour **chacun** des 6 tags, le manifeste, puis chacune de ses couches. Et la plus grosse couche (51 Mo) est téléchargée en entier pour vérifier son sha256.

##### Le piège de `cp -a`

Entre la copie du matin et la bascule, quelqu'un aurait-il poussé une image ? Premier réflexe :

```bash
find registry-data -newer registry-gc/docker
```

Réponse : 1 422 fichiers. Faux : `cp -a` **conserve les dates** des fichiers copiés, donc la copie a l'air aussi vieille que l'original. Il faut comparer à l'**heure de la copie** :

```bash
find registry-data -newermt "2026-10-29 05:10 UTC" -type f    # 0 : rien de nouveau
```

Aucun push depuis la copie : on charge 1,2 Go dans le volume (35 secondes), on redémarre, on bascule le DNS. **Aucune coupure.** Le premier build suivant pousse son image et son cache sans erreur, grâce aux délais de 600 s réglés sur Traefik dans l'épisode précédent.

#### 📝 Cas 4 : Trilium, et le Service qui donne son nom à une variable

Trilium est une application de notes, avec une base SQLite. Rien de compliqué a priori. Premier démarrage dans le cluster :

```text
FATAL ERROR: Invalid port value "tcp://10.43.189.71:8080" from environment
variable TRILIUM_PORT, should be an integer between 0 and 65536.
```

Personne n'a défini `TRILIUM_PORT`. C'est **Kubernetes** qui l'a fait. Pour chaque Service d'un namespace, il injecte dans les pods des variables d'environnement à son nom, une habitude héritée des débuts de Docker : `<NOM>_SERVICE_HOST`, `<NOM>_PORT`… Notre Service s'appelle `trilium`, donc les pods reçoivent `TRILIUM_PORT=tcp://10.43.189.71:8080`. Et Trilium lit justement `TRILIUM_PORT` pour savoir sur quel port écouter.

```yaml [k8s/trilium/deployment.yaml]
spec:
  # Sinon le Service « trilium » injecte TRILIUM_PORT=tcp://…:8080, que Trilium
  # lit comme son port d'écoute et refuse
  enableServiceLinks: false
```

Plus personne n'utilise ces variables aujourd'hui : on utilise le DNS du cluster (`trilium.trilium.svc`). On a mis `enableServiceLinks: false` **partout** ensuite.

Deux autres détails :

- **sans root** : le script de démarrage de l'image démarre en root pour changer l'UID de l'utilisateur et faire un `chown`, puis passe à l'utilisateur `node`. On lance directement `node ./main.cjs` avec l'UID 1000 et un `fsGroup`, et le volume est préparé avec les bons droits ;
- **la copie** : conteneur arrêté (un arrêt propre intègre le journal WAL dans la base), puis **sha256 identiques sur les 46 fichiers**. Trilium redémarre avec ses 539 notes, et ses propres contrôles de cohérence passent.

#### 📊 Le bilan des quatre

::tool-table
| Service | Contrôle | Coupure | Piège principal |
|---|---|---|---|
| Forgejo | 5 776 entrées, propriétaires identiques | quelques minutes | les valeurs par défaut du chart |
| Windshift | 23 897 lignes, 298 tables | quelques minutes | aucun outil SQLite → PostgreSQL |
| Registry | 6 tags, chaque manifeste et chaque couche | **aucune** | `cp -a` conserve les dates |
| Trilium | sha256 sur 46 fichiers | quelques minutes | `TRILIUM_PORT` injecté par Kubernetes |
::

La même méthode a ensuite servi pour SonarQube, DefectDojo, mailpit, et pour les six bases de données de l'épisode 10.

#### ✅ Conclusion

Aucun de ces quatre pièges n'est un bug. Ce sont des comportements **normaux**, documentés, de chaque outil : un chart qui a des valeurs par défaut, SQLite qui protège sa base, `cp -a` qui fait ce qu'on lui demande, Kubernetes qui injecte des variables depuis toujours. Ce qui les a rendus inoffensifs, c'est la méthode : une répétition qui a fait apparaître le piège **avant** la coupure, un contrôle chiffré qui interdit de basculer sur une copie incomplète, et un ancien service toujours là pour revenir en arrière.

Prochain épisode : Jenkins, le service le plus délicat, avec des agents qui deviennent des pods et des images construites sans Docker.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
