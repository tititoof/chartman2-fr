---
title: "CI/CD : ajouter la sécurité au pipeline Jenkins pour PHP, Ruby et JS"
description: "Secrets, failles dans le code, dépendances vulnérables, scan de l'application en ligne : comment ajouter Gitleaks, Opengrep, Brakeman, Trivy et Nuclei au pipeline Jenkins et centraliser les résultats dans SonarQube."
icon: "i-mdi:shield-check-outline"
article_id: "16-docker-cicd-securite"
color: "blue"
draft: true
publishedAt: '2026-10-13'
---
#### 📌 La qualité ne suffit pas

Dans la [démo CI/CD](/blog/article/14-docker-demo-cicd), chaque push passe par les tests, SonarQube et un Quality Gate. C'est une bonne base, mais elle laisse des angles morts :

* un **jeton d'API** commité par erreur, même supprimé au commit suivant, reste dans l'historique git ;
* une **gem ou un paquet npm** vulnérable passe inaperçu tant que le code qui l'utilise est propre ;
* une **injection SQL** propre à Rails ou à Laravel échappe aux règles génériques ;
* une **mauvaise configuration** (fichier `.env` exposé, en-tête manquant) ne se voit que sur l'application déployée.

J'ai d'abord regardé [VICE](https://github.com/Webba-Creative-Technologies/vice){:target="_blank"}, un outil tout-en-un séduisant : un score de 0 à 100, un audit du code, un scan du site en ligne. Mais son analyse de code ne couvre que JavaScript/TypeScript, et ses dépendances ne passent que par `npm audit`. Pour une stack qui mélange **PHP/Symfony, Ruby/Rails et JS/Nuxt**, aucun outil unique ne fait tout. La bonne réponse est une petite équipe d'outils spécialisés, tous open-source et auto-hébergeables.

#### 🧰 Les outils retenus

::tool-table
| Besoin | Outil | PHP / Symfony / Laravel | Ruby / Rails | JS / Nuxt |
|--------|-------|:---:|:---:|:---:|
| Secrets (code + historique git) | [Gitleaks](https://github.com/gitleaks/gitleaks){:target="_blank"} | ✅ | ✅ | ✅ |
| Failles dans le code (SAST) | [Opengrep](https://github.com/opengrep/opengrep){:target="_blank"} | ✅ | ✅ | ✅ |
| Dépendances vulnérables, Dockerfile, compose | [Trivy](https://github.com/aquasecurity/trivy){:target="_blank"} | ✅ `composer.lock` | ✅ `Gemfile.lock` | ✅ `pnpm-lock.yaml` |
| Analyse spécifique au framework | [Brakeman](https://brakemanscanner.org){:target="_blank"} · [Psalm](https://psalm.dev){:target="_blank"} | Psalm `--taint-analysis` | Brakeman | — |
| Scan de l'application déployée (DAST) | [Nuclei](https://github.com/projectdiscovery/nuclei){:target="_blank"} | indépendant du langage | | |
::

> 💡 **Pourquoi Opengrep plutôt que Semgrep ?** Opengrep est le fork communautaire (LGPL) de Semgrep, créé après le changement de licence des règles officielles fin 2024. Même syntaxe de règles, mêmes commandes, sans dépendance à une plateforme commerciale. Les règles se récupèrent depuis le dépôt `opengrep/opengrep-rules`.

Et surtout : tous ces outils savent exporter en **SARIF**, un format standard de rapport. SonarQube l'importe nativement. On garde donc **un seul tableau de bord et un seul Quality Gate**, ceux qui existent déjà, pour toutes les analyses du code. Seul Nuclei fait exception : il scanne l'application déployée, après le Quality Gate, et son rapport reste dans les artefacts Jenkins.

<mermaid>
graph LR
  Push["👩‍💻 git push"] --> Jenkins["🧰 Jenkins"]
  subgraph Agent["🐳 Agent Rails (sans socket Docker)"]
    GL["🔑 Gitleaks"]
    OG["🔍 Opengrep"]
    BM["💎 Brakeman"]
    TV["📦 Trivy"]
  end
  Jenkins --> Agent
  GL -->|SARIF| Sonar["📊 SonarQube<br/>Quality Gate"]
  OG -->|SARIF| Sonar
  BM -->|SARIF| Sonar
  TV -->|SARIF| Sonar
  Sonar --> NC["☢️ Nuclei<br/>sur la recette"]
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class GL,OG,BM,TV,Sonar,NC containerStyle;
</mermaid>

#### 🐳 Installer les outils dans l'agent Jenkins

Dans la démo, les agents Jenkins **n'ont pas accès au socket Docker** : impossible de lancer `docker run trivy …` depuis le pipeline. Les outils sont donc installés directement dans l'image de l'agent ([jenkins-agent-rails](https://github.com/tititoof/jenkins-agent-rails){:target="_blank"}).

Deux règles pour cette installation :

* **figer les versions** : un pipeline qui change d'outil à chaque build donne des résultats non reproductibles ;
* **vérifier les sommes de contrôle** : un outil de sécurité téléchargé sans vérification devient lui-même une porte d'entrée. Les outils de sécurité sont des cibles de choix pour les attaques de la chaîne d'approvisionnement.

```dockerfile [Dockerfile (extrait)]
USER root

# Opengrep plante (UnicodeDecodeError) sans locale UTF-8
ENV LANG=C.UTF-8 LC_ALL=C.UTF-8

ARG GITLEAKS_VERSION=8.30.1
ARG TRIVY_VERSION=0.74.0
ARG NUCLEI_VERSION=3.11.1
ARG OPENGREP_VERSION=1.30.0

RUN apt-get update && apt-get install -y --no-install-recommends unzip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp/tools

# Gitleaks : téléchargement + vérification de la somme de contrôle
RUN curl -sSLO https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz \
    && curl -sSLO https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_checksums.txt \
    && grep " gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz$" gitleaks_${GITLEAKS_VERSION}_checksums.txt | sha256sum -c - \
    && tar -xzf gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz -C /usr/local/bin gitleaks

# Trivy et Nuclei : même principe (archive + checksums.txt),
# voir le Dockerfile complet dans le dépôt jenkins-agent-rails
# ...

# Opengrep : binaire autonome + règles communautaires
RUN curl -sSL -o /usr/local/bin/opengrep \
      https://github.com/opengrep/opengrep/releases/download/v${OPENGREP_VERSION}/opengrep_manylinux_x86 \
    && chmod +x /usr/local/bin/opengrep \
    && git clone --depth 1 https://github.com/opengrep/opengrep-rules /opt/opengrep-rules \
    && rm -rf /opt/opengrep-rules/.git

WORKDIR /
RUN rm -rf /tmp/tools

USER jenkins

# Brakeman dans le Ruby de RVM
RUN bash -c "source \$HOME/.rvm/scripts/rvm && gem install brakeman --no-document"

# Base de vulnérabilités et templates pré-téléchargés : builds plus rapides
RUN trivy fs --download-db-only --cache-dir /home/jenkins/.cache/trivy \
    && nuclei -update-templates -silent
```

> 💡 La base de vulnérabilités de Trivy évolue tous les jours. La pré-télécharger dans l'image accélère les builds, mais il faut **reconstruire l'image régulièrement** (un build planifié chaque semaine suffit), sinon les nouvelles CVE ne sont jamais détectées.

#### ⚙️ Le pipeline

Les quatre analyses statiques tournent **en parallèle**, avant les tests. Elles ne dépendent pas les unes des autres, et le temps total reste celui de la plus lente.

```groovy [Jenkinsfile]
pipeline {
  agent { node { label 'agent_rails_1' } }

  environment {
    // harpers/todo-backend/develop -> harpers-todo-backend
    PROJECT_KEY = "${env.JOB_NAME.split('/')[0]}-${env.JOB_NAME.split('/')[1]}"
    REPORTS     = 'reports'
    RULES_DIR   = '/opt/opengrep-rules'
    LANG        = 'C.UTF-8'
    LC_ALL      = 'C.UTF-8'
    RECETTE_URL = ''   // vide = pas de scan dynamique
  }

  stages {
    stage('Checkout') {
      steps { checkout scm; sh 'mkdir -p ${REPORTS}' }
    }
    stage('Install') {
      steps { sh 'bundle install --jobs 4' }
    }

    stage('Sécurité') {
      parallel {
        stage('Secrets (Gitleaks)') {
          steps {
            script {
              // Un secret dans le code ou l'historique bloque toujours le build
              def rc = sh(returnStatus: true, script: '''
                gitleaks git --redact --no-banner \
                  --report-format sarif --report-path ${REPORTS}/gitleaks.sarif .
              ''')
              if (rc != 0) { error('Gitleaks : secret détecté') }
            }
          }
        }
        stage('SAST (Opengrep)') {
          steps {
            sh '''
              opengrep scan --quiet \
                --config ${RULES_DIR}/ruby --config ${RULES_DIR}/yaml \
                --sarif-output=${REPORTS}/opengrep.sarif .
            '''
          }
        }
        stage('Rails (Brakeman)') {
          steps {
            sh 'brakeman --no-pager --quiet --no-exit-on-warn -f sarif -o ${REPORTS}/brakeman.sarif'
          }
        }
        stage('Dépendances & IaC (Trivy)') {
          steps {
            sh '''
              trivy fs --scanners vuln,misconfig \
                --severity MEDIUM,HIGH,CRITICAL --ignore-unfixed \
                --exit-code 0 --format sarif --output ${REPORTS}/trivy.sarif .
            '''
          }
        }
      }
    }

    stage('Tests') {
      steps { sh 'bundle exec rspec' }
    }

    stage('SonarQube') {
      steps {
        withSonarQubeEnv('sonarqube-server') {
          sh '''
            SARIF=$(ls ${REPORTS}/*.sarif | paste -sd, -)
            sonar-scanner/bin/sonar-scanner \
              -Dsonar.projectKey=${PROJECT_KEY} \
              -Dsonar.sarifReportPaths=${SARIF}
          '''
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 1, unit: 'HOURS') { waitForQualityGate abortPipeline: true }
      }
    }

    stage('Scan dynamique (Nuclei)') {
      when { allOf { branch 'develop'; expression { env.RECETTE_URL?.trim() } } }
      steps {
        sh '''
          nuclei -u ${RECETTE_URL} -silent -no-color \
            -severity medium,high,critical -etags intrusive,dos,fuzz \
            -rate-limit 20 -sarif-export ${REPORTS}/nuclei.sarif
        '''
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'reports/*.sarif', allowEmptyArchive: true
      cleanWs()
    }
  }
}
```

##### Explications

::tool-table
| Choix | Pourquoi |
|-------|----------|
| Gitleaks bloquant, les autres non | Un secret commité doit être **révoqué** immédiatement, ce n'est pas négociable. Pour les autres alertes, c'est le Quality Gate qui tranche |
| `--redact` (Gitleaks) | Le secret n'apparaît ni dans les logs Jenkins ni dans le rapport |
| `--scanners vuln,misconfig` (Trivy) | Le scanner de secrets de Trivy est désactivé : Gitleaks s'en charge déjà, inutile d'avoir chaque alerte en double |
| `--ignore-unfixed` (Trivy) | Seules les CVE qui ont un correctif sont remontées. Une alerte impossible à corriger ne fait que du bruit |
| `--no-exit-on-warn` (Brakeman) | Brakeman renvoie un code d'erreur dès qu'il trouve un avertissement. On le laisse produire son rapport, et SonarQube décide |
| `sonar.sarifReportPaths` | Importe tous les rapports SARIF dans SonarQube comme des « problèmes externes » |
| Nuclei après le Quality Gate | Il analyse l'application **déployée** sur la recette, pas le code : inutile de le lancer si le build est déjà refusé |
| `-etags intrusive,dos,fuzz` (Nuclei) | Exclut les modèles qui modifient des données ou chargent le serveur |
::

> ⚠️ **Nuclei ne se lance que sur vos propres environnements.** Scanner un domaine tiers sans autorisation écrite peut tomber sous le coup de la loi (articles 323-1 et suivants du Code pénal), même « pour voir ».

#### 🔄 Adapter à PHP et à JS

Seuls les outils propres au langage changent, le reste du pipeline est identique :

::tool-table
| Stack | Opengrep (`--config`) | Outil spécifique | Trivy lit |
|-------|-----------------------|------------------|-----------|
| Rails | `ruby`, `yaml` | `brakeman -f sarif` | `Gemfile.lock` |
| Symfony / Laravel | `php`, `yaml` | `psalm --taint-analysis --report=psalm.sarif`, `composer audit` | `composer.lock` |
| Nuxt | `javascript`, `typescript`, `yaml` | `pnpm audit` (redondant avec Trivy, optionnel) | `pnpm-lock.yaml` |
::

> 💡 Psalm détecte le format de sortie à partir de l'extension du fichier : `--report=psalm.sarif` produit directement du SARIF.

#### 🧪 Premier essai

Avant de toucher au pipeline, j'ai validé les outils sur un mini-projet Rails volontairement vulnérable : un contrôleur avec une requête SQL construite par interpolation et une redirection vers un paramètre, un `Gemfile.lock` avec une vieille version de `rack`, et un faux jeton GitHub commité.

```ruby [app/controllers/users_controller.rb]
class UsersController < ApplicationController
  def show
    @user = User.where("name = #{params[:name]}").first  # injection SQL
    redirect_to params[:url]                              # redirection ouverte
  end
end
```

::tool-table
| Outil | Ce qu'il a trouvé |
|-------|-------------------|
| Opengrep | `tainted-sql-string` et `avoid-redirect` (règles Rails) |
| Brakeman | Injection SQL et redirection ouverte, plus un avertissement supplémentaire propre au framework |
| Gitleaks | `github-pat` : le jeton GitHub, masqué dans le rapport |
| Trivy | Plusieurs CVE sur `rack 2.2.3` (dont CVE-2022-30122 et CVE-2022-30123) |
::

Chaque outil a trouvé ce qu'on attendait de lui. Opengrep et Brakeman se recoupent sur les failles Rails. C'est normal, et SonarQube les affichera côte à côte : c'est au moment du tri qu'on décide lequel garder.

##### Sur le vrai backend de la démo

Même chose ensuite sur [harpers/todo-backend](https://moradin.chartman2-fr.ovh/harpers/todo-backend){:target="_blank"}, dans l'image de l'agent Jenkins :

::tool-table
| Outil | Résultats | Ce qu'il a trouvé |
|-------|:---:|-------------------|
| Gitleaks | 0 | Aucun secret, ni dans le code ni dans l'historique |
| Brakeman | 0 | Rien à signaler |
| Opengrep | 6 | 3 actions GitHub non épinglées sur un SHA de commit ; un `find(...)` non restreint à l'utilisateur dans `scopes_controller.rb` ; `consider_all_requests_local` activé en développement et en test |
| Trivy | 10 | 4 CVE corrigeables (`activestorage`, `devise` ×2, `json`) ; 6 mauvaises pratiques dans les Dockerfile de développement (pas d'utilisateur non root, `sudo`) |
::

Les deux résultats les plus intéressants sont ceux qu'aucun outil de qualité ne remontait :

* **les dépendances** : quatre montées de version à faire, dont une CVE de sévérité haute sur `activestorage` ;
* **le `find` non restreint** : c'est typiquement une faille d'accès (IDOR), où un utilisateur lit la ressource d'un autre en changeant l'identifiant dans l'URL. Il faut vérifier dans le code si l'accès est contrôlé ailleurs, mais c'est exactement le genre d'alerte qui mérite une relecture humaine.

À l'inverse, `consider_all_requests_local` en développement et en test est le comportement normal de Rails : c'est un **faux positif** à exclure. La première exécution sert aussi à ça, régler le bruit avant de rendre le Quality Gate bloquant.

#### 🐛 Ce qui n'a pas marché du premier coup

::tool-table
| Symptôme | Cause | Correction |
|----------|-------|------------|
| Opengrep s'arrête avec le code `2` et aucun rapport | `UnicodeDecodeError` : une règle YAML contient un caractère non ASCII, et l'image n'a pas de locale UTF-8 | `LANG=C.UTF-8` et `LC_ALL=C.UTF-8`, dans l'image **et** dans le pipeline |
| `--metrics=off` refusé par Opengrep | Option héritée de Semgrep, absente du fork | Retirer l'option |
| `--sarif --output fichier` ne produit rien | Syntaxe de Semgrep, pas celle d'Opengrep | `--sarif-output=fichier` |
| La construction de l'image échoue sur `rvm install` après le retrait de `sudo` | RVM lance lui-même un `apt-get update` via `sudo` pour vérifier les dépendances : c'était la seule raison d'être du `sudo` dans l'agent | `rvm autolibs disable` avant `rvm install` : les dépendances sont déjà installées par l'`apt-get` du Dockerfile |
::

> 💡 En ajoutant ces outils, j'en ai profité pour retirer le `sudo` sans mot de passe de l'image de l'agent. Un agent exécute le code de n'importe quel pipeline : il ne doit pas pouvoir devenir root.

> 💡 Le premier réflexe face à un code de sortie inattendu : relancer la commande **à la main, sans `--quiet`** et sans rediriger la sortie. L'erreur `UnicodeDecodeError` était invisible dans le pipeline, et évidente en direct.

#### 📊 Dans SonarQube

Les rapports importés apparaissent dans l'onglet *Issues* du projet, sous forme de **problèmes externes**, avec le nom de l'outil d'origine (par exemple `external_brakeman`). Ils sont comptés comme les problèmes détectés par SonarQube lui-même, et donc pris en compte par le Quality Gate sur le nouveau code.

<!-- TODO capture : onglet Issues avec les problèmes externes Gitleaks / Brakeman / Trivy → /img/content/sonar-external-issues.png -->

> ⚠️ À vérifier sur votre version de SonarQube : le traitement des problèmes externes (sévérité, possibilité de les marquer comme faux positifs) a évolué d'une version à l'autre. Faites un essai sur une branche avant de rendre le Quality Gate bloquant.

#### ✅ Conclusion

Un outil tout-en-un comme VICE est rassurant : un seul score, un seul rapport. Mais dès que la stack mélange plusieurs langages, il faut accepter d'assembler des outils spécialisés : chacun fait une seule chose, et la fait bien.

L'essentiel est ailleurs : **toutes les analyses du code convergent vers le même Quality Gate**. Un développeur ne consulte pas cinq rapports. Il voit un pipeline vert ou rouge, et un seul endroit où comprendre pourquoi.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::
