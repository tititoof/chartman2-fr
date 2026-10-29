---
title: "Lab DevSecOps (9/11) : Jenkins dans Kubernetes, des agents en pods et des images sans Docker"
description: "Déplacer Jenkins de Docker Compose vers k3s : retrouver la version qui tournait vraiment, copier le JENKINS_HOME avec ses secrets, des agents éphémères en pods, BuildKit sans root à la place du docker.sock, et les pièges des premiers builds (HOME, mémoire de SonarQube, tag latest, déploiement qui ne déployait rien)."
icon: "i-mdi:robot-industrial-outline"
article_id: "09-devsecops-jenkins-kubernetes"
color: "orange"
draft: true
publishedAt: '2026-10-29'
---
#### 📌 Où on en est

Dans l'[épisode 5](/blog/article/05-devsecops-jenkins-trivy-defectdojo), le pipeline construisait une image Docker, la scannait avec Trivy et envoyait le rapport à DefectDojo. Il tournait sur un Jenkins en Docker Compose, avec des agents qui utilisaient **le `docker.sock` de l'hôte**.

L'[épisode 8](/blog/article/08-devsecops-migrer-sans-casser) a posé une méthode de migration. Jenkins est le cas le plus délicat, pour trois raisons :

- **son état** : 473 Mo de `JENKINS_HOME`, avec les jobs, l'historique, les plugins, et des credentials chiffrés par une clé qui doit suivre ;
- **ses agents** : des conteneurs permanents, avec l'accès au démon Docker de la machine ;
- **les builds d'images** : sans `docker.sock` dans le cluster, `docker build` n'existe plus.

#### 🔓 Pourquoi se débarrasser du `docker.sock`

Monter `/var/run/docker.sock` dans un conteneur, c'est lui donner le droit de demander **n'importe quoi** au démon Docker de l'hôte : lancer un conteneur privilégié, monter `/` de la machine, lire tous les fichiers. Un agent qui a le socket **est root sur la machine**.

Tant que les agents étaient des conteneurs permanents sur une seule machine, le risque était accepté. Dans un cluster, ce n'est plus possible, et ce n'est plus nécessaire : un agent peut être **un pod créé pour un build, puis supprimé**, et une image peut se construire **sans démon Docker**.

#### 🔍 Étape 1 : la version qui tournait vraiment

Le compose disait `image: jenkins/jenkins:lts`. L'image locale était la **2.541.3**. L'interface de Jenkins, elle, affichait la **2.568.1**.

Explication : Jenkins sait se mettre à jour **depuis son interface**. Il télécharge le nouveau `jenkins.war` et le place dans son `JENKINS_HOME`. Le conteneur continuait donc de démarrer sur la vieille image… avec un `.war` plus récent. Recréer le conteneur depuis l'image, ou l'installer dans k3s en suivant le compose, aurait **rétrogradé** Jenkins de la 2.568.1 à la 2.541.3, avec des plugins prévus pour la plus récente.

Dans k3s, l'image est épinglée sur la version réelle :

```hcl [terraform-homelab/jenkins.tf]
# Même version que le jenkins.war qui tournait sous Docker (mis à jour depuis
# l'interface : l'image « lts » du conteneur était restée en 2.541.3)
image = {
  # Tag complet : avec un tag explicite, le chart ignore tagLabel
  tag = "${var.jenkins_version}-jdk21"     # 2.568.1-jdk21
}
```

##### Préparer les plugins dans l'ancien Jenkins

Le Jenkins du cluster a besoin de plugins que l'ancien n'avait pas : `kubernetes` (pour créer des agents en pods) et `configuration-as-code`. Plutôt que de les laisser s'installer au premier démarrage dans k3s, on les installe **dans l'ancien Jenkins**, avant la migration, pour la bonne version :

```bash
jenkins-plugin-cli --war <chemin du jenkins.war en service> \
  --plugins kubernetes kubernetes-credentials kubernetes-client-api configuration-as-code
```

`--war` est important : il résout les versions compatibles avec **ce** `.war`, pas avec la dernière LTS. Une sauvegarde des plugins (`plugins-backup-avant-k3s.tgz`) est faite avant, et le chart démarre ensuite **sans rien installer** (`installPlugins: false`).

#### 📦 Étape 6 : copier le `JENKINS_HOME`

On copie **tout**, conteneur arrêté, avec deux exceptions :

