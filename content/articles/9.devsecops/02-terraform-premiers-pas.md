---
title: "Lab DevSecOps (2/11) : premiers pas avec Terraform, l'état et la dérive"
description: "Décrire des conteneurs Docker avec Terraform sur un serveur distant : plan, apply, détection de dérive, remplacement de ressource, import d'un conteneur créé à la main, et la démonstration que Docker contourne UFW."
icon: "i-mdi:terraform"
article_id: "02-devsecops-terraform-premiers-pas"
color: "orange"
draft: true
publishedAt: '2026-10-26'
---
#### 📌 Où on en est

Dans l'[épisode 1](/blog/article/01-devsecops-ansible-durcissement), Ansible a préparé **bhaal** : connexion SSH par clé uniquement, pare-feu UFW en liste blanche, fail2ban. Docker y est déjà installé.

Cet épisode est une prise en main de **Terraform** sur un cas simple : quelques ressources Docker. Le but n'est pas le conteneur lui-même, mais les notions qui reviendront à l'épisode 4 avec Kubernetes : le **plan**, l'**état** et la **dérive**.

#### 🧰 Terraform en deux minutes

Terraform décrit des **ressources** (une VM, un enregistrement DNS, un conteneur, un déploiement Kubernetes) dans des fichiers en langage HCL, puis les crée, les modifie ou les détruit pour que la réalité corresponde à la description.

* **Déclaratif** : on décrit le résultat (« un conteneur whoami sur le port 8081 »), pas les étapes.
* **Le plan avant l'action** : `terraform plan` liste exactement ce qui va être créé, modifié ou détruit. On relit, puis on applique.
* **L'état (state)** : Terraform garde la liste de ce qu'il gère dans un fichier `terraform.tfstate`. C'est en comparant cet état, la configuration et la réalité qu'il détecte les écarts.
* **Les providers** : un plugin par plateforme (AWS, Azure, OVH, Proxmox, Docker, Kubernetes…). Le même outil et le même workflow, du cloud au serveur du placard.

> 💡 **OpenTofu** est le fork libre de Terraform, créé après le changement de licence de 2023. Les commandes et la syntaxe sont les mêmes : tout cet article fonctionne en remplaçant `terraform` par `tofu`.

#### 📁 Les fichiers

```text [lab-iac/terraform]
terraform/
├── versions.tf               # version de Terraform et des providers
├── providers.tf              # connexion au Docker de bhaal
├── variables.tf              # les paramètres
├── terraform.tfvars          # leurs valeurs (non versionné)
├── main.tf                   # les ressources
└── outputs.tf                # ce qu'on affiche après l'apply
```

```hcl [versions.tf]
terraform {
  required_version = ">= 1.6"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}
```

```hcl [providers.tf]
provider "docker" {
  host     = "ssh://${var.ssh_user}@${var.lab_host}:22"
  ssh_opts = ["-o", "StrictHostKeyChecking=yes"]
}
```

```hcl [variables.tf]
variable "lab_host" {
  type        = string
  description = "Nom ou IP du serveur de lab"
}

variable "ssh_user" {
  type = string
}

variable "whoami_port" {
  type    = number
  default = 8081
}
```

```hcl [terraform.tfvars]
lab_host = "bhaal.homelab.example"
ssh_user = "admin"
```

```hcl [main.tf]
resource "docker_network" "lab" {
  name = "lab-tf"
}

resource "docker_image" "whoami" {
  name         = "traefik/whoami:v1.10.1"
  keep_locally = true
}

resource "docker_container" "whoami" {
  name      = "whoami-tf"
  image     = docker_image.whoami.image_id
  restart   = "unless-stopped"
  read_only = true

  capabilities {
    drop = ["ALL"]
  }

  networks_advanced {
    name = docker_network.lab.name
  }

  ports {
    internal = 80
    external = var.whoami_port
    ip       = "127.0.0.1"
  }
}
```

```hcl [outputs.tf]
output "container_id" {
  value = docker_container.whoami.id
}
```

##### Explications

::tool-table
| Élément | Rôle |
|---------|------|
| `version = "~> 3.0"` | Accepte les versions 3.x, refuse une 4.0 qui pourrait casser la configuration. La version exacte retenue (ici 3.9.0) est figée dans `.terraform.lock.hcl`, **à versionner** |
| `host = "ssh://..."` | Le provider pilote le Docker distant **par SSH** : pas besoin d'exposer l'API Docker sur le réseau |
| `StrictHostKeyChecking=yes` | Comme dans Ansible : on refuse un serveur dont la clé a changé |
| `docker_image.whoami.image_id` | Une **référence** entre ressources : Terraform en déduit l'ordre de création (l'image avant le conteneur) |
| `read_only` + `drop = ["ALL"]` | Système de fichiers en lecture seule et aucune capacité Linux : le conteneur ne peut presque rien faire s'il est compromis |
| `ip = "127.0.0.1"` | Le port n'est publié que sur la boucle locale du serveur. On verra plus bas pourquoi c'est important |
| `terraform.tfvars` | Les valeurs propres à un environnement. Ignoré par git (`*.tfvars`), avec un `terraform.tfvars.example` versionné à la place |
::

