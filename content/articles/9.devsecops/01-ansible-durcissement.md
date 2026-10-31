---
title: "Lab DevSecOps (1/11) : préparer et durcir un serveur Debian avec Ansible"
description: "Premier épisode d'un lab d'infrastructure as code sur un serveur du homelab : inventaire, rôles, durcissement SSH, UFW et fail2ban avec Ansible, et tout ce qui n'a pas marché du premier coup."
icon: "i-mdi:ansible"
article_id: "01-devsecops-ansible-durcissement"
color: "orange"
draft: true
publishedAt: '2026-10-26'
---
#### 📌 Pourquoi ce lab

Sur mon homelab, tout est déployé avec Docker Compose, des scripts Bash et beaucoup de connexions SSH à la main. Ça marche, mais rien ne décrit l'état voulu des serveurs : si l'un d'eux tombe, il faut se souvenir de tout ce qui a été fait dessus.

Ce lab a deux objectifs :

* **apprendre en vrai** les outils standards de l'infrastructure as code : Ansible, Terraform et Kubernetes (avec k3s) ;
* aboutir à quelque chose d'**utile** : un [DefectDojo](https://github.com/DefectDojo/django-DefectDojo){:target="_blank"} qui centralise les vulnérabilités trouvées par Trivy dans mes pipelines Jenkins, dans la continuité de l'article sur la [sécurité CI/CD](/blog/article/16-docker-cicd-securite).

Chaque épisode décrit ce qui a réellement tourné, sorties comprises, y compris les erreurs.

#### 🧭 La série

::tool-table
| # | Épisode | Outil |
|---|---------|-------|
| 1 | Préparer et durcir le serveur | Ansible |
| [2](/blog/article/02-devsecops-terraform-premiers-pas) | Premiers pas, état et dérive | Terraform |
| [3](/blog/article/03-devsecops-k3s-ansible) | Un cluster Kubernetes léger, et le piège du pare-feu | k3s + Ansible |
| [4](/blog/article/04-devsecops-defectdojo-terraform-helm) | DefectDojo sur k3s avec une base PostgreSQL externe | Terraform + Helm |
| [5](/blog/article/05-devsecops-jenkins-trivy-defectdojo) | Envoyer les scans Trivy de Jenkins vers DefectDojo | Jenkins |
| [6](/blog/article/06-devsecops-k3s-homelab) | Passer le homelab sous k3s, mesurer avant de migrer | fio + etcd |
| [7](/blog/article/07-devsecops-k3s-socle) | Le socle du cluster, trois serveurs et une seule IP | k3s, MetalLB, Longhorn, cert-manager |
| [8](/blog/article/08-devsecops-migrer-sans-casser) | Migrer un service sans le casser, une méthode en 8 temps | Ansible + Kustomize |
| [9](/blog/article/09-devsecops-jenkins-kubernetes) | Jenkins dans Kubernetes, des agents en pods | Jenkins + BuildKit |
| [10](/blog/article/10-devsecops-cloudnativepg) | PostgreSQL dans le cluster | CloudNativePG |
| [11](/blog/article/11-devsecops-mcp-qui-tient-la-cle) | Serveurs MCP, qui tient la clé ? | MCP + OAuth |
::

Les épisodes 1 à 5 montent un lab sur un seul serveur. Les épisodes 6 à 11 appliquent la même démarche à **tout le homelab**, migré dans un cluster k3s à trois serveurs.

La cible est **bhaal**, un serveur libre du homelab : Debian 13, 8 CPU, 7,7 Go de RAM. Tout le code vit dans un dépôt Git privé, `lab-iac`. Les extraits de chaque épisode en reprennent les fichiers, avec leur chemin dans le dépôt.

#### 🧰 Ansible en deux minutes

Ansible configure des machines **qui existent déjà** : paquets, fichiers de configuration, services, utilisateurs.

