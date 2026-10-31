---
title: "Lab DevSecOps (3/11) : un cluster Kubernetes avec k3s, installé par Ansible"
description: "Installer k3s avec un rôle Ansible sur un serveur durci : version figée, pare-feu, kubeconfig récupéré sans fuite de secret, premiers objets Kubernetes, auto-réparation, et un manifeste vérifié par Trivy."
icon: "i-mdi:kubernetes"
article_id: "03-devsecops-k3s-ansible"
color: "orange"
draft: true
publishedAt: '2026-10-26'
---
#### 📌 Où on en est

* [Épisode 1](/blog/article/01-devsecops-ansible-durcissement) : Ansible a durci **bhaal** (SSH par clé, UFW, fail2ban).
* [Épisode 2](/blog/article/02-devsecops-terraform-premiers-pas) : Terraform y gère un conteneur Docker, avec plan, état et dérive.

Cet épisode installe un vrai cluster **Kubernetes**, avec k3s, toujours par Ansible. C'est sur ce cluster que tournera DefectDojo à l'épisode 4.

#### 🧰 Kubernetes et k3s en deux minutes

Docker Compose lance des conteneurs sur **une** machine, et s'arrête là. Kubernetes **maintient un état voulu** sur un cluster : « deux copies de whoami, joignables sous ce nom ». Si un conteneur meurt, il en relance un. Si un nœud tombe, il déplace la charge.

::tool-table
| Objet | Rôle | Équivalent Docker / Traefik |
|-------|------|-----------------------------|
| **Pod** | Un ou plusieurs conteneurs lancés ensemble | Un conteneur |
| **Deployment** | Maintient N Pods identiques, gère les mises à jour progressives | `deploy.replicas` + `restart: always` |
| **Service** | Une adresse et un nom DNS stables devant des Pods qui, eux, changent | Le nom d'un service sur un réseau Compose |
| **Ingress** | Route le trafic HTTP entrant vers un Service selon le nom de domaine | Les labels Traefik `Host(...)` |
| **Namespace** | Un espace isolé dans le cluster (droits, quotas, noms) | Un projet Compose |
| **Secret** | Une donnée sensible injectée dans les Pods | Un fichier `.env` |
::

**k3s** est une distribution Kubernetes complète mais allégée : un seul binaire, environ 500 Mo de RAM, avec Traefik comme Ingress, CoreDNS et un stockage local fournis d'office. C'est la même API que Kubernetes : tout ce qu'on apprend ici se transpose sur un cluster managé (EKS, AKS, GKE).

#### 🛡️ Le rôle Ansible `k3s`

```yaml [roles/k3s/defaults/main.yml]
# Canal « stable » au 26/10/2026 : https://update.k3s.io/v1-release/channels
k3s_version: v1.36.5+k3s1
# Seul le réseau local peut joindre l'API Kubernetes
k3s_api_allowed_from: 192.168.1.0/24
# Réseaux internes du cluster (valeurs par défaut de k3s)
k3s_cluster_cidr: 10.42.0.0/16
k3s_service_cidr: 10.43.0.0/16
# Kubeconfig récupéré sur le poste qui lance Ansible
k3s_kubeconfig_local: "{{ lookup('env', 'HOME') }}/.kube/bhaal.yaml"
```

```yaml [roles/k3s/templates/config.yaml.j2]
# {{ ansible_managed }}
write-kubeconfig-mode: "0600"
tls-san:
  - {{ ansible_host }}
cluster-cidr: {{ k3s_cluster_cidr }}
service-cidr: {{ k3s_service_cidr }}
# Chiffre les Secrets Kubernetes au repos dans la base du cluster
secrets-encryption: true
```