#### 🚀 init, plan, apply

```bash
cd lab-iac/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init        # télécharge le provider
terraform fmt -check  # formatage standard
terraform validate    # syntaxe et cohérence
terraform plan -out=tfplan
```

```text
  # docker_image.whoami will be created
  + resource "docker_image" "whoami" {
      + name         = "traefik/whoami:v1.10.1"
      ...
  # docker_network.lab will be created
  ...
      + ports {
          + external = 8081
          + internal = 80
          + ip       = "127.0.0.1"
          + protocol = "tcp"
        }

Plan: 3 to add, 0 to change, 0 to destroy.
```

```bash
terraform apply tfplan
```

```text
docker_image.whoami: Creating...
docker_network.lab: Creating...
docker_network.lab: Creation complete after 4s
docker_image.whoami: Creation complete after 6s
docker_container.whoami: Creating...
docker_container.whoami: Creation complete after 2s

Apply complete! Resources: 3 added, 0 changed, 0 destroyed.
```

> 💡 `plan -out=tfplan` puis `apply tfplan` garantit que **ce qui est appliqué est exactement ce qui a été relu**. Sans fichier de plan, `apply` recalcule tout, et la réalité a pu changer entre-temps. C'est la pratique à suivre en CI. Le fichier de plan peut contenir des valeurs sensibles : il est ignoré par git.

Vérification sur le serveur :

```bash
ssh bhaal 'docker ps; curl -s 127.0.0.1:8081'
```

```text
whoami-tf   6956a30c7d33   127.0.0.1:8081->80/tcp
Hostname: 126b5dd119a6
IP: 127.0.0.1
IP: 172.20.0.2
```

Relancé juste après, `terraform plan` ne propose rien :

```text
No changes. Your infrastructure matches the configuration.
```

#### 🔍 Exercice 1 : la dérive

Quelqu'un supprime le conteneur à la main, en dehors de Terraform :

```bash
ssh bhaal 'docker rm -f whoami-tf'
terraform plan
```

```text
Note: Objects have changed outside of Terraform

  # docker_container.whoami has been deleted
  ...
  # docker_container.whoami will be created
  ...
Plan: 1 to add, 0 to change, 0 to destroy.
```

Terraform compare son état à la réalité, constate l'écart (« has been deleted ») et propose de revenir à ce que décrit le code. Un `terraform apply` recrée le conteneur. C'est tout l'intérêt d'une infrastructure décrite dans du code : **le code fait référence**, et un `plan` lancé régulièrement (en CI, par exemple chaque nuit) révèle toute modification manuelle.

#### 🔁 Exercice 2 : le remplacement, et Docker qui contourne UFW

Deuxième modification, dans le code cette fois : publier le port sur toutes les interfaces.

```hcl [main.tf]
  ports {
    internal = 80
    external = var.whoami_port
    ip       = "0.0.0.0"
  }
```

```text
  # docker_container.whoami must be replaced
          ~ ip       = "127.0.0.1" -> "0.0.0.0" # forces replacement

Plan: 1 to add, 0 to change, 1 to destroy.
```

Un conteneur Docker ne peut pas changer ses ports à chaud. Terraform le sait (`forces replacement`) et annonce un **remplacement** : détruire puis recréer. C'est la ligne à guetter dans un plan, car sur une base de données, un remplacement signifie une perte de données si le volume n'est pas persistant.

Après l'apply, depuis le poste de travail :

```bash
curl http://bhaal.homelab.example:8081
```

```text
Hostname: 052217605ad7
IP: 127.0.0.1
```

**Le conteneur répond depuis le réseau**, alors qu'UFW n'autorise que les ports 22, 80 et 443, et que la politique par défaut est de tout refuser. Docker écrit ses propres règles `iptables` pour publier les ports, et ces règles passent **avant** celles d'UFW. Un port publié par Docker est donc ouvert, quoi que dise `ufw status`.

::tool-table
| Parade | Principe |
|--------|----------|
| Publier sur `127.0.0.1` | Le port n'existe que sur le serveur ; un reverse proxy (Traefik) fait l'intermédiaire |
| Ne rien publier du tout | Les conteneurs se parlent sur un réseau Docker interne ; seul le reverse proxy publie 80 et 443 |
| Chaîne `DOCKER-USER` | La seule chaîne iptables que Docker ne réécrit pas : on peut y filtrer le trafic vers les conteneurs |
::

Retour à `127.0.0.1`, nouvel apply, et le `curl` depuis le poste ne répond plus.

> ⚠️ Ce n'est pas un cas d'école. En vérifiant mon homelab pour préparer ce lab, j'ai trouvé un PostgreSQL publié sur `0.0.0.0:5432` sur un autre serveur. On le corrigera à l'épisode 4, puisque DefectDojo va justement s'en servir.

