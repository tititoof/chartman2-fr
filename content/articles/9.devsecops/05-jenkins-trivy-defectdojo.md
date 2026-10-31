---
title: "Lab DevSecOps (5/11) : envoyer les scans Trivy de Jenkins vers DefectDojo"
description: "Brancher un pipeline Jenkins sur DefectDojo : scan Trivy de l'image Docker en JSON, résumé dans le log, import automatique via l'API, sans jamais exposer le jeton. Et ce que révèle le premier scan."
icon: "i-mdi:pipe"
article_id: "05-devsecops-jenkins-trivy-defectdojo"
color: "orange"
draft: true
publishedAt: '2026-10-26'
---
#### 📌 Où on en est

À l'[épisode 4](/blog/article/04-devsecops-defectdojo-terraform-helm), DefectDojo s'est installé sur le cluster k3s du lab. Il reste à l'alimenter.

Le pipeline Jenkins de ce site scannait déjà son image Docker avec Trivy avant de la pousser, mais le résultat ne vivait que dans le log du build : illisible au-delà de quelques lignes, et perdu au build suivant. Cet épisode envoie chaque scan à DefectDojo, où les vulnérabilités sont conservées, dédoublonnées d'un build à l'autre et triées.

#### 🧭 Le chemin d'un scan

<mermaid>
graph LR
  Push["👩‍💻 git push develop"] --> Jenkins["🧰 Jenkins"]
  Jenkins --> Build["🐳 docker build"]
  Build --> Trivy["📦 Trivy<br/>JSON"]
  Trivy --> Log["📝 Résumé<br/>dans le log"]
  Trivy --> Art["🗄️ Artefact<br/>du build"]
  Trivy -->|"API reimport-scan"| DD["🛡️ DefectDojo"]
  Build --> Registry["📤 Registry"]
  Registry --> Coolify["🚀 Coolify"]
</mermaid>

Le scan reste **non bloquant** : il informe, il ne casse pas le déploiement. C'est un choix assumé pour commencer, on y revient en conclusion.

#### 🔍 Prérequis : l'agent peut-il joindre DefectDojo ?

DefectDojo n'est accessible que sur le réseau local. Avant d'écrire une ligne de pipeline, il faut vérifier que l'agent Jenkins, lui-même dans un conteneur Docker sur un autre serveur du homelab, peut le joindre :

```bash
docker exec jenkins_agent_vuejs sh -c '
  getent hosts defectdojo.homelab.example
  curl -s -o /dev/null -w "HTTP %{http_code}\n" http://defectdojo.homelab.example/login
  which curl python3 docker'
```

```text
192.168.1.20   bhaal.homelab.example defectdojo.homelab.example
HTTP 200
/usr/bin/curl
/usr/bin/python3
/usr/bin/docker
```

Le nom est résolu (par le Pi-hole, via le DNS interne de Docker), DefectDojo répond, et l'agent a les outils nécessaires.

#### 🔑 Le jeton d'API

Dans DefectDojo, le menu utilisateur → *API v2 Key* donne un jeton personnel. Dans Jenkins, il devient un credential de type *Secret text*, nommé `defectdojo-token`.

> 💡 Pour un vrai usage, mieux vaut un **utilisateur de service** dédié dans DefectDojo, avec les seuls droits d'import sur le produit concerné, plutôt que le jeton de l'administrateur. Si le jeton fuit, les dégâts sont limités à ce produit.

#### ⚙️ Le pipeline

Une fonction en tête du `Jenkinsfile`, appelée juste avant chaque `docker push` (image `staging` sur `develop`, `latest` sur `main`) :