* **Sans agent** : il passe par SSH. Sur le serveur, il suffit de Python.
* **Déclaratif et idempotent** : on décrit l'état voulu (« UFW activé ») plutôt que les commandes. Relancer le playbook ne change rien si l'état est déjà atteint.
* **Organisé en rôles** : chaque rôle est une brique réutilisable (`common`, `hardening`, `docker`…), appliquée aux machines d'un groupe de l'**inventaire**.

> 💡 **Ansible ou Terraform ?** Terraform décide de ce qui doit *exister* (une VM, un DNS, un déploiement Kubernetes). Ansible configure ce qui se passe *à l'intérieur* d'une machine. Dans le cloud, on les enchaîne : Terraform crée la VM, Ansible la configure.

#### 📁 Structure du dépôt

```text [lab-iac/ansible]
ansible/
├── ansible.cfg
├── requirements.yml          # collections community.general, community.docker
├── site.yml                  # le playbook principal
├── inventory/hosts.yml       # les machines
├── group_vars/lab/vars.yml   # les variables du groupe « lab »
└── roles/
    ├── common/               # paquets de base, fuseau, mises à jour auto
    ├── hardening/            # SSH, UFW, fail2ban
    ├── docker/               # épisode 2
    └── app/                  # épisode 2
```

Sur le poste de travail (Manjaro) :

```bash
sudo pacman -S ansible ansible-lint
cd lab-iac/ansible
ansible-galaxy collection install -r requirements.yml
```

#### ⚙️ Configuration et inventaire

```ini [ansible.cfg]
[defaults]
inventory = inventory/hosts.yml
roles_path = roles
host_key_checking = True
stdout_callback = default
callback_result_format = yaml
interpreter_python = auto_silent
```

```yaml [inventory/hosts.yml]
all:
  children:
    lab:
      hosts:
        bhaal:
          ansible_host: bhaal.homelab.example
          ansible_user: admin
```

```yaml [group_vars/lab/vars.yml]
admin_user: admin
ssh_port: 22
ufw_allowed_tcp: [80, 443]
```

##### Explications

::tool-table
| Élément | Rôle |
|---------|------|
| `host_key_checking = True` | Ansible refuse un serveur dont la clé SSH a changé. Le désactiver « pour que ça marche » ouvre la porte à une attaque de l'homme du milieu |
| `callback_result_format = yaml` | Affiche les résultats en YAML lisible plutôt qu'en JSON sur une ligne |
| `interpreter_python = auto_silent` | Détecte Python sur le serveur sans afficher d'avertissement à chaque commande |
| `group_vars/lab/` | Les variables s'appliquent automatiquement à toutes les machines du groupe `lab` |
::

Premier test, la connexion :

```bash
ansible lab -m ping
```

```text
bhaal | SUCCESS =>
    ansible_facts:
        discovered_interpreter_python: /usr/bin/python3.13
    changed: false
    ping: pong
```

#### 🛡️ Le playbook et les rôles

```yaml [site.yml]
- name: Préparer le serveur de lab
  hosts: lab
  become: true
  roles:
    - role: common
      tags: [common]
    - role: hardening
      tags: [hardening]
    - role: docker
      tags: [docker]
    - role: app
      tags: [app]
```

`become: true` passe les tâches en root avec `sudo`. Les **tags** permettent de n'appliquer qu'une partie des rôles : dans cet épisode, `--tags common,hardening`.

##### Le rôle `common`

```yaml [roles/common/tasks/main.yml]
- name: Paquets de base
  ansible.builtin.apt:
    name: [curl, ca-certificates, htop, unattended-upgrades]
    state: present
    update_cache: true
    cache_valid_time: 3600

- name: Fuseau horaire
  community.general.timezone:
    name: Europe/Paris

- name: Mises à jour de sécurité automatiques
  ansible.builtin.copy:
    dest: /etc/apt/apt.conf.d/20auto-upgrades
    content: |
      APT::Periodic::Update-Package-Lists "1";
      APT::Periodic::Unattended-Upgrade "1";
    mode: "0644"
```

