---
title: "Lab DevSecOps (7) : le socle du cluster, trois serveurs et une seule IP"
description: "Trois serveurs k3s et un agent installés par Ansible, un pare-feu entre nœuds, MetalLB qui partage une seule IP entre HTTPS et SSH, Longhorn pour le stockage, et un certificat wildcard renouvelé tout seul par cert-manager. Avec les pièges DNS qui ont coûté le plus de temps."
icon: "i-mdi:server-network"
article_id: "07-devsecops-k3s-socle"
color: "orange"
draft: true
publishedAt: '2026-10-29'
---
#### 📌 Où on en est

L'[épisode précédent](/blog/article/06-devsecops-k3s-homelab) a mesuré les trois serveurs du homelab avant d'y toucher : deux disques rapides grâce au cache du contrôleur RAID, un troisième dix fois plus lent, et la décision de faire **trois serveurs etcd**, pas quatre.

Cet épisode construit le **socle** : ce qui doit exister avant de migrer le moindre service.

- un cluster k3s à trois serveurs, plus un agent ;
- un pare-feu qui laisse passer le trafic entre nœuds, et rien d'autre ;
- **une seule adresse IP** pour tous les services, en HTTPS comme en SSH ;
- du stockage qui survit à la perte d'un nœud ;
- un certificat `*.homelab.example` qui se renouvelle tout seul.

À la fin, une première page répond en HTTPS sur le cluster, et aucun service Docker n'a été coupé.

#### 🧱 Trois serveurs et un agent, avec Ansible

Le rôle `k3s` de l'[épisode 3](/blog/article/03-devsecops-k3s-ansible) installait un serveur seul, avec sa base SQLite. Pour un cluster, il apprend deux choses : **initialiser** etcd sur le premier serveur, et y **joindre** les suivants.

Tout se joue dans le fichier de configuration de k3s, généré par Ansible :

```yaml [roles/k3s/templates/config.yaml.j2]
write-kubeconfig-mode: "0600"
tls-san:
  - {{ ansible_host }}
{% if k3s_cluster_init %}
cluster-init: true
{% elif k3s_server_url %}
server: {{ k3s_server_url }}
{% endif %}
{% if k3s_token %}
token: {{ k3s_token }}
{% endif %}
{% if k3s_disable %}
disable:
{% for component in k3s_disable %}
  - {{ component }}
{% endfor %}
{% endif %}
cluster-cidr: {{ k3s_cluster_cidr }}
service-cidr: {{ k3s_service_cidr }}
# Chiffre les Secrets Kubernetes au repos dans la base du cluster
secrets-encryption: true
```

##### Explications

- **`cluster-init: true`** : seulement sur cyric (`host_vars/cyric.yml`). k3s y démarre un etcd neuf au lieu de SQLite.
- **`server:` et `token:`** : sur baine et ilmater. Ils rejoignent le cluster de cyric avec un jeton partagé, rangé dans le vault Ansible.
- **`tls-san`** : le nom de chaque machine est ajouté au certificat de l'API, pour pouvoir lancer `kubectl` depuis le poste par `cyric.homelab.example`.
- **`disable`** : deux composants intégrés de k3s sont désactivés. On verra pourquoi plus bas.

Les valeurs communes sont dans les variables du groupe :

```yaml [group_vars/homelab/vars.yml]
k3s_server_url: https://cyric.homelab.example:6443
k3s_token: "{{ vault_k3s_homelab_token }}"
k3s_peer_ips: [192.168.1.10, 192.168.1.11, 192.168.1.12, 192.168.1.20]
# servicelb publierait 80/443 sur chaque nœud, déjà pris par Traefik (Docker) et Coolify ;
# local-storage serait une 2e StorageClass par défaut à côté de Longhorn
k3s_disable: [servicelb, local-storage]
```

Dans le playbook, le jeu qui installe k3s porte **`serial: 1`** : Ansible traite les machines **une par une**. cyric passe en premier et crée le cluster, puis baine et ilmater le rejoignent. Sans `serial`, les trois démarreraient en même temps, et baine chercherait à rejoindre un cluster qui n'existe pas encore.

##### L'agent