```groovy [Jenkinsfile (extrait)]
// Scan Trivy de l'image, non bloquant, envoyé à DefectDojo (lab DevSecOps, épisode 5).
// Le rapport sort sur stdout : avec le socket Docker de l'hôte, un volume monté
// depuis le workspace de l'agent pointerait vers un dossier inexistant sur l'hôte.
def scanImageToDefectDojo(String image) {
    sh """
        docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            -v trivy-cache:/root/.cache/ \
            aquasec/trivy:0.76.1 image \
            --exit-code 0 \
            --ignore-unfixed \
            --no-progress \
            --quiet \
            --format json \
            ${image} > trivy-image.json
    """
    sh '''
        python3 -c 'import json, collections
d = json.load(open("trivy-image.json"))
c = collections.Counter(v["Severity"] for r in d.get("Results", []) for v in r.get("Vulnerabilities") or [])
print("Trivy (CVE corrigeables) :", dict(c) or "aucune")'
    '''
    archiveArtifacts artifacts: 'trivy-image.json', allowEmptyArchive: true
    withCredentials([string(credentialsId: 'defectdojo-token', variable: 'DD_TOKEN')]) {
        // Guillemets simples : le jeton est lu par le shell, jamais interpolé par Groovy
        sh '''
            curl -sS --fail-with-body -m 120 -o dd-response.json \
                -X POST "http://defectdojo.homelab.example/api/v2/reimport-scan/" \
                -H "Authorization: Token $DD_TOKEN" \
                -F "scan_type=Trivy Scan" \
                -F "file=@trivy-image.json" \
                -F "product_type_name=Sites web" \
                -F "product_name=chartman2.fr" \
                -F "engagement_name=CI $BRANCH_NAME" \
                -F "test_title=Image Docker" \
                -F "auto_create_context=true" \
                -F "close_old_findings=true" \
            && echo "Rapport envoyé à DefectDojo" \
            || echo "Envoi à DefectDojo échoué (non bloquant)"
        '''
    }
}
```

```groovy [Jenkinsfile (appel, branche develop)]
docker build ${buildArgs} -t registry.homelab.example/frontend-chartman2fr:staging ...
scanImageToDefectDojo('registry.homelab.example/frontend-chartman2fr:staging')
docker push registry.homelab.example/frontend-chartman2fr:staging
```

##### Explications

::tool-table
| Élément | Rôle |
|---------|------|
| `docker run … aquasec/trivy` | Trivy n'est pas installé dans l'agent : on lance son image officielle, à version figée, via le socket Docker de l'hôte |
| `-v trivy-cache:/root/.cache/` | Un volume Docker nommé garde la base de vulnérabilités entre deux builds : elle n'est pas retéléchargée à chaque fois |
| `> trivy-image.json` | Le rapport sort sur la **sortie standard**. Avec le socket de l'hôte, `-v $WORKSPACE:/src` monterait un chemin qui n'existe que dans le conteneur de l'agent, pas sur l'hôte : le fichier serait écrit ailleurs ou nulle part |
| `--ignore-unfixed` | Seules les CVE qui ont un correctif. Une alerte impossible à corriger ne fait que du bruit |
| Pas de `--severity` | Toutes les sévérités partent vers DefectDojo, où on filtre. Le tri se fait dans l'outil fait pour ça, pas dans le pipeline |
| Résumé Python | Une ligne lisible dans le log, au lieu de 500 Ko de JSON |
| `archiveArtifacts` | Le rapport brut reste attaché au build, même si DefectDojo est indisponible |
| `reimport-scan` | Contrairement à `import-scan`, qui crée un nouveau test à chaque fois, il **met à jour** le même test : les vulnérabilités déjà connues sont reconnues, les nouvelles ajoutées |
| `auto_create_context` | Le produit, son type et l'engagement sont créés au premier envoi : aucune préparation manuelle dans DefectDojo |
| `engagement_name=CI $BRANCH_NAME` | Un engagement par branche : `develop` et `main` ne se mélangent pas |
| `close_old_findings` | Une vulnérabilité absente du nouveau scan (paquet mis à jour) est **fermée** automatiquement |
| `\|\| echo …` | Si DefectDojo est arrêté, le build continue |
::

##### Le jeton et les guillemets