`cache_valid_time: 3600` évite de relancer un `apt update` à chaque passage si le cache a moins d'une heure. `unattended-upgrades` installe automatiquement les **correctifs de sécurité** de Debian, et seulement eux : les autres mises à jour restent manuelles.

##### Le rôle `hardening`

```yaml [roles/hardening/tasks/main.yml]
- name: Durcissement SSH (fichier drop-in)
  ansible.builtin.copy:
    dest: /etc/ssh/sshd_config.d/10-hardening.conf
    content: |
      PasswordAuthentication no
      PermitRootLogin no
      KbdInteractiveAuthentication no
      MaxAuthTries 3
      AllowUsers {{ admin_user }}
    mode: "0644"
    validate: /usr/sbin/sshd -t -f %s
  notify: Redémarrer ssh

- name: Installer UFW et fail2ban
  ansible.builtin.apt:
    name: [ufw, fail2ban]
    state: present

- name: SSH limité (anti brute-force)
  community.general.ufw:
    rule: limit
    port: "{{ ssh_port }}"
    proto: tcp

- name: Ports web autorisés
  community.general.ufw:
    rule: allow
    port: "{{ item }}"
    proto: tcp
  loop: "{{ ufw_allowed_tcp }}"

- name: Activer UFW (refus par défaut en entrée)
  community.general.ufw:
    state: enabled
    policy: deny
    direction: incoming

- name: Fail2ban actif
  ansible.builtin.service:
    name: fail2ban
    state: started
    enabled: true
```

```yaml [roles/hardening/handlers/main.yml]
- name: Redémarrer ssh
  ansible.builtin.service:
    name: ssh
    state: restarted
```

##### Explications

::tool-table
| Élément | Rôle |
|---------|------|
| Fichier dans `sshd_config.d/` | On n'écrase pas le `sshd_config` de Debian : on ajoute un fichier à côté. Les mises à jour du paquet ne créent pas de conflit |
| `validate: sshd -t -f %s` | Ansible teste la configuration **avant** de remplacer le fichier. Une faute de frappe ne coupe pas l'accès SSH |
| `notify` + handler | SSH n'est redémarré qu'une fois, en fin de playbook, et seulement si le fichier a changé |
| `PasswordAuthentication no` | Connexion par clé uniquement : les attaques par dictionnaire n'ont plus rien à deviner |
| `AllowUsers` | Seul l'utilisateur d'administration peut se connecter, même si un autre compte existe |
| `rule: limit` (UFW) | Rejette une IP qui ouvre plus de 6 connexions en 30 secondes sur le port SSH |
| `policy: deny` en entrée | Tout ce qui n'est pas explicitement autorisé est bloqué |
| fail2ban | Lit les journaux de SSH et bannit pour 10 minutes une IP qui échoue trop souvent à se connecter |
::

> ⚠️ Le rôle `limit` est ajouté **avant** l'activation d'UFW. Dans l'ordre inverse, la politique « tout refuser » s'appliquerait avant que SSH soit autorisé, et Ansible perdrait sa propre connexion.

Ansible-lint valide le tout au niveau le plus exigeant :

```bash
ansible-lint
```

```text
Passed: 0 failure(s), 0 warning(s) in 14 files processed of 15 encountered.
Last profile that met the validation criteria was 'production'.
```

#### 🧪 Simuler avant d'appliquer

```bash
ansible-playbook site.yml -K --check --diff --tags common,hardening
```

`-K` demande le mot de passe `sudo`, `--check` simule sans rien modifier, et `--diff` montre le contenu des fichiers qui vont changer. C'est l'occasion de relire la configuration SSH avant qu'elle ne s'applique :

```diff
--- before
+++ after: /etc/ssh/sshd_config.d/10-hardening.conf
@@ -0,0 +1,5 @@
+PasswordAuthentication no
+PermitRootLogin no
+KbdInteractiveAuthentication no
+MaxAuthTries 3
+AllowUsers admin
```