- `workspace/` : les espaces de travail des builds, jetables, recréés à chaque build ;
- `nodes/` : la description des anciens agents Docker, qui n'existeront plus.

Et une chose à ne surtout pas oublier : **`secrets/`**. Il contient `master.key` et `hudson.util.Secret`, qui chiffrent tous les credentials enregistrés dans Jenkins. Sans eux, Jenkins démarre, affiche les credentials… et ne peut plus en déchiffrer aucun.

Les fichiers appartiennent ensuite à l'UID 1000, celui de l'utilisateur `jenkins` dans l'image officielle.

#### ⚙️ JCasC, seulement pour ce qui est nouveau

**Configuration as Code** (JCasC) décrit la configuration de Jenkins en YAML. Le chart Helm officiel l'active par défaut, avec une configuration complète : compte administrateur, stratégie d'autorisation, réglages globaux.

**Le piège** : appliquée sur un `JENKINS_HOME` existant, cette configuration par défaut **remplace** les comptes et les droits existants. On aurait perdu ses utilisateurs et ses autorisations au premier démarrage.

```hcl [terraform-homelab/jenkins.tf]
JCasC = {
  defaultConfig = false
  # Vides : sinon le chart génère quand même un compte admin et une stratégie d'accès
  securityRealm         = ""
  authorizationStrategy = ""
  configScripts = {
    kubernetes-cloud = yamlencode(local.jenkins_cloud)
  }
}
```

`defaultConfig = false` ne suffit pas : sans les deux chaînes vides, le chart génère **quand même** un compte et une stratégie. JCasC ne décrit donc qu'une seule chose, la **nouvelle** : le cloud Kubernetes et ses modèles d'agents. Les jobs, l'historique et les comptes restent dans le volume copié.

#### 🧩 Des agents en pods

Le plugin `kubernetes` crée **un pod par build**, à partir d'un modèle, et le supprime à la fin (`podRetention: never`). Deux modèles, un par image d'agent :

```hcl [terraform-homelab/jenkins.tf]
jenkins_cloud = {
  jenkins = {
    clouds = [{
      kubernetes = {
        name       = "kubernetes"
        namespace  = "jenkins"
        jenkinsUrl = "http://jenkins.jenkins.svc.cluster.local:8080"
        # Agents en WebSocket sur le port HTTP : pas de port 50000 à exposer
        webSocket       = true
        containerCapStr = "4"
        podRetention    = "never"
        templates = [
          { name = "agent-rails", label = "agent_rails_1", /* … */ },
          { name = "agent-vuejs", label = "agent_vuejs_1", /* … */ },
        ]
      }
    }]
  }
}
```

- **Les labels** (`agent_rails_1`, `agent_vuejs_1`) sont ceux des anciens agents : les `Jenkinsfile` n'ont pas besoin de changer de label.
- **WebSocket** : l'agent se connecte au contrôleur par le port HTTP, au lieu du port TCP 50000 habituel. Un port de moins à ouvrir.
- **Un pod d'agent vuejs** contient trois conteneurs : `jnlp` (l'agent, avec Node.js et pnpm), `buildkit` (pour construire les images) et `trivy` (pour les scanner). Les étapes du pipeline choisissent le conteneur avec `container('buildkit') { … }`.
- **Sans root** : UID 1000 pour tout le pod, aucune capacité, pas d'élévation de privilèges.

##### Les images d'agents

Les images `jenkins-agent-rails` et `jenkins-agent-vuejs` sont construites par GitHub Actions. Deux changements avant la migration :

- **plus de `sudo`**, ni de mot de passe dans l'image : un pod sans root ne s'en sert pas, et un `sudo` sans mot de passe annule tout le bénéfice du « sans root » ;
- **Ruby 3.2.2 préinstallé** dans l'image rails, à côté de la 3.3. Un agent éphémère repart de zéro à chaque build : sans ça, il recompilait Ruby à chaque fois.

**Le piège du tag `latest`.** Le workflow publie `latest`… mais seulement sur les **tags de version** (comportement de `docker/metadata-action`). Un simple push sur `main` publie `:main`. Le premier build dans k3s a donc tourné sur une image `latest` vieille de six semaines, sans les changements ci-dessus. On épingle une version (`v0.2.0`), et `alwaysPullImage: false` évite de retélécharger 1,4 Go à chaque build : l'image n'est tirée qu'une fois par nœud.

#### 🏗️ Construire des images sans Docker : BuildKit sans root