Le détail le plus important tient aux guillemets du dernier `sh`. En Groovy, `"""…${DD_TOKEN}…"""` remplace la variable **avant** de passer le script au shell : le jeton se retrouve en clair dans le script généré, sur le disque de l'agent. Jenkins le signale d'ailleurs par un avertissement. Avec `'''…$DD_TOKEN…'''`, Groovy ne touche à rien : c'est le shell qui lit la variable d'environnement au moment de l'exécution.

Résultat dans le log du build, où Jenkins masque la valeur :

```text
+ curl -sS --fail-with-body -m 120 -o dd-response.json -X POST http://defectdojo.homelab.example/api/v2/reimport-scan/ -H Authorization: Token **** -F scan_type=Trivy Scan ...
+ echo Rapport envoyé à DefectDojo
Rapport envoyé à DefectDojo
```

> ⚠️ En relisant le `Jenkinsfile` existant, j'ai trouvé ce mauvais schéma ailleurs : les jetons de Coolify et du registre GitHub y sont insérés par Groovy (`"""…${COOLIFY_TOKEN}…"""`). Même correction à faire, dans un commit à part.

#### 🚀 Le premier build

Push sur `develop`, build #94 :

```text
+ docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v trivy-cache:/root/.cache/ aquasec/trivy:0.76.1 image --exit-code 0 --ignore-unfixed --no-progress --quiet --format json registry.homelab.example/frontend-chartman2fr:staging
Unable to find image 'aquasec/trivy:0.76.1' locally
0.76.1: Pulling from aquasec/trivy
Status: Downloaded newer image for aquasec/trivy:0.76.1
Trivy (CVE corrigeables) : {'CRITICAL': 4, 'HIGH': 95, 'MEDIUM': 126, 'LOW': 23, 'UNKNOWN': 3}
[Pipeline] archiveArtifacts
Archiving artifacts
...
Rapport envoyé à DefectDojo
...
Finished: SUCCESS
```

Côté DefectDojo, tout a été créé au premier envoi :

::tool-table
| Objet | Valeur |
|-------|--------|
| Type de produit | Sites web |
| Produit | chartman2.fr |
| Engagement | CI develop (In Progress) |
| Test | Image Docker (Trivy Scan) |
| Vulnérabilités actives | 4 Critical, 95 High, 126 Medium, 23 Low, 3 Info |
::