La simulation s'arrête pourtant sur une erreur :

```text
TASK [hardening : SSH limité (anti brute-force)]
fatal: [bhaal]: FAILED! =>
    msg: 'Failed to find required executable "ufw" in paths: ...'
```

C'est une limite du mode `--check` : le paquet `ufw` n'est pas réellement installé pendant la simulation, donc la tâche suivante ne trouve pas la commande. Rien d'inquiétant : il faut simplement savoir que la simulation n'est fiable que jusqu'à la première tâche qui dépend d'une précédente.

#### 🚀 Appliquer

> ⚠️ Avant de toucher à SSH, **garder une session ouverte** sur le serveur dans un autre terminal. Si la nouvelle configuration bloque l'accès, c'est la seule porte de secours.

```bash
ansible-playbook site.yml -K --diff --tags common,hardening
```

```text
TASK [hardening : SSH limité (anti brute-force)] ****************
changed: [bhaal]

TASK [hardening : Ports web autorisés] **************************
changed: [bhaal] => (item=80)
changed: [bhaal] => (item=443)

TASK [hardening : Activer UFW (refus par défaut en entrée)] *****
changed: [bhaal]

TASK [hardening : Fail2ban actif] *******************************
ok: [bhaal]

RUNNING HANDLER [hardening : Redémarrer ssh] ********************
changed: [bhaal]

PLAY RECAP ******************************************************
bhaal : ok=11   changed=8    unreachable=0    failed=0    skipped=0
```

#### ✅ Vérifier depuis l'extérieur

Le playbook dit que tout est appliqué. Reste à le vérifier du point de vue d'un attaquant, depuis une autre machine :

```bash
# Connexion par mot de passe
ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password admin@bhaal.homelab.example
# Ports
timeout 4 bash -c "</dev/tcp/bhaal.homelab.example/80"
timeout 4 bash -c "</dev/tcp/bhaal.homelab.example/8080"
```