#### 📥 Exercice 3 : reprendre une ressource créée à la main

Dernier cas courant : un conteneur lancé avec `docker run`, jamais décrit nulle part, qu'on veut faire gérer par Terraform. Depuis Terraform 1.5, un bloc `import` le permet, et Terraform peut même **générer** la configuration :

```bash
ssh bhaal 'docker run -d --name manuel --restart unless-stopped traefik/whoami:v1.10.1'
```

```hcl [import.tf]
import {
  to = docker_container.manuel
  id = "7931398645a24264425b7da354e4178145ccc7cd4df80ca51428e69739cf9d83"
}
```

```bash
terraform plan -generate-config-out=generated.tf
```

```text
  # Warning: this will destroy the imported resource
Plan: 1 to import, 1 to add, 0 to change, 1 to destroy.
```

Surprise : Terraform veut importer le conteneur… puis le **détruire et le recréer**. La configuration générée n'est pas fidèle. En cherchant l'attribut responsable :

```text
  # docker_container.manuel must be replaced
      + env = (known after apply) # forces replacement
```

Le provider Docker ne relit pas les variables d'environnement à l'import. J'ai essayé de les déclarer avec leur vraie valeur (le `PATH` de l'image) : même résultat, Terraform croit toujours qu'elles changent. C'est une limite du provider, pas de la configuration. La parade est d'ignorer cet attribut :

```hcl [generated.tf (extrait)]
resource "docker_container" "manuel" {
  image   = "traefik/whoami:v1.10.1"
  name    = "manuel"
  restart = "unless-stopped"
  # ... une soixantaine de lignes générées

  lifecycle {
    ignore_changes = [env]
  }
}
```

```text
docker_container.manuel: Importing...
docker_container.manuel: Import complete
docker_container.manuel: Modifying...

Apply complete! Resources: 1 imported, 0 added, 1 changed, 0 destroyed.
```

L'identifiant du conteneur est le même avant et après : il a été **repris**, pas recréé. Le `1 changed` correspond à des attributs propres au provider, sans effet sur le conteneur.

> 💡 La configuration générée est un **point de départ**, pas un résultat. Elle contient chaque attribut, valeurs par défaut comprises : il faut la relire, la simplifier et vérifier que le plan ne détruit rien avant tout `apply`. Sur une vraie base de données, le `Warning: this will destroy the imported resource` aurait été une catastrophe.

#### 🐛 Ce qui n'a pas marché du premier coup

::tool-table
| Symptôme | Cause | Correction |
|----------|-------|------------|
| `terraform plan` échoue avec `ssh: connect to host … port 22: Connection refused` | Le provider Docker ouvre **une nouvelle connexion SSH par appel** à l'API Docker. La règle UFW `limit` de l'épisode 1 (6 connexions en 30 secondes) rejette le poste | Multiplexage SSH côté client : une seule connexion, réutilisée |
| L'import veut détruire le conteneur importé | Le provider ne relit pas `env` à l'import, et un changement d'`env` force le remplacement | `lifecycle { ignore_changes = [env] }` |
::

Le multiplexage se configure dans `~/.ssh/config`, à la suite de l'entrée créée à l'épisode 1 :

```ssh-config [~/.ssh/config]
Host bhaal bhaal.homelab.example
HostName bhaal.homelab.example
User admin
IdentityFile ~/.ssh/id_ed25519
IdentitiesOnly yes
# Une seule connexion SSH réutilisée (UFW limit : 6 connexions / 30 s)
ControlMaster auto
ControlPath ~/.ssh/cm-%r@%h:%p
ControlPersist 10m
```

La première connexion devient la connexion « maître », et les suivantes passent dedans pendant 10 minutes. Trois `plan` d'affilée passent ensuite sans blocage. C'est ce qu'Ansible fait déjà de lui-même, et c'est pour ça qu'il n'avait pas déclenché la protection.

> 💡 C'est le même piège qu'à l'épisode 1, vu de l'autre côté : une protection anti-force brute ne fait pas la différence entre un attaquant et un outil d'automatisation trop bavard. Assouplir la règle UFW aurait aussi « marché », mais c'est le client qu'il fallait corriger, pas la sécurité du serveur.

#### ✅ Conclusion

Sur un exemple minuscule, on a vu l'essentiel de Terraform :

* le **plan** relu avant chaque changement, et enregistré pour être appliqué tel quel ;
* l'**état**, qui permet de détecter une modification faite à la main ;
* la différence entre une **modification** et un **remplacement**, à repérer dans chaque plan ;
* l'**import**, utile pour reprendre une infrastructure existante, à condition de relire ce qui est généré.

Et au passage, une démonstration concrète que Docker contourne UFW.

Le prochain épisode installe **k3s** avec Ansible : un vrai cluster Kubernetes sur bhaal, qui lui aussi passe devant UFW.

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