bhaal rejoint ensuite le cluster comme **agent** : il fait tourner des pods, mais ne vote pas dans etcd. Le rôle choisit un modèle de configuration réduit (`server` et `token`, rien d'autre) et installe le service `k3s-agent` à la place de `k3s` :

```yaml [roles/k3s/tasks/main.yml]
src: "{{ 'config-agent.yaml.j2' if k3s_agent else 'config.yaml.j2' }}"
# …
INSTALL_K3S_EXEC: "{{ 'agent' if k3s_agent else '' }}"
```

Un agent n'a pas de `kubectl` local qui parle au cluster : les tâches qui en ont besoin sont **déléguées** à un serveur (`k3s_kubectl_host: cyric`).

```bash
$ kubectl get nodes
NAME      STATUS   ROLES                AGE   VERSION
baine     Ready    control-plane,etcd   25h   v1.36.5+k3s1
bhaal     Ready    <none>               19h   v1.36.5+k3s1
cyric     Ready    control-plane,etcd   26h   v1.36.5+k3s1
ilmater   Ready    control-plane,etcd   25h   v1.36.5+k3s1
```

#### 🔥 Le pare-feu entre les nœuds

Aucune des trois machines n'avait de pare-feu. On leur applique le rôle `hardening` de l'[épisode 1](/blog/article/01-devsecops-ansible-durcissement), **un nœud à la fois**, en gardant une session SSH ouverte à côté : si une règle coupe l'accès, la session déjà ouverte permet de la corriger.

Un cluster a besoin de quelques ports entre ses membres. On les ouvre **seulement** depuis les adresses des nœuds, pas depuis tout le réseau local :

::tool-table
| Port | Rôle |
|---|---|
| 2379-2380/tcp | etcd (clients et membres) |
| 6443/tcp | API Kubernetes (depuis le LAN) |
| 10250/tcp | kubelet (journaux, `kubectl exec`, métriques) |
| 8472/udp | flannel, le réseau des pods (VXLAN) |
| 7946/tcp+udp | MetalLB (élection de l'annonceur) |
::

```yaml [roles/k3s/tasks/main.yml]
- name: Trafic entre nœuds du cluster (etcd, kubelet, flannel VXLAN, memberlist MetalLB)
  community.general.ufw:
    rule: allow
    from_ip: "{{ item.0 }}"
    port: "{{ item.1.port }}"
    proto: "{{ item.1.proto }}"
  loop: "{{ k3s_peer_ips | product(k3s_peer_ports) | list }}"
```

Le filtre `product` fabrique toutes les combinaisons (nœud, port) : 4 nœuds × 5 ports donnent 20 règles, sans en écrire une seule à la main.

##### Trois pièges du pare-feu

**Les connexions déjà ouvertes passent toujours.** Activer UFW ne coupe pas une connexion établie. Les agents Jenkins joignaient leur contrôleur par l'IP de leur propre hôte, maintenant filtrée : tout semblait marcher… jusqu'au premier redémarrage, où plus aucun agent ne s'est reconnecté.

> 💡 Après un changement de pare-feu, redémarre ce qui en dépend. C'est le seul vrai test.

**La limite SSH.** Le rôle `hardening` limite le SSH à 6 connexions en 30 secondes (`ufw limit`), contre les attaques par force brute. Mais un script qui lance un `ssh` par fichier ou par base se fait bloquer aussi (`Connection refused`). C'est arrivé quatre fois pendant la migration. La parade : **une seule session**, et un flux (`tar … | ssh … tar -x`).

**Docker passe par-dessus UFW.** Un port publié par Docker (`-p 5432:5432`) écrit ses propres règles iptables, **avant** celles d'UFW. Les ports de PostgreSQL et de Valkey, publiés en Docker, n'étaient donc pas protégés par le pare-feu qu'on venait d'installer. On le savait depuis l'épisode 2, et c'est une raison de plus de migrer : un service dans k3s n'est joignable que par ce qu'on expose explicitement.

#### 📍 Une seule IP pour tout : MetalLB

Dans un cluster hébergé chez un fournisseur de cloud, un Service de type `LoadBalancer` reçoit une IP publique. Chez soi, personne ne la donne. k3s embarque un petit équilibreur, **`servicelb`**, qui publie chaque Service sur **tous les nœuds**, sur le même port. Ici, c'est impossible : les ports 80 et 443 des machines sont déjà pris par les Traefik Docker et par Coolify, qui doivent tourner pendant toute la migration.

**MetalLB**, en mode **L2**, fait autrement : il prend une adresse **libre** du réseau local et répond aux requêtes ARP pour elle (« 192.168.1.50, c'est moi »). Un seul nœud porte l'adresse à un instant donné. S'il tombe, un autre la reprend. Les ports des machines ne sont jamais touchés.

<mermaid>
graph LR
  C["💻 Navigateur, git, CI"] -->|"forgejo.homelab.example"| DNS["🌐 Pi-hole"]
  DNS -->|"192.168.1.50"| VIP["📍 IP MetalLB<br/>192.168.1.50"]
  VIP -->|":443"| T["🔀 Traefik (k3s)"]
  VIP -->|":22"| S["🔑 Forgejo SSH"]
  T --> A["Forgejo, Jenkins, Windshift…"]
  subgraph N["Ports des machines : inchangés"]
    D["🐳 Traefik Docker :80/:443"]
  end
</mermaid>

La plage d'adresses est déclarée dans un petit chart local :

```yaml [charts/homelab-config/templates/metallb.yaml]
# Plage d'IP que MetalLB attribue aux Services LoadBalancer, annoncée en ARP (L2)
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: homelab
  namespace: metallb-system
spec:
  addresses:
    - {{ .Values.metallb.pool | required "metallb.pool est requis" }}
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: homelab
  namespace: metallb-system
spec:
  ipAddressPools:
    - homelab
```

La plage (`192.168.1.50-192.168.1.59`) doit être **hors du DHCP** de la box : sinon, un jour, un téléphone recevra l'adresse de Traefik.

##### Pourquoi un chart local ?

`IPAddressPool` n'est pas un objet standard de Kubernetes : c'est une **CRD**, un type ajouté par MetalLB lui-même. Au moment du `terraform plan`, MetalLB n'est pas encore installé, donc ce type n'existe pas encore, et Terraform refuserait un manifeste qui l'utilise. Le contournement : regrouper ces objets dans un petit chart Helm local (`homelab-config`), installé **après** MetalLB grâce à un `depends_on`. Pour Terraform, ce n'est qu'un release Helm de plus.

```hcl [terraform-homelab/main.tf]
resource "helm_release" "metallb" {
  name             = "metallb"
  repository       = "https://metallb.github.io/metallb"
  chart            = "metallb"
  version          = var.metallb_chart_version
  namespace        = "metallb-system"
  create_namespace = true
  wait             = true
  # Le premier téléchargement des images prend 3 à 4 min par nœud
  timeout = 900

  values = [yamlencode({
    # Mode L2 (ARP) uniquement : pas besoin du routage BGP de frr-k8s
    frrk8s = {
      enabled = false
    }
  })]
}
```

##### Une IP, trois services

MetalLB permet à plusieurs Services de **partager** une même IP, à condition qu'ils portent la même clé de partage et que leurs ports ne se chevauchent pas. On en profite : Traefik (80 et 443), le SSH de Forgejo (22) et le SMTP de test (1025) sont tous sur `192.168.1.50`.

```hcl [terraform-homelab/forgejo.tf]
service = {
  ssh = {
    type = "LoadBalancer"
    port = 22
    annotations = {
      # Même IP que Traefik (ports différents) : un seul nom pour HTTPS et SSH
      "metallb.io/loadBalancerIPs" = var.traefik_ip
      "metallb.io/allow-shared-ip" = local.ingress_ip_sharing_key
    }
  }
}
```

Résultat : `forgejo.homelab.example` sert l'interface en HTTPS **et** `git clone git@forgejo.homelab.example:…` en SSH, sans `:222`. Une seule IP pour trois Services, plus une seconde pour PostgreSQL (épisode 10) :

```bash
$ kubectl get svc -A | grep LoadBalancer
forgejo       forgejo-ssh    LoadBalancer   …   192.168.1.50   22:31466/TCP
kube-system   traefik        LoadBalancer   …   192.168.1.50   80:31051/TCP,443:30828/TCP
mailpit       mailpit-smtp   LoadBalancer   …   192.168.1.50   1025:30712/TCP
postgres      pg-rw-lb       LoadBalancer   …   192.168.1.52   5432:30413/TCP
```

##### Régler le Traefik fourni par k3s

k3s installe lui-même Traefik avec Helm. On ne réinstalle pas un second Traefik : on **surcharge les values** du sien avec un objet `HelmChartConfig`.

```yaml [charts/homelab-config/templates/traefik.yaml]
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: traefik
  namespace: kube-system
spec:
  valuesContent: |
    service:
      annotations:
        metallb.io/loadBalancerIPs: {{ .Values.traefik.ip }}
        metallb.io/allow-shared-ip: {{ .Values.traefik.sharingKey }}
    ports:
      web:
        # Comme les Traefik Docker : tout le HTTP est redirigé vers HTTPS
        http:
          redirections:
            entryPoint:
              to: websecure
              scheme: https
              permanent: true
      websecure:
        # Traefik v3 coupe une requête après 60 s : trop court pour un gros git push
        transport:
          respondingTimeouts:
            readTimeout: 600s
            writeTimeout: 600s
            idleTimeout: 600s
```

Le délai de 60 secondes de Traefik v3 est un piège discret : un petit `git push` passe, un gros échoue au milieu. Même chose pour un push d'image de plusieurs centaines de Mo vers le registry.

#### 💾 Le stockage : Longhorn

Un pod peut redémarrer sur n'importe quel nœud. Ses données doivent pouvoir le suivre. **Longhorn** découpe chaque volume en copies, posées sur des **nœuds différents** et tenues à jour par le réseau. Si un nœud tombe, le volume repart sur un autre, à partir de sa copie.

```hcl [terraform-homelab/main.tf]
values = [yamlencode({
  persistence = {
    defaultClass = true
    # 2 copies sur 2 nœuds différents : cyric et baine ont un disque Longhorn
    defaultClassReplicaCount = 2
  }
  defaultSettings = {
    # Disque par défaut seulement sur les nœuds étiquetés par Ansible (pas ilmater)
    createDefaultDiskLabeledNodes = true
    defaultDataPath               = "/var/lib/longhorn"
  }
})]
```

- **`createDefaultDiskLabeledNodes`** : Longhorn ne crée un disque que sur les nœuds qui portent l'étiquette `node.longhorn.io/create-default-disk=true`. Ansible la pose sur cyric, baine, puis bhaal (son SSD), mais **pas sur ilmater** : avec son contrôleur lent, chaque écriture répliquée l'attendrait.
- **Les prérequis** sont un rôle Ansible à part (`longhorn_prereqs`) : `open-iscsi` (Longhorn présente ses volumes en iSCSI), le module `iscsi_tcp` au démarrage, et sur cyric le formatage et le montage de son disque vierge de 297 Go. Ce disque est désigné par son identifiant WWN, pas par `/dev/sda` : les noms `sda` et `sdb` peuvent s'inverser d'un démarrage à l'autre.
- **`local-storage` est désactivé** dans k3s : sinon, il y aurait deux StorageClass « par défaut », et chaque volume serait créé au hasard dans l'une ou dans l'autre.

> 💡 Exclure ilmater de Longhorn était le bon choix… et il a eu une conséquence dès le lendemain. PostgreSQL voulait une instance par serveur, donc une sur ilmater, qui n'avait pas de disque Longhorn. On y reviendra dans l'épisode 10.

#### 🔐 Un certificat wildcard qui se renouvelle tout seul

Avant la migration, chaque machine avait son certificat wildcard, renouvelé **à la main** avec certbot. Huit services en dépendaient, et l'expiration approchait.

**cert-manager** fait ce travail dans le cluster. Pour obtenir un certificat, Let's Encrypt demande une preuve de propriété du domaine. Pour un **wildcard**, une seule preuve est acceptée : le **défi DNS-01**, un enregistrement TXT `_acme-challenge.homelab.example` à poser chez l'hébergeur du DNS. Le webhook `cert-manager-webhook-ovh` le pose et le retire par l'API d'OVH. Avantage supplémentaire : aucun service n'a besoin d'être joignable depuis Internet.

```hcl [terraform-homelab/main.tf]
resource "helm_release" "cert_manager" {
  # …
  values = [yamlencode({
    crds = {
      enabled = true
      keep    = true
    }
    # Le Pi-hole sert une vue locale de la zone : la vérification de
    # propagation du TXT _acme-challenge passe par des résolveurs publics.
    dns01RecursiveNameservers     = "1.1.1.1:53,9.9.9.9:53"
    dns01RecursiveNameserversOnly = true
  })]
}
```

Le certificat lui-même tient en quelques lignes :

```yaml [charts/homelab-config/templates/certificate.yaml]
# Wildcard renouvelé par cert-manager (défi DNS-01 via l'API OVH), 30 jours avant expiration
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard
  namespace: kube-system
spec:
  secretName: wildcard-homelab-example-tls
  issuerRef:
    kind: ClusterIssuer
    name: {{ .Values.wildcard.issuer }}
  dnsNames:
    - homelab.example
    - "*.homelab.example"
  privateKey:
    algorithm: ECDSA
    size: 256
    # Nouvelle clé à chaque renouvellement
    rotationPolicy: Always
```

##### Les quatre règles qui ont évité des ennuis

1. **Les identifiants OVH ne passent pas par Terraform.** Ils sont dans le vault Ansible, et un rôle crée le Secret `cert-manager/ovh-credentials`. Terraform ne connaît que son nom : son état, qui garde tout en clair, ne contient aucun secret.
2. **`le-staging` d'abord.** Let's Encrypt limite le nombre de vrais certificats par semaine. Un réglage raté répété en boucle peut bloquer le domaine pendant des jours. Le serveur de test n'a pas cette limite. Une variable Terraform, avec une validation, n'accepte que `le-staging` ou `le-prod`.
3. **Vérifier la propagation ailleurs que chez soi.** Le Pi-hole répond pour la zone `homelab.example` avec sa vue **locale**, où le TXT n'existe pas. cert-manager attendait donc sans fin un enregistrement pourtant bien posé chez OVH. D'où `dns01RecursiveNameservers` vers des résolveurs publics.
4. **Un certificat par défaut pour toutes les routes.** Un `TLSStore` nommé `default` dit à Traefik : « toute route HTTPS sans certificat propre reçoit le wildcard ». Les Ingress n'ont même plus besoin de `secretName`. Attention aux charts qui en mettent un par défaut (celui de DefectDojo vise `defectdojo-tls`, qui n'existe pas) : il faut le vider explicitement.

##### Et les Traefik Docker, pendant la transition ?

Tant que des services tournent encore en Docker, leurs Traefik ont besoin du même certificat. Un rôle Ansible (`traefik_cert_sync`) installe sur chaque machine un **timer systemd** quotidien qui lit le Secret du cluster, vérifie que le certificat n'expire pas dans les 24 heures et que la clé lui correspond, puis le recopie et redémarre Traefik, **seulement s'il a changé**. Une fois une machine vidée de ses conteneurs, le même rôle retire son timer.

#### 🧭 Les pièges DNS

Le DNS a coûté plus de temps que Kubernetes. Chaque migration se termine en faisant pointer un nom vers `192.168.1.50`, dans le Pi-hole. Trois pièges sont revenus.

**Un CNAME vers une adresse IP ne résout rien.** Un CNAME pointe vers un **nom**, jamais vers une IP. Pour une adresse, il faut un enregistrement **A**.

**Un ancien CNAME passe avant le nouvel enregistrement A.** Un nom avait un CNAME vers le nom d'une machine. Après l'ajout de l'enregistrement A vers `192.168.1.50`, il résolvait **toujours** vers l'ancienne machine. `dig` montre toute la chaîne :

```bash
$ dig +short mcp-forgejo.homelab.example
cyric.homelab.example.
192.168.1.10
```

Deux lignes au lieu d'une : il restait un CNAME à supprimer.

**Une vieille ligne dans `/etc/hosts`.** Sur une machine, une ligne ajoutée à la main un an plus tôt envoyait le registry vers son ancienne adresse. Elle passait **avant** le DNS, et le compose de Coolify la recopiait dans ses conteneurs (`extra_hosts`). Seule cette machine voyait encore l'ancien registry, arrêté.

`dig` interroge le DNS, `getent` fait comme les programmes (il lit `/etc/hosts` **puis** le DNS) :

```bash
$ getent hosts registry.homelab.example
192.168.1.10    registry.homelab.example     # /etc/hosts gagne
$ dig +short registry.homelab.example
192.168.1.50                                 # le DNS, lui, a raison
```

##### Tester avant de basculer

Pour vérifier un service sur le cluster **avant** de changer le DNS, `curl` sait forcer la résolution d'un nom :

```bash
curl --resolve forgejo.homelab.example:443:192.168.1.50 https://forgejo.homelab.example/
```

Le certificat est vérifié pour le vrai nom, la requête part vers la nouvelle IP, et rien ne change pour les autres utilisateurs. Toutes les migrations des épisodes suivants passent par cette étape.

#### ✅ Conclusion

Le socle tient en une poignée de fichiers : un modèle de configuration k3s, quelques règles UFW, et trois releases Helm décrits par Terraform. Ce qui a demandé le plus de réflexion, ce n'est pas Kubernetes, c'est la **cohabitation** : servicelb désactivé parce que les ports des machines étaient pris, une IP partagée pour ne pas multiplier les adresses, un certificat recopié vers les Traefik Docker le temps de la transition.

::tool-table
| Brique | Choix | Pourquoi |
|---|---|---|
| Plan de contrôle | 3 serveurs etcd + 1 agent | une panne tolérée, sans 4ᵉ vote inutile |
| Réseau | MetalLB L2, une IP partagée | aucun conflit avec les ports déjà utilisés |
| Stockage | Longhorn, 2 copies | un volume survit à la perte d'un nœud |
| Certificats | cert-manager, DNS-01 | un wildcard renouvelé seul, sans rien exposer à Internet |
| Secrets | vault Ansible → Secrets | rien en clair dans l'état Terraform |
::

Prochain épisode : la méthode pour migrer un service sans le casser, appliquée à Forgejo, Windshift, au registry et à Trilium.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