::tool-table
| Contrôle | Résultat |
|----------|----------|
| Connexion par mot de passe | Refusée : `Permission denied (publickey)` |
| Connexion en root | Refusée |
| Port 80 (autorisé, rien n'écoute) | **Connexion refusée** immédiatement |
| Port 8080 (non autorisé) | **Aucune réponse** : délai dépassé |
::

La différence entre les deux ports est la preuve que le pare-feu fonctionne. Sur le port 80, UFW laisse passer, et le système répond « rien n'écoute ici ». Sur le port 8080, UFW jette les paquets sans répondre : de l'extérieur, le port n'existe pas.

Côté serveur, l'état du pare-feu et de fail2ban :

```bash
ssh -t bhaal 'sudo ufw status verbose; sudo fail2ban-client status sshd'
```

```text
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), deny (routed)
New profiles: skip

To                         Action      From
--                         ------      ----
22/tcp                     LIMIT IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
22/tcp (v6)                LIMIT IN    Anywhere (v6)
80/tcp (v6)                ALLOW IN    Anywhere (v6)
443/tcp (v6)               ALLOW IN    Anywhere (v6)

Status for the jail: sshd
|- Filter
|  |- Currently failed:    1
|  |- Total failed:    2
|  `- Journal matches:    _SYSTEMD_UNIT=ssh.service + _COMM=sshd
`- Actions
   |- Currently banned:    0
   |- Total banned:    0
   `- Banned IP list:
```

Les règles s'appliquent aussi en **IPv6** : un oubli classique, quand le serveur a une adresse IPv6 publique et que seul l'IPv4 est filtré. Les deux échecs comptés par fail2ban sont mes propres tests de connexion par mot de passe et en root.

> 💡 Retenez la ligne `deny (routed)` : UFW bloque aussi le trafic **routé** à travers le serveur. C'est sans effet pour l'instant, mais on la retrouvera à l'épisode 3, quand k3s devra faire circuler le trafic entre ses Pods.

#### 🔁 Idempotence : relancer le playbook

```bash
ansible-playbook site.yml -K --tags common,hardening
```

```text
TASK [hardening : Durcissement SSH (fichier drop-in)] ***********
ok: [bhaal]
...
TASK [hardening : Activer UFW (refus par défaut en entrée)] *****
ok: [bhaal]

PLAY RECAP ******************************************************
bhaal : ok=10   changed=0    unreachable=0    failed=0    skipped=0
```

Tout est `ok`, rien n'est `changed`, et le handler de redémarrage SSH ne s'est pas déclenché puisque le fichier n'a pas bougé. Un deuxième passage ne doit **rien changer**. C'est ce qui distingue une configuration déclarative d'un script : on peut relancer le playbook à tout moment, pour corriger une dérive ou pour vérifier que le serveur est conforme.

#### 🐛 Ce qui n'a pas marché du premier coup

::tool-table
| Symptôme | Cause | Correction |
|----------|-------|------------|
| Le playbook refuse de démarrer | Le callback `yaml` a été retiré de `community.general` (Ansible 14) | `stdout_callback = default` et `callback_result_format = yaml` |
| `ansible lab -m ping` échoue avec `sudo: il est nécessaire de saisir un mot de passe` | `become = True` dans `ansible.cfg` passe **toutes** les commandes par `sudo`, même un `ping` | `become: true` uniquement dans le playbook |
| `--check` échoue sur `Failed to find required executable "ufw"` | En simulation, le paquet n'est pas installé pour de vrai | Normal : la simulation s'arrête aux tâches dépendantes |
| Avertissement : `apt_repository has been deprecated` | Le module sera retiré d'ansible-core 2.25 | `deb822_repository`, et suppression de l'ancien `docker.list` pour ne pas déclarer le dépôt deux fois |
| Connexion root coupée avec `Too many authentication failures` | L'agent SSH contient 4 clés et les présente une par une, or `MaxAuthTries 3` | `IdentitiesOnly yes` et la bonne `IdentityFile` dans `~/.ssh/config` |
| `Connection refused` sur le port 22, puis tout revient seul | Trop de connexions SSH en quelques secondes pendant mes tests : la règle UFW `limit` a rejeté mon IP | Attendre 30 secondes (fail2ban, lui, aurait banni 10 minutes) |
| `systemctl is-active ufw` répond `inactive`… et pourtant le pare-feu bloque | Le module a chargé les règles avec `ufw enable` ; le service systemd, bien `enabled`, ne s'exécute qu'au démarrage | Rien à corriger : se fier à `ufw status`, pas à systemd |
::

```ssh-config [~/.ssh/config]
Host bhaal bhaal.homelab.example
HostName bhaal.homelab.example
User admin
IdentityFile ~/.ssh/id_ed25519
IdentitiesOnly yes
```

> 💡 Les deux derniers pièges ont un point commun : en durcissant le serveur, on peut **se bloquer soi-même**. `MaxAuthTries 3` et `rule: limit` protègent contre les attaques, mais un poste avec plusieurs clés ou un script qui enchaîne les connexions déclenche les mêmes protections. Ansible s'en sort parce qu'il réutilise sa connexion SSH (`ControlPersist`) au lieu d'en ouvrir une par tâche.

#### ✅ Conclusion

En une trentaine de lignes de YAML, le serveur est passé d'une installation par défaut (mot de passe accepté, aucun pare-feu) à une base saine : clé SSH obligatoire, pare-feu en liste blanche, bannissement des IP trop insistantes et correctifs de sécurité automatiques. Et surtout, c'est **écrit** : rejouable sur un autre serveur, relisible en revue de code, vérifiable en CI avec ansible-lint.

Le prochain épisode passe à **Terraform** : décrire des ressources, lire un `plan`, et voir ce qui se passe quand quelqu'un modifie l'infrastructure à la main.

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