```yaml [roles/k3s/tasks/main.yml]
- name: API Kubernetes accessible depuis le réseau local uniquement
  community.general.ufw:
    rule: allow
    port: "6443"
    proto: tcp
    from_ip: "{{ k3s_api_allowed_from }}"

- name: Trafic des Pods et des Services autorisé
  community.general.ufw:
    rule: allow
    from_ip: "{{ item }}"
  loop:
    - "{{ k3s_cluster_cidr }}"
    - "{{ k3s_service_cidr }}"

- name: Dossier de configuration k3s
  ansible.builtin.file:
    path: /etc/rancher/k3s
    state: directory
    mode: "0755"

- name: Configuration k3s
  ansible.builtin.template:
    src: config.yaml.j2
    dest: /etc/rancher/k3s/config.yaml
    mode: "0600"
  notify: Redémarrer k3s

- name: Version de k3s installée
  ansible.builtin.command: /usr/local/bin/k3s --version
  register: k3s_installed
  changed_when: false
  failed_when: false

- name: Script d'installation k3s
  ansible.builtin.get_url:
    url: https://get.k3s.io
    dest: /usr/local/bin/k3s-install.sh
    mode: "0700"
  when: k3s_version not in k3s_installed.stdout | default('')

- name: Installer k3s (ou changer de version)
  ansible.builtin.command: /usr/local/bin/k3s-install.sh
  environment:
    INSTALL_K3S_VERSION: "{{ k3s_version }}"
  when: k3s_version not in k3s_installed.stdout | default('')
  changed_when: true

- name: K3s démarré
  ansible.builtin.service:
    name: k3s
    state: started
    enabled: true

- name: Attendre que le nœud soit prêt
  ansible.builtin.command:
    argv:
      - /usr/local/bin/k3s
      - kubectl
      - get
      - node
      - "{{ ansible_facts['hostname'] }}"
      - -o
      - jsonpath={.status.conditions[?(@.type=="Ready")].status}
  register: k3s_node_ready
  until: k3s_node_ready.stdout == "True"
  retries: 30
  delay: 10
  changed_when: false

- name: Lire le kubeconfig
  ansible.builtin.slurp:
    src: /etc/rancher/k3s/k3s.yaml
  register: k3s_kubeconfig
  no_log: true  # contient la clé d'administration du cluster

- name: Dossier ~/.kube sur le poste
  ansible.builtin.file:
    path: "{{ k3s_kubeconfig_local | dirname }}"
    state: directory
    mode: "0700"
  delegate_to: localhost
  become: false

- name: Kubeconfig sur le poste, pointant vers le serveur
  ansible.builtin.copy:
    content: >-
      {{ k3s_kubeconfig.content | b64decode
         | replace('https://127.0.0.1:6443', 'https://' ~ ansible_host ~ ':6443') }}
    dest: "{{ k3s_kubeconfig_local }}"
    mode: "0600"
  delegate_to: localhost
  become: false
  no_log: true
  diff: false
```

```yaml [roles/k3s/handlers/main.yml]
# Au premier passage, l'installateur démarre k3s avec la bonne configuration :
# inutile de le redémarrer juste derrière.
- name: Redémarrer k3s
  ansible.builtin.service:
    name: k3s
    state: restarted
  when: k3s_installed.rc | default(1) == 0
```

##### Explications

::tool-table
| Élément | Rôle |
|---------|------|
| `k3s_version` figée | Le script d'installation prend sinon la dernière version : deux serveurs installés à une semaine d'écart n'auraient pas le même Kubernetes |
| `when: k3s_version not in …` | L'installateur ne tourne que si la version installée diffère. Changer la variable suffit pour une **mise à jour** |
| Port 6443 limité au LAN | L'API Kubernetes, c'est le contrôle total du cluster : elle n'a rien à faire sur internet |
| `10.42.0.0/16`, `10.43.0.0/16` | Les réseaux internes des Pods et des Services. La documentation de k3s demande de les autoriser quand UFW est actif |
| Règles UFW **avant** l'installation | Le nœud démarre directement avec un réseau fonctionnel |
| `tls-san` | Ajoute le nom du serveur au certificat de l'API : sans lui, `kubectl` depuis le poste refuse la connexion |
| `secrets-encryption` | Les Secrets sont chiffrés dans la base de k3s. Par défaut, ils y sont seulement encodés en base64 |
| `until` / `retries` | Ansible attend que le nœud soit `Ready` avant de passer à la suite, jusqu'à 5 minutes |
| `delegate_to: localhost` | Ces tâches s'exécutent sur le poste qui lance Ansible, pas sur le serveur |
| `no_log` et `diff: false` | Le kubeconfig contient une **clé d'administration** : elle ne doit apparaître ni dans la sortie, ni dans les logs de CI |
::