Les 3 `UNKNOWN` de Trivy (CVE dont la sévérité n'est pas encore évaluée) deviennent `Info` dans DefectDojo.

#### 🧐 Ce que révèle le premier scan

**251 vulnérabilités corrigeables**, dont 4 critiques, dans l'image qui part en production. Le chiffre seul ne dit rien : DefectDojo enregistre pour chacune le composant et le fichier concernés, ce qui permet de les regrouper par origine.

::tool-table
| Origine | Critical | High | Medium | Low | Info | Total |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|
| Binaires **esbuild** (Go) dans `node_modules` | 2 | 51 | 72 | 8 | 2 | **135** |
| Paquets **Debian** de l'image de base | 2 | 24 | 36 | 9 | 1 | **72** |
| Dépendances **npm** | 0 | 20 | 18 | 6 | 0 | **44** |
::

Plus de la moitié des vulnérabilités viennent d'**esbuild**, l'outil qui compile le site au moment du build. Il n'a rien à faire dans l'image de production. Les 2 critiques concernent la bibliothèque standard de Go avec laquelle ses binaires ont été compilés. Parmi les dépendances npm, on trouve aussi `happy-dom`, une bibliothèque de **tests**.

La cause est une ligne du `Dockerfile.prod` :

```dockerfile [Dockerfile.prod (étape finale)]
COPY --from=build /app/.output /app/.output
COPY --from=build /app/node_modules ./node_modules
```

L'étape finale recopie **tout** `node_modules` depuis l'étape de build, outils de développement et de test compris. Or le serveur Nuxt tourne avec `node .output/server/index.mjs`, et le dossier `.output` embarque déjà les seules dépendances dont il a besoin à l'exécution. Retirer cette copie devrait faire disparaître d'un coup la majorité des alertes, à vérifier au prochain scan.

Les 2 autres critiques touchent ImageMagick (`imagemagick-6-common`, `libmagickcore`), une bibliothèque de traitement d'images installée dans l'image… alors que le site n'en appelle jamais directement. Elle arrive probablement comme dépendance de `libvips`, installé dans l'étape finale. Reste à vérifier si l'application a vraiment besoin de cette version système de `libvips`.

C'est exactement à ça que sert un outil de tri : sans ce regroupement, 251 lignes de CVE ressemblent à un problème insoluble. Avec, ce sont deux lignes de Dockerfile à revoir.

C'est aussi la justification du scan non bloquant au départ : avec `--exit-code 1` sur les critiques, ce build aurait échoué, et le site n'aurait plus pu être déployé tant que les 4 CVE n'étaient pas traitées, même pour corriger une faute de frappe.

#### 🔁 Le scan suivant

Les deux lignes ont été revues. L'étape finale ne copie plus `node_modules`, seulement `.output`. Et comme le site n'utilise jamais `NuxtImg`, `libvips` est parti aussi, et ImageMagick avec lui. Mesuré avec Trivy au moment du changement :

::tool-table
| Mesure | Avant | Après |
|---|:---:|:---:|
| CVE corrigeables | 251 | 4 |
| dont critiques | 4 | 0 |
| Taille de l'image | 1,19 Go | 332 Mo |
::

Le build suivant a envoyé son rapport sur le **même test** (`reimport-scan`), et `close_old_findings` a fermé tout ce que Trivy ne trouvait plus :

![DefectDojo - les vulnérabilités du premier scan, fermées par le réimport](/img/content/defectdojo-findings.png){ width=100% }

Les 251 restent dans l'historique, avec le statut **Mitigated** : on sait ce qui a été corrigé, et quand. C'est la différence entre un rapport qu'on lit une fois et un suivi.

#### ✅ Conclusion de la première étape

En cinq épisodes, un serveur du placard est devenu une petite plateforme DevSecOps, entièrement décrite dans un dépôt :

::tool-table
| Épisode | Outil | Ce qui est en place |
|---------|-------|---------------------|
| [1](/blog/article/01-devsecops-ansible-durcissement) | Ansible | Serveur durci : SSH par clé, UFW, fail2ban, mises à jour de sécurité |
| [2](/blog/article/02-devsecops-terraform-premiers-pas) | Terraform | Plan, état, dérive, import, et la preuve que Docker contourne UFW |
| [3](/blog/article/03-devsecops-k3s-ansible) | k3s + Ansible | Cluster Kubernetes, et la preuve que k3s passe aussi devant UFW |
| [4](/blog/article/04-devsecops-defectdojo-terraform-helm) | Terraform + Helm | DefectDojo, base externe, secrets hors de l'état Terraform |
| 5 | Jenkins | Chaque image scannée, chaque CVE centralisée et suivie |
::

Les prochaines étapes naturelles :

1. **Rendre le scan bloquant sur les CVE critiques**, maintenant que ce stock est traité : `--severity CRITICAL --exit-code 1`, en plus de l'envoi à DefectDojo.
2. **Ajouter les autres scanners** de l'[article sur la sécurité CI/CD](/blog/article/16-docker-cicd-securite) (Gitleaks, Opengrep…) : DefectDojo sait tous les importer.

Mais le plus utile de ce lab n'est pas dans la liste des outils. Ce sont les pannes : un DNS qui répond une fois sur six, une sonde qui tue l'application qu'elle surveille, un pare-feu que deux outils contournent sans le dire. Aucune ne figurait dans les tutoriels de départ, et ce sont elles qui reviennent en production.

##### La suite : tout le homelab

Ce lab tournait sur une seule machine, à côté des services du quotidien. La suite de la série déplace **tout le homelab** dans un cluster k3s à trois serveurs, en commençant comme ici : en mesurant avant de toucher à quoi que ce soit. Rendez-vous dans l'[épisode 6](/blog/article/06-devsecops-k3s-homelab).

---

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