**BuildKit** est le moteur de construction qui se cache derrière `docker build`. Il sait tourner **seul**, sans démon Docker, et **sans root**, grâce aux *user namespaces* du noyau : à l'intérieur, il se croit root ; à l'extérieur, il n'est que l'UID 1000.

Le script `buildctl-daemonless.sh` démarre un démon BuildKit pour la durée d'une commande, puis l'arrête. Le conteneur `buildkit` du pod a juste besoin que le noyau le laisse créer ses propres espaces de noms :

```hcl [terraform-homelab/jenkins.tf]
{
  # BuildKit sans root : user namespaces, mais seccomp et
  # AppArmor doivent le laisser créer ses propres namespaces
  name = "buildkit"
  env  = [{ name = "BUILDKITD_FLAGS", value = "--oci-worker-no-process-sandbox" }]
  securityContext = {
    seccompProfile  = { type = "Unconfined" }
    appArmorProfile = { type = "Unconfined" }
  }
}
```

Le pipeline devient :

```groovy [Jenkinsfile]
container('buildkit') {
    // Identifiants ghcr.io dans un fichier temporaire, jamais dans la ligne de commande.
    // Guillemets simples : le jeton est lu par le shell, jamais interpolé par Groovy.
    sh '''
        umask 077
        mkdir -p "$WORKSPACE_TMP/docker"
        printf '{"auths":{"ghcr.io":{"auth":"%s"}}}' "$(printf '<compte>:%s' "$CR_PAT" | base64 -w0)" \
            > "$WORKSPACE_TMP/docker/config.json"
    '''
    sh """
        set +x
        # container() transmet l'environnement de l'agent (HOME=/home/jenkins, absent
        # de l'image BuildKit) : buildkitd sans root a besoin de son propre HOME
        HOME=/home/user DOCKER_CONFIG="\$WORKSPACE_TMP/docker" buildctl-daemonless.sh build \
            --frontend dockerfile.v0 \
            --local context=. \
            --local dockerfile=. \
            --opt filename=Dockerfile.prod \
            \$BUILD_ARGS \
            --import-cache type=registry,ref=${cache} \
            --export-cache type=registry,ref=${cache},mode=max \
            --output type=image,\\"name=${images}\\",push=true
    """
    sh 'rm -rf "$WORKSPACE_TMP/docker"'
}
```

##### Explications