#### 🚀 Lancer le rôle

Avant l'installation, une mise à jour complète du serveur (116 paquets attendaient) :

```bash
ssh -t bhaal 'sudo apt update && sudo apt full-upgrade -y'
sudo pacman -S kubectl helm   # sur le poste
```

```bash
ansible-playbook site.yml -K --diff --tags k3s
```

```text
TASK [k3s : API Kubernetes accessible depuis le réseau local uniquement]
changed: [bhaal]

TASK [k3s : Trafic des Pods et des Services autorisé]
changed: [bhaal] => (item=10.42.0.0/16)
changed: [bhaal] => (item=10.43.0.0/16)

TASK [k3s : Configuration k3s]
--- before
+++ after
@@ -0,0 +1,8 @@
+# Ansible managed
+write-kubeconfig-mode: "0600"
+tls-san:
+  - bhaal.homelab.example
+cluster-cidr: 10.42.0.0/16
+service-cidr: 10.43.0.0/16
+# Chiffre les Secrets Kubernetes au repos dans la base du cluster
+secrets-encryption: true
changed: [bhaal]

TASK [k3s : Installer k3s (ou changer de version)]
changed: [bhaal]

TASK [k3s : Attendre que le nœud soit prêt]
ok: [bhaal]

TASK [k3s : Kubeconfig sur le poste, pointant vers le serveur]
changed: [bhaal -> localhost]

PLAY RECAP
bhaal : ok=14   changed=9    unreachable=0    failed=0    skipped=0
```

Le kubeconfig n'apparaît nulle part dans la sortie, malgré `--diff`.

Un deuxième passage ne change plus rien, et saute l'installation puisque la bonne version est déjà là :

```text
TASK [k3s : Script d'installation k3s]
skipping: [bhaal]

TASK [k3s : Installer k3s (ou changer de version)]
skipping: [bhaal]

PLAY RECAP
bhaal : ok=11   changed=0    unreachable=0    failed=0    skipped=2
```

#### ✅ Le cluster depuis le poste

```bash
export KUBECONFIG=~/.kube/bhaal.yaml
kubectl get nodes -o wide
kubectl get pods -A
```

```text
NAME    STATUS   ROLES           AGE    VERSION        INTERNAL-IP     OS-IMAGE                       CONTAINER-RUNTIME
bhaal   Ready    control-plane   5m5s   v1.36.5+k3s1   192.168.1.20   Debian GNU/Linux 13 (trixie)   containerd://2.3.4-k3s1.36

NAMESPACE     NAME                                      READY   STATUS      RESTARTS
kube-system   coredns-7cfb7bc9c7-79dgb                  1/1     Running     0
kube-system   helm-install-traefik-crd-v74dj            0/1     Completed   0
kube-system   helm-install-traefik-qcpmn                0/1     Completed   2
kube-system   local-path-provisioner-77b9867795-6srls   1/1     Running     0
kube-system   metrics-server-6dc596dfb8-4mpjs           1/1     Running     0
kube-system   svclb-traefik-12cb6d25-b7ml2              2/2     Running     0
kube-system   traefik-7c8544f77-5xhth                   1/1     Running     0
```

k3s utilise son propre `containerd` : il cohabite avec le Docker de l'épisode 2 sans le toucher. Les Pods `helm-install-*` sont des tâches ponctuelles (`Completed`) qui ont installé Traefik avec Helm, l'outil que l'on utilisera à l'épisode 4.

##### Le réseau des Pods

Un Pod de test, pour vérifier que le réseau du cluster fonctionne derrière UFW :

