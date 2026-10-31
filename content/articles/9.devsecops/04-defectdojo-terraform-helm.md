---
title: "Lab DevSecOps (4/11) : DefectDojo sur k3s avec Terraform, Helm et une base PostgreSQL externe"
description: "Déployer DefectDojo sur k3s : base créée par Ansible sur un PostgreSQL partagé, Secrets Kubernetes qui ne passent jamais par Terraform, chart Helm piloté par Terraform, et cinq pannes diagnostiquées une à une."
icon: "i-mdi:shield-bug-outline"
article_id: "04-devsecops-defectdojo-terraform-helm"
color: "orange"
draft: true
publishedAt: '2026-10-26'
---
#### 📌 Où on en est

Après les épisodes [1](/blog/article/01-devsecops-ansible-durcissement), [2](/blog/article/02-devsecops-terraform-premiers-pas) et [3](/blog/article/03-devsecops-k3s-ansible), **bhaal** est durci et fait tourner un cluster k3s.

Cet épisode y installe [DefectDojo](https://github.com/DefectDojo/django-DefectDojo){:target="_blank"}, un outil open source de gestion des vulnérabilités. Il importe les rapports de dizaines de scanners (Trivy, Gitleaks, Semgrep…), dédoublonne les résultats d'un scan à l'autre, et permet de **trier** chaque problème : à corriger, faux positif, risque accepté. C'est l'équivalent, pour les failles de sécurité, de ce que SonarQube fait pour la qualité du code.

C'est aussi l'épisode où presque rien n'a marché du premier coup. Il raconte donc autant le diagnostic que le déploiement.

#### 🧭 Qui fait quoi

DefectDojo a besoin d'une base PostgreSQL, d'un Valkey (le fork libre de Redis) pour sa file de tâches, et de plusieurs secrets. Trois outils se partagent le travail :

::tool-table
| Outil | Cible | Responsabilité |
|-------|-------|----------------|
| Ansible | cyric (PostgreSQL existant) | Créer le rôle et la base `defectdojo` |
| Ansible | bhaal (k3s) | Créer le namespace et les **Secrets** Kubernetes |
| Terraform + Helm | bhaal (k3s) | Installer DefectDojo avec son chart officiel |
::

<mermaid>
graph LR
  Vault["🔐 Ansible Vault"] --> A["⚙️ Ansible"]
  A -->|"docker exec psql"| PG["🐘 PostgreSQL<br/>cyric"]
  A -->|"kubectl apply"| S["🔑 Secrets k8s<br/>bhaal"]
  TF["🏗️ Terraform"] -->|"helm_release"| DD["🛡️ DefectDojo<br/>k3s"]
  S -. "référencés par nom" .-> DD
  DD -->|"5432"| PG
</mermaid>

La règle qui structure tout : **aucun mot de passe ne passe par Terraform**. Terraform enregistre dans son fichier d'état toutes les valeurs qu'il manipule, en clair. Les secrets restent donc dans Ansible Vault et dans Kubernetes, et Terraform se contente de citer les Secrets par leur nom.

#### 🔐 Les secrets dans Ansible Vault

Six valeurs aléatoires, générées et chiffrées sur le poste, sans jamais les afficher :

```bash
cd lab-iac/ansible
( umask 077; for k in db_password admin_password secret_key aes_key metrics_password valkey_password; do
    printf 'vault_defectdojo_%s: "%s"\n' "$k" "$(openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c 48)"
  done > group_vars/all/vault.yml )
ansible-vault encrypt group_vars/all/vault.yml
head -1 group_vars/all/vault.yml
```

```text
$ANSIBLE_VAULT;1.1;AES256
```

Le fichier chiffré est versionné avec le reste du dépôt. `umask 077` garantit que le fichier en clair n'est lisible que par son propriétaire pendant les quelques secondes qui précèdent le chiffrement. Les mots de passe sont alphanumériques : ils passeront sans échappement dans du SQL et du YAML.

Les variables non secrètes, partagées par les deux serveurs :

```yaml [group_vars/all/defectdojo.yml]
defectdojo_namespace: defectdojo
defectdojo_db_name: defectdojo
defectdojo_db_user: defectdojo
# Conteneur PostgreSQL existant sur cyric
postgres_container: homelab-postgresql-1
```

Et cyric rejoint l'inventaire, dans un groupe `db` :

```yaml [inventory/hosts.yml (extrait)]
    db:
      hosts:
        cyric:
          ansible_host: cyric.homelab.example
          ansible_user: admin
```

#### 🐘 La base sur le PostgreSQL partagé

cyric fait déjà tourner un PostgreSQL 18 en conteneur, utilisé par Forgejo, SonarQube et OpenProject. Plutôt que d'en lancer un de plus dans le cluster, DefectDojo y aura sa propre base et son propre rôle.

```yaml [roles/postgres_db/tasks/main.yml]
# psql est lancé dans le conteneur PostgreSQL existant : les connexions locales
# y sont autorisées sans mot de passe (pg_hba : local all all trust).
# Le SQL passe par stdin pour ne jamais apparaître dans la liste des processus.

- name: Mot de passe de la base au bon format (alphanumérique, 32 caractères minimum)
  ansible.builtin.assert:
    that: vault_defectdojo_db_password is match('^[A-Za-z0-9]{32,}$')
    quiet: true
  no_log: true

- name: Le rôle PostgreSQL existe-t-il ?
  ansible.builtin.command:
    argv: [docker, exec, -i, "{{ postgres_container }}", sh, -c, 'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -tA']
    stdin: "SELECT 1 FROM pg_roles WHERE rolname = '{{ defectdojo_db_user }}';"
  register: postgres_db_role
  changed_when: false

- name: Créer le rôle PostgreSQL
  ansible.builtin.command:
    argv: [docker, exec, -i, "{{ postgres_container }}", sh, -c, 'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -tA']
    stdin: "CREATE ROLE {{ defectdojo_db_user }} LOGIN PASSWORD '{{ vault_defectdojo_db_password }}';"
  when: postgres_db_role.stdout != "1"
  changed_when: true
  no_log: true

- name: La base existe-t-elle ?
  ansible.builtin.command:
    argv: [docker, exec, -i, "{{ postgres_container }}", sh, -c, 'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -tA']
    stdin: "SELECT 1 FROM pg_database WHERE datname = '{{ defectdojo_db_name }}';"
  register: postgres_db_database
  changed_when: false

- name: Créer la base
  ansible.builtin.command:
    argv: [docker, exec, -i, "{{ postgres_container }}", sh, -c, 'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -tA']
    stdin: "CREATE DATABASE {{ defectdojo_db_name }} OWNER {{ defectdojo_db_user }};"
  when: postgres_db_database.stdout != "1"
  changed_when: true
```

##### Explications

::tool-table
| Élément | Rôle |
|---------|------|
| `docker exec … psql` | Pas besoin de mot de passe administrateur ni de bibliothèque Python sur cyric : on utilise la connexion locale du conteneur |
| `stdin` | Le SQL, et donc le mot de passe, n'apparaît pas dans `ps` sur le serveur, contrairement à un argument `-c "..."` |
| Vérifier, puis créer | Les modules `community.postgresql` font ça d'eux-mêmes, mais ils exigent `psycopg` sur la cible. Deux requêtes `SELECT` donnent la même idempotence |
| `no_log` sur la création | Sans lui, Ansible afficherait la requête, mot de passe compris, en cas d'erreur |
| `assert` | Refuse un mot de passe qui casserait la requête SQL, avant de l'exécuter |
::

#### 🔑 Les Secrets Kubernetes

Le chart Helm de DefectDojo attend trois Secrets aux noms précis. Par défaut (`createSecret: false`), il ne les crée pas lui-même :

```yaml [roles/defectdojo_secrets/templates/secrets.yaml.j2]
# Noms et clés attendus par le chart Helm DefectDojo (createSecret: false)
apiVersion: v1
kind: Secret
metadata:
  name: defectdojo
  namespace: {{ defectdojo_namespace }}
type: Opaque
stringData:
  DD_ADMIN_PASSWORD: "{{ vault_defectdojo_admin_password }}"
  DD_SECRET_KEY: "{{ vault_defectdojo_secret_key }}"
  DD_CREDENTIAL_AES_256_KEY: "{{ vault_defectdojo_aes_key }}"
  METRICS_HTTP_AUTH_PASSWORD: "{{ vault_defectdojo_metrics_password }}"
---
apiVersion: v1
kind: Secret
metadata:
  name: defectdojo-postgresql-specific
  namespace: {{ defectdojo_namespace }}
type: Opaque
stringData:
  postgresql-password: "{{ vault_defectdojo_db_password }}"
---
apiVersion: v1
kind: Secret
metadata:
  name: defectdojo-valkey-specific
  namespace: {{ defectdojo_namespace }}
type: Opaque
stringData:
  valkey-password: "{{ vault_defectdojo_valkey_password }}"
```

```yaml [roles/defectdojo_secrets/tasks/main.yml]
# kubectl apply --server-side : pas d'annotation « last-applied-configuration »,
# qui recopierait les secrets en clair dans les métadonnées de l'objet.
# kubectl diff d'abord, pour ne signaler « changed » que s'il y a vraiment un écart.

# Le namespace doit exister avant le diff des Secrets : le serveur refuse de
# simuler un objet dans un namespace absent.
- name: Namespace DefectDojo
  ansible.builtin.command:
    argv: [/usr/local/bin/k3s, kubectl, create, namespace, "{{ defectdojo_namespace }}"]
  register: defectdojo_secrets_namespace
  changed_when: defectdojo_secrets_namespace.rc == 0
  failed_when: >-
    defectdojo_secrets_namespace.rc != 0
    and 'AlreadyExists' not in defectdojo_secrets_namespace.stderr

- name: Écart entre les Secrets voulus et le cluster
  ansible.builtin.command:
    argv: [/usr/local/bin/k3s, kubectl, diff, --server-side, --field-manager=ansible, -f, "-"]
    stdin: "{{ lookup('ansible.builtin.template', 'secrets.yaml.j2') }}"
  register: defectdojo_secrets_diff
  changed_when: false
  failed_when: defectdojo_secrets_diff.rc > 1
  no_log: true

- name: Appliquer les Secrets
  ansible.builtin.command:
    argv: [/usr/local/bin/k3s, kubectl, apply, --server-side, --field-manager=ansible, -f, "-"]
    stdin: "{{ lookup('ansible.builtin.template', 'secrets.yaml.j2') }}"
  when: defectdojo_secrets_diff.rc == 1
  changed_when: true
  no_log: true
```

##### Explications

::tool-table
| Élément | Rôle |
|---------|------|
| `stringData` | Les valeurs sont écrites en clair dans le manifeste ; Kubernetes les encode lui-même |
| `apply --server-side` | Un `kubectl apply` classique recopie tout l'objet appliqué dans l'annotation `last-applied-configuration`, **mots de passe compris, en clair**, lisible par quiconque peut lire les métadonnées. Le mode serveur ne crée pas cette annotation |
| `kubectl diff` | Code de sortie `0` : rien à changer, `1` : un écart, au-delà : une erreur. Ansible n'applique que s'il y a un écart, d'où un `changed` honnête |
| Pourquoi pas le module `kubernetes.core.k8s` ? | Il exige la bibliothèque Python `kubernetes` sur le serveur. `kubectl`, lui, est fourni par k3s |
::

La vérification, après coup :

```bash
kubectl -n defectdojo get secrets -o jsonpath='{range .items[*]}{.metadata.name}{" : "}{.metadata.annotations}{"\n"}{end}'
```

```text
defectdojo :
defectdojo-postgresql-specific :
defectdojo-valkey-specific :
```

Aucune annotation, donc aucune copie des mots de passe dans les métadonnées.

#### 🏗️ DefectDojo avec Terraform et Helm

**Helm** est le gestionnaire de paquets de Kubernetes : un *chart* regroupe tous les manifestes d'une application (Deployments, Services, Ingress, Jobs…), paramétrés par des *values*. Plutôt que de lancer `helm install` à la main, Terraform pilote Helm : la version du chart et les valeurs sont dans le dépôt, et `terraform plan` montre ce qui va changer.

Un dossier Terraform séparé de celui de l'épisode 2, avec son propre état :

```hcl [terraform-k8s/versions.tf]
terraform {
  required_version = ">= 1.6"
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 3.3"
    }
  }
}
```

```hcl [terraform-k8s/providers.tf]
provider "helm" {
  kubernetes = {
    config_path = pathexpand(var.kubeconfig)
  }
}
```

```hcl [terraform-k8s/variables.tf]
variable "kubeconfig" {
  type        = string
  description = "Kubeconfig du cluster k3s, récupéré par le rôle Ansible k3s"
  default     = "~/.kube/bhaal.yaml"
}

variable "defectdojo_chart_version" {
  type    = string
  default = "1.9.60"
}

variable "defectdojo_host" {
  type    = string
  default = "defectdojo.homelab.example"
}

variable "postgres_server" {
  type        = string
  description = "Serveur PostgreSQL existant (la base est créée par le rôle Ansible postgres_db)"
  default     = "cyric.homelab.example"
}
```

```hcl [terraform-k8s/main.tf]
# Le namespace et les Secrets sont créés par Ansible (rôle defectdojo_secrets) :
# les mots de passe ne passent jamais par Terraform, donc jamais par son état.
resource "helm_release" "defectdojo" {
  name             = "defectdojo"
  repository       = "https://raw.githubusercontent.com/DefectDojo/django-DefectDojo/helm-charts"
  chart            = "defectdojo"
  version          = var.defectdojo_chart_version
  namespace        = "defectdojo"
  create_namespace = false
  wait             = true
  timeout          = 900

  values = [yamlencode({
    host    = var.defectdojo_host
    siteUrl = "http://${var.defectdojo_host}"

    # Base externe : pas de PostgreSQL dans le cluster
    postgresql = {
      enabled = false
      auth = {
        username       = "defectdojo"
        database       = "defectdojo"
        existingSecret = "defectdojo-postgresql-specific"
      }
    }
    postgresServer = var.postgres_server

    django = {
      ingress = {
        enabled = true
        # Lab sur le réseau local, en HTTP : pas de certificat pour l'instant
        activateTLS = false
      }
      uwsgi = {
        # 2 processus suffisent pour un lab, et tiennent dans la limite de 512 Mo
        appSettings = {
          processes = 2
        }
        # Le premier appel à /login prend ~12 s dans chaque processus (chargement
        # du code Django). Avec le délai par défaut de 5 s, la sonde tue le
        # conteneur avant qu'il soit chaud, et il redémarre à froid en boucle.
        livenessProbe = {
          initialDelaySeconds = 60
          timeoutSeconds      = 30
        }
        readinessProbe = {
          timeoutSeconds = 30
        }
      }
    }
  })]
}
```

La section `uwsgi` n'était pas là au départ : elle est le résultat de la panne n° 4, plus bas.

##### Explications

::tool-table
| Élément | Rôle |
|---------|------|
| `version = var.defectdojo_chart_version` | Chart figé en `1.9.60`, donc images figées en `3.4.202`. Une mise à jour est un changement explicite, relu dans un `plan` |
| `create_namespace = false` | Le namespace appartient à Ansible, qui l'a créé avec les Secrets |
| `postgresql.enabled = false` | Le chart n'installe pas son propre PostgreSQL |
| `existingSecret` | Le chart lit le mot de passe dans le Secret créé par Ansible, **par son nom** |
| `wait` + `timeout` | Terraform attend que tous les Pods soient prêts (jusqu'à 15 minutes) avant de déclarer le succès |
| `yamlencode` | Les values sont écrites en HCL, vérifiées par `terraform validate`, puis converties en YAML pour Helm |
::

Avant le vrai déploiement, un rendu local du chart avec les mêmes valeurs permet de vérifier le résultat sans toucher au cluster :

```bash
helm template defectdojo defectdojo/defectdojo -n defectdojo -f values.yaml | grep -E "DD_DATABASE_HOST|host:|image:"
```

```text
  DD_DATABASE_HOST: "cyric.homelab.example"
  - host: defectdojo.homelab.example
        image: "defectdojo/defectdojo-django:3.4.202"
        image: 'defectdojo/defectdojo-nginx:3.4.202'
```

Enfin, une entrée DNS locale dans le Pi-hole : `defectdojo.homelab.example` → bhaal.

#### 🔥 Cinq pannes, une à une

##### 1. Le diff refusé dans un namespace absent

Première version du rôle : le namespace et les Secrets dans le même manifeste. Le `kubectl diff` échoue, mais `no_log` masque l'erreur, comme prévu. Pour diagnostiquer sans exposer les secrets, je rejoue la commande avec un manifeste de **même structure** et une valeur factice :

```text
Error from server (NotFound): namespaces "defectdojo" not found
rc=2
```

`kubectl diff --server-side` demande au serveur de **simuler** l'application. Or le serveur refuse de simuler un Secret dans un namespace qui n'existe pas encore, même si ce namespace est créé par le même manifeste. Correction : une tâche séparée crée le namespace avant le diff.

##### 2. Le DNS du cluster, une fois sur six

Premier `terraform apply`. Le Job d'initialisation de DefectDojo, qui crée les tables, échoue :

```text
django.db.utils.OperationalError: failed to resolve host 'cyric.homelab.example': [Errno -2] Name or service not known
```

Pourtant, bhaal résout ce nom sans problème. Depuis un Pod de test, six essais :

```text
** server can't find cyric.homelab.example: NXDOMAIN
** server can't find cyric.homelab.example: NXDOMAIN
** server can't find cyric.homelab.example: NXDOMAIN
** server can't find cyric.homelab.example: NXDOMAIN
** server can't find cyric.homelab.example: NXDOMAIN
Address: 192.168.1.10
```

Le `/etc/resolv.conf` de bhaal liste plusieurs serveurs DNS : le Pi-hole (`192.168.1.2`), qui connaît les noms du homelab, et la box (`192.168.1.1`), qui ne les connaît pas. Le système de bhaal les interroge **dans l'ordre** et tombe toujours sur le Pi-hole en premier. **CoreDNS**, le DNS interne de Kubernetes, transmet les requêtes à ces mêmes serveurs, mais **en choisissant au hasard**.

k3s prévoit une ConfigMap `coredns-custom` pour ajouter des règles à CoreDNS. On y envoie la zone locale au seul Pi-hole, et le reste continue de passer par les serveurs habituels :

```yaml [roles/k3s/templates/coredns-custom.yaml.j2]
# Lu par le CoreDNS de k3s (fichiers *.server de /etc/coredns/custom)
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  local-zone.server: |
    {{ k3s_local_dns_zone }}:53 {
        errors
        cache 30
        forward . {{ k3s_local_dns_server }}
    }
```

```yaml [roles/k3s/defaults/main.yml (ajout)]
# Zone locale résolue par le Pi-hole : CoreDNS choisit sinon au hasard parmi les
# serveurs de /etc/resolv.conf, dont la box qui ne connaît pas ces noms
k3s_local_dns_zone: homelab.example
k3s_local_dns_server: 192.168.1.2
```

Elle est appliquée par le rôle `k3s`, avec le même couple `diff` / `apply --server-side` que les Secrets. Après un redémarrage de CoreDNS : six résolutions sur six donnent `192.168.1.10`.

> 💡 Ce genre de panne est le pire à diagnostiquer : **intermittente**, et invisible depuis le serveur lui-même. La méthode qui a marché : répéter le même test plusieurs fois depuis un Pod, puis interroger chaque serveur DNS directement avec `dig @serveur` pour trouver celui qui répond mal.

##### 3. Le Job d'initialisation n'a droit qu'à un essai de plus

Le DNS est corrigé, mais le Job d'initialisation reste en échec :

```bash
kubectl -n defectdojo get job -o jsonpath='{.items[0].spec.backoffLimit}'
```

```text
1
```

Un seul nouvel essai autorisé, et il avait échoué lui aussi, avant la correction du DNS. Le Job ne réessaiera plus. J'ai recréé le Job à l'identique, à partir de sa propre définition, en retirant les champs générés par Kubernetes (`uid`, `selector`, étiquettes `controller-uid`), puis `kubectl replace --force`. Cette fois, les migrations sont passées.

> 💡 Un Job Kubernetes ne réessaie pas indéfiniment, et c'est voulu : une migration de base de données qui échoue en boucle peut faire des dégâts. La valeur de `backoffLimit` est un choix du chart, à connaître avant d'en avoir besoin.

##### 4. La sonde trop pressée

Les migrations sont faites, Celery et Valkey tournent, mais le Pod Django passe en `CrashLoopBackOff` :

```text
Warning  Unhealthy  spec.containers{uwsgi}: Liveness probe failed: Get "http://10.42.0.18:8081/login?force_login_form&next=/": context deadline exceeded (Client.Timeout exceeded while awaiting headers)
Normal   Killing    spec.containers{uwsgi}: Container uwsgi failed liveness probe, will be restarted
```

La **sonde de vie** (*liveness probe*) appelle `/login` toutes les 10 secondes, avec un délai de 5 secondes. Après 6 échecs, Kubernetes considère le conteneur comme bloqué et le redémarre. La base, le DNS et le réseau répondent en quelques centièmes de seconde. Le temps est donc perdu ailleurs. Mesure dans un worker Celery, qui utilise la même image et la même configuration :

```text
connexion DB 0.06s
System_Settings 0.01s
GET /login (1er) 200 12.02s
GET /login (2e) 200 0.05s
```

Le **premier** appel prend 12 secondes, le temps que Django charge son code, puis tout répond en 50 millisecondes. Mais uwsgi lance plusieurs processus, et chacun doit faire son premier appel à froid. La sonde, avec ses 5 secondes, tue le conteneur avant qu'il soit chaud. Il redémarre à froid, et la boucle recommence.

Correction dans les values (section `uwsgi` du `main.tf` ci-dessus) : la sonde commence après 60 secondes et accorde 30 secondes par appel. Et 2 processus au lieu de 4 : moins de démarrages à froid, et ça tient plus confortablement dans la limite de 512 Mo du conteneur.

> 💡 Une sonde de vie trop stricte est **pire qu'aucune sonde** : au lieu de redémarrer un conteneur bloqué, elle empêche un conteneur sain de finir de démarrer. Elle doit tolérer le pire cas normal, ici un démarrage à froid.

##### 5. La release que Terraform avait oubliée

Le premier `terraform apply` s'est arrêté au bout de 15 minutes :

```text
Error: context deadline exceeded

  with helm_release.defectdojo,
  on main.tf line 3, in resource "helm_release" "defectdojo":
```

Côté Helm, la release existe, en échec. Côté Terraform, l'état est **vide** : le provider n'a rien enregistré, puisque la création a échoué.

```bash
helm -n defectdojo status defectdojo
terraform state list
```

```text
NAME: defectdojo
STATUS: failed
REVISION: 1
```

Un nouvel `apply` aurait tenté de créer une release du même nom, et Helm l'aurait refusé. C'est le cas d'usage de l'import vu à l'[épisode 2](/blog/article/02-devsecops-terraform-premiers-pas) :

```bash
terraform import helm_release.defectdojo defectdojo/defectdojo
terraform plan -out=tfplan
```

```text
Import successful!

  # helm_release.defectdojo will be updated in-place
      ~ status = "failed" -> "deployed"
                      "processes": 2
                      "initialDelaySeconds": 60
                      "timeoutSeconds": 30
Plan: 0 to add, 1 to change, 0 to destroy.
```

L'`apply` qui suit fait un `helm upgrade` avec les nouvelles sondes, sans rien détruire.

#### ✅ Le résultat

```bash
kubectl -n defectdojo get pods
```

```text
NAME                                        READY   STATUS    RESTARTS   AGE
defectdojo-celery-beat-6b6d5cd945-xrhbt     1/1     Running   0          30m
defectdojo-celery-worker-6cf9c7bbd9-6xcmf   1/1     Running   0          30m
defectdojo-django-77d9bcd87-zln5x           2/2     Running   0          3m46s
defectdojo-valkey-0                         1/1     Running   0          30m
```

```bash
curl -s -o /dev/null -w "HTTP %{http_code} %{time_total}s\n" "http://defectdojo.homelab.example/login?next=/"
```

```text
HTTP 200 0.111019s
HTTP 200 0.105218s
HTTP 200 0.107679s
```

<!-- TODO capture : page de connexion ou tableau de bord DefectDojo → /img/content/defectdojo-login.png -->

Et les deux outils confirment qu'ils décrivent exactement ce qui tourne :

```text
# terraform plan
No changes. Your infrastructure matches the configuration.

# ansible-playbook site.yml -K -J --tags k3s,defectdojo
bhaal : ok=14   changed=0    unreachable=0    failed=0    skipped=4
cyric : ok=4    changed=0    unreachable=0    failed=0    skipped=2
```

C'est important après un dépannage : la ConfigMap DNS et le Job ont été appliqués à la main pendant l'enquête. Le `changed=0` prouve que le code ne diffère pas de ces corrections manuelles.

#### ⚠️ Ce qui reste à faire

* **HTTPS** : DefectDojo est en HTTP sur le réseau local. Pour une vraie exposition, il faudrait cert-manager et un certificat.
* **Le port 5432 de cyric** est publié sur `0.0.0.0` par Docker, donc ouvert à tout le réseau malgré son pare-feu (voir l'[épisode 2](/blog/article/02-devsecops-terraform-premiers-pas)). Le restreindre aux seuls clients connus (dont bhaal désormais) demande d'abord d'inventorier qui s'y connecte.
* **Les sauvegardes** : vérifier que la sauvegarde du PostgreSQL partagé inclut bien la nouvelle base `defectdojo`, et prévoir celle des fichiers importés, qui sont dans le cluster.

#### ✅ Conclusion

Le partage des responsabilités tient : Ansible pour ce qui touche aux serveurs et aux secrets, Terraform et Helm pour l'application. Aucun mot de passe dans l'état Terraform, aucun dans les annotations Kubernetes, aucun dans la sortie d'Ansible.

Mais surtout, cet épisode montre ce qu'un tutoriel « qui marche du premier coup » cache : un DNS qui répond une fois sur six, un Job qui abandonne, une sonde qui tue l'application qu'elle surveille. Chaque panne s'est diagnostiquée de la même façon : **mesurer plutôt que deviner**, depuis l'intérieur du cluster.

Dernier épisode : brancher le pipeline Jenkins de ce site sur DefectDojo, pour que chaque scan Trivy y arrive automatiquement.

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