- **Une seule commande construit et pousse** vers deux registries à la fois (`name=` contient les deux noms d'image, séparés par une virgule).
- **Le cache est dans le registry** (`--export-cache … mode=max`). Un agent éphémère n'a pas de cache local, puisqu'il repart de zéro à chaque build. Le cache vit donc à côté de l'image, sous le tag `buildcache`, et le build suivant le récupère.
- **Les identifiants** sont écrits dans un fichier temporaire en `umask 077`, supprimé à la fin, et lus par le **shell** (guillemets simples en Groovy). Avec des guillemets doubles, Groovy les aurait interpolés dans la commande, visible dans le journal et dans la liste des processus.
- **`set +x`** coupe la trace de `sh -xe` juste avant de construire les `--opt build-arg:…`, qui contiennent les variables du fichier d'environnement.

##### Le piège de `HOME`

Premier build : `buildkitd` ne démarre pas, et le journal ne dit rien d'utile. Reproduit dans un pod de test, la cause apparaît : `container('buildkit')` **transmet l'environnement de l'agent**, dont `HOME=/home/jenkins`. Ce dossier n'existe pas dans l'image BuildKit, et BuildKit sans root range son état sous `$HOME`. D'où le `HOME=/home/user` devant la commande.

> 💡 Quand un outil échoue sans message dans un pipeline, rejoue **la même commande** dans un pod de test avec la même image. Le pipeline ajoute toujours quelque chose (ici, son environnement) qu'on ne voit pas.

##### Un démarrage parfois trop lent

Un build a échoué plus tard avec `could not connect to unix:///run/user/1000/buildkit/buildkitd.sock after 10 trials`. C'était le **premier** build sur ce nœud : la préparation initiale de BuildKit a dépassé les 10 tentatives de `buildctl-daemonless.sh`. Un test sur le même nœud démarrait normalement, et le build relancé est passé. Si ça se reproduit, `BUILDCTL_CONNECT_RETRIES_MAX` permet d'allonger l'attente.

#### 🔎 Trivy lit l'image dans le registry

Dans l'épisode 5, Trivy scannait l'image dans le démon Docker local. Il n'y en a plus : il la lit **dans le registry**, où BuildKit vient de la pousser.

```groovy [Jenkinsfile]
container('trivy') {
    sh """
        trivy image --exit-code 0 --ignore-unfixed --no-progress --quiet \
            --format json --output trivy-image.json \
            registry.homelab.example/frontend:${tag}
    """
}
```

Bonus : on scanne exactement **l'image publiée**, pas une copie locale qui pourrait en différer. Le rapport part ensuite vers DefectDojo, comme avant, mais en HTTPS, puisque DefectDojo est passé derrière le certificat wildcard.

#### 🧠 Le piège de la mémoire de SonarQube

L'analyse SonarQube d'un projet Nuxt échouait par manque de mémoire, et augmenter la limite du conteneur n'y changeait rien. Cause : le scanner lance un Node.js pour analyser le JavaScript et le TypeScript, et lui donne **une part fixe** de la mémoire, plafonnée à **2 240 Mo**, quelle que soit la limite du conteneur. Il faut lui donner la mémoire explicitement :

```bash
sonar-scanner … -Dsonar.javascript.node.maxspace=4096
```

#### 🚚 Le déploiement qui ne déployait rien

Le pipeline se termine par un appel à l'API de Coolify, qui redéploie l'environnement de staging :

```groovy
curl -X POST 'http://coolify…/api/v1/deploy?tag=frontend-staging' --header "Authorization: Bearer $COOLIFY_TOKEN"
```

Le build était vert. Le staging, lui, n'avait pas bougé depuis des jours. Dans le journal, la réponse de Coolify :

```json
{"message":"No resources found with this tag."}
```

L'application portait le tag `staging`, le Jenkinsfile demandait `frontend-staging`. Coolify répondait poliment qu'il n'y avait rien à déployer, et `curl` sans option ne considère pas une réponse comme un échec. Le pipeline continuait donc.

```groovy [Jenkinsfile]
// Un tag inconnu renvoie « No resources found with this tag » : l'étape
// doit alors échouer, au lieu de laisser croire que le déploiement a eu lieu
sh """#!/bin/bash
    set -eo pipefail
    resp=\$(curl -sS --fail-with-body -X POST 'http://coolify…/api/v1/deploy?tag=${tag}' \
        --header "Authorization: Bearer \$COOLIFY_TOKEN")
    echo "\$resp"
    if echo "\$resp" | grep -q 'No resources found'; then exit 1; fi
"""
```

`--fail-with-body` fait échouer `curl` sur un code HTTP d'erreur tout en affichant la réponse, et le `grep` attrape le cas où Coolify répond « tout va bien, rien à faire ».

> 💡 Une étape qui ne peut pas échouer ne prouve rien. Même leçon sur un autre projet : son pipeline restait vert alors que 5 tests échouaient. Seul le journal le disait.

#### 📊 Les premiers builds

::tool-table
| Projet | Résultat | Ce qu'il a validé |
|---|---|---|
| backend Rails | ✅ | agent rails en pod, Ruby préinstallé, tests contre PostgreSQL |
| frontend Vue | ✅ | agent vuejs sans `sudo` |
| site Nuxt | ✅ en 18 min | BuildKit sans root, push vers deux registries, cache créé, Trivy depuis le registry, rapport dans DefectDojo |
::

Et l'ancien Jenkins ? Il est arrêté, pas supprimé, avec son `JENKINS_HOME` intact. On le supprime une fois la nouvelle installation éprouvée, comme le prévoit l'étape 8 de la méthode.

#### ✅ Conclusion

Le Jenkins du cluster est **plus sûr** que l'ancien, et pas seulement parce qu'il est dans Kubernetes : plus aucun agent n'a les droits root sur une machine, les images se construisent sans démon Docker, chaque build part d'un pod neuf, et les identifiants ne traversent plus la ligne de commande.

Les pièges, eux, avaient tous la même forme : **quelque chose d'invisible** qui différait de ce qu'on croyait. Une version mise à jour depuis l'interface, une variable d'environnement transmise sans le dire, un plafond de mémoire codé en dur, une image `latest` qui ne suivait pas `main`, un déploiement qui répondait « rien à faire ».

Prochain épisode : la dernière brique, et la plus sensible, PostgreSQL dans le cluster avec CloudNativePG.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