```bash
kubectl run nettest --image=busybox:1.37 --restart=Never --command -- sleep 600
kubectl exec nettest -- nslookup kubernetes.default.svc.cluster.local
kubectl exec nettest -- nc -w 5 -z 10.43.0.1 443
kubectl exec nettest -- wget -q -O /dev/null http://example.com
```

::tool-table
| Test | Résultat |
|------|----------|
| DNS interne (`kubernetes.default`) | `10.43.0.1` |
| DNS externe (`example.com`) | Résolu |
| Service de l'API (`10.43.0.1:443`) | Ouvert |
| Sortie internet (HTTP) | OK |
::

##### Et sans les règles UFW ?

À l'[épisode 1](/blog/article/01-devsecops-ansible-durcissement), `ufw status` affichait `deny (routed)` : UFW bloque le trafic qui transite par le serveur. Or le trafic des Pods transite justement par le serveur. Je m'attendais donc à ce que les règles `10.42.0.0/16` et `10.43.0.0/16` du rôle soient indispensables. Pour le vérifier, je les ai retirées :

```bash
ssh -t bhaal 'sudo ufw delete allow from 10.42.0.0/16 && sudo ufw delete allow from 10.43.0.0/16'
```

Puis j'ai relancé les mêmes tests, plus un appel direct de Pod à Pod et l'Ingress depuis le poste : **tout fonctionne encore**. L'explication est dans l'ordre des règles de la chaîne `FORWARD` :

```bash
ssh -t bhaal 'sudo iptables -L FORWARD -n --line-numbers'
```

```text
Chain FORWARD (policy DROP)
num  target                      /* commentaire */
1    KUBE-ROUTER-FORWARD         /* kube-router netpol */
2    KUBE-PROXY-FIREWALL         /* kubernetes load balancer firewall */
3    KUBE-FORWARD                /* kubernetes forwarding rules */
4    KUBE-SERVICES               /* kubernetes service portals */
5    KUBE-EXTERNAL-SERVICES      /* kubernetes externally-visible service portals */
6    ACCEPT                      /* KUBE-ROUTER rule to explicitly ACCEPT traffic that comply to network policies */
7    DOCKER-USER
8    DOCKER-FORWARD
9    ufw-before-logging-forward
10   ufw-before-forward
11   ufw-after-forward
12   ufw-after-logging-forward
13   ufw-reject-forward
14   ufw-track-forward
15   FLANNEL-FWD                 /* flanneld forward */
```

::tool-table
| Rangs | Qui | Effet |
|-------|-----|-------|
| 1 à 6 | k3s (kube-router, kube-proxy) | La règle 6 **accepte** le trafic des Pods conforme aux NetworkPolicies. Aucune n'est définie, donc tout le trafic des Pods est accepté ici |
| 7 et 8 | Docker | Les règles de l'épisode 2 |
| 9 à 14 | UFW et son `deny (routed)` | Le trafic des Pods n'arrive jamais jusqu'ici |
| 15 | flannel (le réseau des Pods) | Placé *après* UFW : seul, il aurait été bloqué |
::

Le trafic des Pods est accepté par le **contrôleur de NetworkPolicies intégré à k3s**, avant qu'UFW ait son mot à dire. Et les règles `ufw allow from 10.42.0.0/16` ne concernent même pas ce trafic : sans le mot-clé `route`, UFW les place dans la chaîne d'**entrée** (le trafic des Pods vers le serveur lui-même), pas dans celle du transit.

Je garde ces règles, puisque la documentation de k3s les demande pour le trafic des Pods vers l'hôte, mais je n'ai pas trouvé de cas où leur absence casse quelque chose sur ce nœud unique.

> 💡 La leçon est la même qu'à l'épisode 2 avec Docker : **`ufw status` ne montre qu'une partie du filtrage réel**. Docker et k3s écrivent chacun leurs règles iptables, et les placent avant celles d'UFW. Pour savoir ce qui est vraiment filtré, il faut lire `iptables -L` (ou `nft list ruleset`), pas l'interface simplifiée. Et pour filtrer le trafic **entre Pods**, l'outil adapté n'est pas le pare-feu de l'hôte, mais les **NetworkPolicies** de Kubernetes.

Pour finir, Ansible remet les deux règles supprimées à la main : c'est une dérive, corrigée au passage suivant.

```bash
ansible-playbook site.yml -K --tags k3s
```

```text
TASK [k3s : API Kubernetes accessible depuis le réseau local uniquement]
ok: [bhaal]

TASK [k3s : Trafic des Pods et des Services autorisé]
changed: [bhaal] => (item=10.42.0.0/16)
changed: [bhaal] => (item=10.43.0.0/16)

TASK [k3s : Script d'installation k3s]
skipping: [bhaal]

TASK [k3s : Installer k3s (ou changer de version)]
skipping: [bhaal]

PLAY RECAP
bhaal : ok=11   changed=1    unreachable=0    failed=0    skipped=2
```

Seule la tâche concernée est `changed` : Ansible a recréé exactement ce qui manquait, sans toucher au reste. Le `PLAY RECAP` compte les **tâches** modifiées, d'où `changed=1` pour deux règles. L'installation de k3s est sautée (`skipping`), puisque la bonne version est déjà en place.

#### 🌐 Premier déploiement : whoami

```yaml [k8s/whoami.yml]
apiVersion: apps/v1
kind: Deployment
metadata:
  name: whoami
  namespace: prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: whoami
  template:
    metadata:
      labels:
        app: whoami
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534
        runAsGroup: 65534
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: whoami
          image: traefik/whoami:v1.10.1
          args: ["--port", "8080"]   # non root : pas de port < 1024
          ports:
            - containerPort: 8080
          securityContext:
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
          resources:
            limits:
              memory: "64Mi"
              cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: whoami
  namespace: prod
spec:
  selector:
    app: whoami
  ports:
    - port: 80
      targetPort: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: whoami
  namespace: prod
spec:
  rules:
    - host: whoami.lab.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: whoami
                port:
                  number: 80
```

Les trois objets s'emboîtent par leurs **étiquettes** et leurs **noms** : le Deployment crée des Pods étiquetés `app: whoami`, le Service sélectionne les Pods qui portent cette étiquette, et l'Ingress envoie vers le Service `whoami`.

```bash
kubectl create namespace prod
kubectl apply -f k8s/whoami.yml
kubectl -n prod rollout status deploy/whoami
```

```text
deployment "whoami" successfully rolled out

NAME                          READY   STATUS    IP
pod/whoami-78fb4886f5-cfgnx   1/1     Running   10.42.0.11
pod/whoami-78fb4886f5-h4dpx   1/1     Running   10.42.0.12

NAME             TYPE        CLUSTER-IP     PORT(S)
service/whoami   ClusterIP   10.43.80.254   80/TCP

NAME                               CLASS     HOSTS              ADDRESS         PORTS
ingress.networking.k8s.io/whoami   traefik   whoami.lab.local   192.168.1.20   80
```

Depuis le poste, en passant par l'Ingress sur le port 80 :

```bash
curl -H "Host: whoami.lab.local" http://bhaal.homelab.example/
```

```text
Hostname: whoami-78fb4886f5-h4dpx
Hostname: whoami-78fb4886f5-cfgnx
Hostname: whoami-78fb4886f5-h4dpx
```

Trois appels, deux Pods différents : le Service **répartit la charge**.

> 💡 Le tout premier appel, juste après le déploiement, a répondu `no available server`. Traefik avait reçu l'Ingress, mais pas encore la liste des Pods prêts. Dix secondes plus tard, tout fonctionnait. Pour un déploiement en CI, on attend donc `rollout status` **et** une réponse de l'Ingress avant de déclarer le succès.

#### 🔁 L'auto-réparation

```bash
kubectl -n prod delete pod whoami-78fb4886f5-cfgnx --wait=false
kubectl -n prod get pods
```

```text
NAME                      READY   STATUS        RESTARTS   AGE
whoami-78fb4886f5-cfgnx   1/1     Terminating   0          34s
whoami-78fb4886f5-h4dpx   1/1     Running       0          34s

# 8 secondes plus tard
NAME                      READY   STATUS    RESTARTS   AGE
whoami-78fb4886f5-h4dpx   1/1     Running   0          42s
whoami-78fb4886f5-s64l9   1/1     Running   0          8s
```

Personne n'a relancé le Pod : le Deployment a constaté qu'il n'en restait qu'un sur les deux voulus, et en a créé un nouveau (`s64l9`). C'est la même logique que Terraform à l'épisode 2 (comparer l'état voulu à la réalité, puis corriger), mais **en continu**, sans qu'on lance de commande.

#### 🔒 Le manifeste vérifié par Trivy

Le manifeste whoami contient deux blocs `securityContext` : utilisateur non root, système de fichiers en lecture seule, aucune capacité Linux. Trivy l'analyse sans rien trouver :

```bash
trivy config --severity HIGH,CRITICAL --exit-code 1 .
```

```text
┌────────────────┬────────────┬───────────────────┐
│     Target     │    Type    │ Misconfigurations │
├────────────────┼────────────┼───────────────────┤
│ k8s/whoami.yml │ kubernetes │         0         │
├────────────────┼────────────┼───────────────────┤
│ terraform      │ terraform  │         0         │
└────────────────┴────────────┴───────────────────┘
```

La même analyse sur une copie dont j'ai retiré les deux `securityContext` :

```text
Failures: 3 (HIGH: 3, CRITICAL: 0)
KSV-0014 (HIGH): Container 'whoami' of Deployment 'whoami' should set 'securityContext.readOnlyRootFilesystem' to true
KSV-0118 (HIGH): container whoami in prod namespace is using the default security context
KSV-0118 (HIGH): deployment whoami in prod namespace is using the default security context, which allows root privileges
```

Avec `--exit-code 1`, la commande échoue, et le pipeline Jenkins du lab avec elle. Le manifeste « par défaut », celui qu'on trouve dans la plupart des tutoriels, n'aurait pas passé la CI.

#### 🐛 Ce qui n'a pas marché du premier coup

::tool-table
| Symptôme | Cause | Correction |
|----------|-------|------------|
| (Évité à la relecture) L'attente du nœud ne trouve jamais `Ready` | Le module `command` découpe ses arguments comme un shell : les guillemets de `@.type=="Ready"` disparaissent | `argv:`, où chaque argument est transmis tel quel |
| (Évité à la relecture) Le kubeconfig s'affiche en clair avec `--diff` | `copy` affiche le contenu du fichier qui change, clé privée comprise | `no_log: true` et `diff: false` |
| `helm-install-traefik` redémarre 2 fois | Le handler redémarrait k3s juste après l'installation, interrompant probablement l'installation de Traefik en cours | Handler limité au cas où k3s était déjà installé |
| `no available server` au premier `curl` | Traefik n'avait pas encore les Pods prêts | Attendre quelques secondes, et vérifier l'Ingress après `rollout status` |
::

> 💡 Les deux premières lignes n'ont jamais tourné : elles ont été repérées en relisant le rôle avant de le lancer. La seconde est la plus importante. Un kubeconfig affiché dans des logs de CI, c'est l'accès administrateur au cluster donné à toute personne qui peut lire ces logs.

#### ✅ Conclusion

En un rôle Ansible d'une centaine de lignes, bhaal est devenu un nœud Kubernetes : version figée, API réservée au réseau local, Secrets chiffrés, kubeconfig récupéré sans jamais l'afficher. Les objets de base (Pod, Deployment, Service, Ingress, Namespace) ont été vus en vrai, avec la répartition de charge et l'auto-réparation.

Le prochain épisode déploie **DefectDojo** sur ce cluster avec **Terraform et Helm**, branché sur une base PostgreSQL existante d'un autre serveur.

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
