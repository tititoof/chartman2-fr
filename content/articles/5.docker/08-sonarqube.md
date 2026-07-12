---
title: "Docker – SonarQube"
description: "Découvrez comment installer et configurer SonarQube avec Docker : analyse de qualité de code, Quality Gate, intégration Jenkins et base PostgreSQL pour une CI/CD automatisée."
icon: "i-mdi:docker"
article_id: "8-docker-sonarqube-init"
color: "blue"
draft: false
publishedAt: '2026-07-08'
---
#### 📌 SonarQube ![SonarQube](/img/sonarqube.png){ width=30px }

[SonarQube](https://www.sonarqube.org){:target="_blank"} est la référence open-source pour
l'analyse continue de la qualité du code. Il détecte bugs, vulnérabilités et mauvaises pratiques
avant qu'ils n'atteignent la production.

- **Analyse statique** : bugs, vulnérabilités, duplications, code smells
- **Intégration CI/CD** : Jenkins, GitLab, GitHub Actions, Forgejo… via webhooks ou API
- **Tableaux de bord** : métriques clés, tendances, rapports par module et par règle
- **Quality Gate** : bloque le déploiement si le code ne respecte pas vos seuils de qualité
- **Sécurité & conformité** : règles personnalisées, gestion des droits, scans de dépendances
- **Mode Community** : entièrement gratuit et auto-hébergé

Dans notre stack, SonarQube s'intercale entre les tests Jenkins et le déploiement Coolify :
un build ne passe en production que si la Quality Gate est verte.

#### 🏗️ Architecture

SonarQube fonctionne avec deux composants :

- **Le serveur SonarQube** : interface web, moteur d'analyse, stockage des résultats
- **Une base PostgreSQL** : persistance des métriques, historique, configuration

L'analyse du code est déclenchée depuis Jenkins via le **sonar-scanner** installé sur l'agent.
SonarQube reçoit le rapport, l'analyse, puis renvoie le résultat de la Quality Gate à Jenkins
via un webhook.

<mermaid>
graph LR
  Jenkins["🧰 Jenkins\nAgent"] -->|sonar-scanner| SonarQube["📊 SonarQube\n:9000"]
  SonarQube -->|Quality Gate result| Jenkins
  SonarQube --> PostgreSQL["🗄️ PostgreSQL\n:5432"]
  Navigateur["🌍 Navigateur\nhttps://sonarqube.domain.tld"] -->|HTTPS 443| Traefik["🚦 Traefik"]
  Traefik --> SonarQube
  subgraph DH["🐳 Docker Host"]
    subgraph local_dev["🌐 local_dev (Docker network)"]
      Traefik
      SonarQube
      PostgreSQL
    end
  end
  classDef cluster fill:#41dcce,stroke:#333,stroke-width:1.5px,rx:10,ry:10;
  class Navigateur,DH cluster;
  classDef containerStyle fill:#ffd,stroke:#dd0,stroke-width:2px;
  class Traefik,SonarQube,PostgreSQL,Jenkins containerStyle;
</mermaid>

#### ⚙️ Exemple

Voici un `docker-compose.yml` qui lance SonarQube derrière Traefik :

> ⚠️ SonarQube est gourmand en mémoire. Prévoyez **au minimum 2 Go de RAM** dédiés
> au conteneur. Sur Linux, augmentez également la limite système :
> ```bash
> sudo sysctl -w vm.max_map_count=524288
> sudo sysctl -w fs.file-max=131072
> ```
> Pour rendre ces réglages permanents, ajoutez-les dans `/etc/sysctl.conf`.

```yml [docker-compose.yml]
services:
  traefik:
    restart: unless-stopped
    image: traefik:v3
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    labels:
      - "traefik.http.services.traefik.loadbalancer.server.port=8080"
    volumes:
      - ./.docker/traefik/traefik.yml:/etc/traefik/traefik.yml
      - ./.docker/traefik/tls.yml:/etc/traefik/tls.yml
      - /var/run/docker.sock:/var/run/docker.sock
      - ./.docker/ovh/etc/letsencrypt/archive/:/etc/ssl/traefik
    command:
      - "--global.sendAnonymousUsage"
      - "--log.level=INFO"
      - "--api.insecure=true"
      - "--api=true"
      - "--api.dashboard=true"
      - "--providers.docker.endpoint=unix:///var/run/docker.sock"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
      - "--entrypoints.web.http.redirections.entryPoint.scheme=https"
      - "--entrypoints.web.http.redirections.entrypoint.permanent=true"
    networks:
      - local_dev

  sonarqube:
    image: sonarqube:community
    container_name: sonarqube
    restart: unless-stopped
    environment:
      - SONAR_JDBC_URL=jdbc:postgresql://sonarqube-db:5432/sonar
      - SONAR_JDBC_USERNAME=${SONAR_DB_USERNAME}
      - SONAR_JDBC_PASSWORD=${SONAR_DB_PASSWORD}
    ports:
      - "${SONARQUBE_PORT:-9000}:9000"
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_extensions:/opt/sonarqube/extensions
      - sonarqube_logs:/opt/sonarqube/logs
    labels:
      - "traefik.enable=true"

      # HTTP → HTTPS redirection
      - "traefik.http.middlewares.sonarqube-redirect.redirectscheme.scheme=https"

      # HTTP
      - "traefik.http.routers.sonarqube.rule=Host(`${SONARQUBE_HOST}`)"
      - "traefik.http.routers.sonarqube.entrypoints=http"
      - "traefik.http.routers.sonarqube.middlewares=sonarqube-redirect"

      # HTTPS
      - "traefik.http.routers.sonarqube-secure.service=sonarqube-secure"
      - "traefik.http.routers.sonarqube-secure.rule=Host(`${SONARQUBE_HOST}`)"
      - "traefik.http.routers.sonarqube-secure.entrypoints=https"
      - "traefik.http.routers.sonarqube-secure.tls=true"

      # Port interne
      - "traefik.http.services.sonarqube-secure.loadbalancer.server.port=9000"
    networks:
      - local_dev
    depends_on:
      sonarqube-db:
        condition: service_healthy

  sonarqube-db:
    image: postgres:17
    container_name: sonarqube-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=sonar
      - POSTGRES_USER=${SONAR_DB_USERNAME}
      - POSTGRES_PASSWORD=${SONAR_DB_PASSWORD}
    volumes:
      - sonarqube_db:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${SONAR_DB_USERNAME} -d sonar']
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - local_dev

networks:
  local_dev:
    driver: bridge

volumes:
  sonarqube_data:
  sonarqube_extensions:
  sonarqube_logs:
  sonarqube_db:
```

```bash [.env]
SONARQUBE_HOST=sonarqube.domain.tld
SONARQUBE_PORT=9000
SONAR_DB_USERNAME=sonar
SONAR_DB_PASSWORD=superSecretPwd
```

> 💡 Les variables `SONAR_JDBC_URL` et `SONAR_JDBC_USERNAME` sont les noms officiels
> reconnus par l'image Docker SonarQube. Évitez `SONARQUBE_JDBC_*` qui ne sont pas
> toujours pris en charge selon les versions.


#### 🚀 Premier démarrage

```bash
docker compose up -d
```

Rendez-vous sur `https://sonarqube.domain.tld`. Les identifiants par défaut sont `admin` / `admin` — SonarQube vous demandera de les changer dès la première connexion.

![Sonarqube - Login](/img/content/sonarqube-login.png)

![Sonarqube - Login](/img/content/sonarqube-projects.png)

#### 🔑 Générer un token SonarQube

Jenkins a besoin d'un token pour s'authentifier auprès de SonarQube.

Dans SonarQube → **My Account** → **Security** → **Generate Token** :

- Name : `jenkins`
- Type : `Global Analysis Token`
- Expiration : selon votre politique de sécurité

Copiez ce token — il ne sera affiché qu'une seule fois. Enregistrez-le dans Jenkins sous
l'ID `sonarqube-token` (**Manage Jenkins** → **Credentials**).

![Sonarqube - Tokens](/img/content/sonarqube-tokens.png)

#### 🔌 Intégration Jenkins

##### 1. Installer le plugin SonarQube Scanner

Dans **Manage Jenkins** → **Plugins** → **Available plugins**, recherchez
`SonarQube Scanner` et installez-le.

##### 2. Déclarer le scanner dans Jenkins

Dans **Manage Jenkins** → **Tools** → section **SonarQube Scanner** → **Add** :

- Name : `sonarqube-scanner` (ce nom est référencé dans le Jenkinsfile via `tool 'sonarqube-scanner'`)
- Cochez **Install automatically**

##### 3. Déclarer le serveur SonarQube dans Jenkins

Dans **Manage Jenkins** → **System** → section **SonarQube servers** :

- Name : `sonarqube-server`
- Server URL : `https://sonarqube.domain.tld`
- Server authentication token : sélectionnez le credential `sonarqube-token`

![Sonarqube - Tokens](/img/content/jenkins-sonarqube-plugins.png)

##### 4. Ajouter les credentials dans Jenkins

Dans **Manage Jenkins** → **Credentials** → **Global** → **Add** :

::tool-table
| ID | Type | Valeur |
|----|------|--------|
| `sonarqube-server` | Secret text | URL de votre instance (`https://sonarqube.domain.tld`) |
| `sonarqube-token` | Secret text | Token généré dans SonarQube (**My Account** → **Security** → **Generate Token**) |
::

##### 5. Configurer le webhook SonarQube → Jenkins

Pour que `waitForQualityGate()` fonctionne, SonarQube doit rappeler Jenkins après
chaque analyse.

Dans SonarQube → **Administration** → **Configuration** → **Webhooks** → **Create** :

- Name : `Jenkins`
- URL : `https://jenkins.domain.tld/sonarqube-webhook/`
- Secret : (optionnel, recommandé en production)

##### 6. Le stage SonarQube dans le Jenkinsfile

```groovy [Jenkinsfile]
stage('SonarQube Quality Gate') {
    steps {
        echo 'Check quality..'
        script {
            def scannerHome = tool 'sonarqube-scanner'
            def sonarqubeBranch = 'frontend-chartman2-fr.ovh'
            withCredentials([string(credentialsId: 'sonarqube-server', variable: 'SONAR_URL')]) {
                withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_CREDENTIALS')]) {
                    withSonarQubeEnv() {
                        if (env.BRANCH_NAME == 'main') {
                            sonarqubeBranch = 'frontend-chartman2-fr.ovh'
                        }
                        sh "${scannerHome}/bin/sonar-scanner \
                            -Dsonar.projectKey=${sonarqubeBranch} \
                            -Dsonar.sources='pages,layouts,components,stores,composables' \
                            -Dsonar.exclusions=public/**/* \
                            -Dsonar.host.url=${SONAR_URL} \
                            -Dsonar.token=${SONAR_CREDENTIALS} \
                            -Dsonar.testExecutionReportPaths=sonar-report.xml \
                            -Dsonar.javascript.lcov.reportPaths=./coverage/lcov.info"
                    }
                }
            }
        }
    }
}

stage('Quality Gate') {
    steps {
        script {
            withSonarQubeEnv() {
                sleep(10)
                def qualitygate = waitForQualityGate()
                if (qualitygate.status != 'OK') {
                    env.WORKSPACE = pwd()
                    error "Pipeline aborted due to quality gate failure: ${qualitygate.status}"
                }
            }
        }
    }
}
```

> 💡 Le `sleep(10)` laisse le temps à SonarQube de traiter l'analyse avant que Jenkins
> n'interroge le webhook. Si votre projet est volumineux, augmentez cette valeur.

> 💡 `sonar.login` est déprécié depuis SonarQube 10.x au profit de `sonar.token`.
> Si vous utilisez SonarQube 10+, remplacez :
> ```
> -Dsonar.login=${SONAR_CREDENTIALS}
> ```
> par :
> ```
> -Dsonar.token=${SONAR_CREDENTIALS}
> ```

**Ce que fait ce pipeline :**

::tool-table
| Paramètre | Rôle |
|-----------|------|
| `tool 'sonarqube-scanner'` | Utilise le scanner déclaré dans les outils Jenkins |
| `sonar.projectKey` | Identifiant du projet dans SonarQube — doit correspondre à la clé créée dans l'UI |
| `sonar.sources` | Répertoires analysés (ici les dossiers Nuxt.js) |
| `sonar.exclusions` | Fichiers ignorés (assets publics) |
| `sonar.testExecutionReportPaths` | Rapport de tests généré par `pnpm run test:ci-cd` |
| `sonar.javascript.lcov.reportPaths` | Rapport de couverture de code |
| `waitForQualityGate()` | Bloque le pipeline jusqu'au retour du webhook SonarQube |
| `abortPipeline` via `error` | Annule le build si la Quality Gate échoue |
::

![Sonarqube - Login](/img/content/sonarqube-project-view.png)


#### 🎯 Configurer la Quality Gate

La Quality Gate par défaut (Sonar Way) est un bon point de départ. Pour la personnaliser :

Dans SonarQube → **Quality Gates** → **Create** :

::tool-table
| Métrique | Condition recommandée |
|----------|----------------------|
| Coverage | > 80 % sur le nouveau code |
| Duplications | < 3 % sur le nouveau code |
| Bugs | = 0 sur le nouveau code |
| Vulnerabilities | = 0 sur le nouveau code |
| Security Hotspots reviewed | = 100 % |
::

Assignez ensuite cette Quality Gate à vos projets dans
**Project Settings** → **Quality Gate**.

#### 📬 Intégration Mailpit — notifications de qualité

SonarQube envoie des emails pour signaler les changements d'état
de la Quality Gate et les nouvelles issues détectées.
Mailpit les intercepte en développement.

La configuration se fait dans **Administration → Configuration →
General Settings → Email** :

::tool-table
| Champ | Valeur |
|-------|--------|
| SMTP host | `mailpit.domaine.tldt` |
| SMTP port | `1025` |
| SMTP username | *(vide)* |
| SMTP password | *(vide)* |
| From address | `sonarqube@domain.tld` |
| From name | `SonarQube` |
| Secure connection | Aucune |
::

![Sonarqube - Mailpit](/img/content/sonarqube-mailpit.png)

Pour tester : **Administration → Configuration → General Settings →
Email → Test configuration** — un email de test apparaît
immédiatement dans Mailpit.


![Sonarqube - Mailpit](/img/content/sonarqube-email-test.png)

Les notifications que vous verrez dans Mailpit :

::tool-table
| Événement | Déclencheur |
|-----------|-------------|
| Quality Gate — Failed | Le seuil de qualité n'est plus respecté |
| Quality Gate — Passed | Retour au vert après un échec |
| New issues | Nouvelles vulnérabilités ou bugs détectés |
| Issue assigned | Une issue vous est assignée |
| Comment | Un commentaire ajouté sur une issue |
::

Chaque utilisateur SonarQube peut également configurer
ses propres préférences de notification dans
**My Account → Notifications**.

#### 🗂️ Structure des fichiers

```
.
├── docker-compose.yml
├── .env
└── .docker/
└── traefik/
├── traefik.yml
└── tls.yml
```

> 💡 Les données SonarQube sont stockées dans des volumes Docker nommés
> (`sonarqube_data`, `sonarqube_db`…) plutôt que des bind mounts — plus simple
> à gérer pour un outil dont vous n'avez pas besoin d'accéder directement aux fichiers.

#### ✅ Conclusion

SonarQube referme la boucle qualité de notre stack CI/CD : le code est analysé à chaque
push, les métriques s'accumulent dans le temps, et aucun build défaillant ne peut atteindre
la production grâce à la Quality Gate.

Combiné à Jenkins pour le déclenchement et Forgejo pour le versioning, SonarQube devient
le gardien silencieux de votre codebase — sans intervention manuelle, sans oublier une
vérification.

Dans le prochain article, nous verrons comment mettre en place [OpenProject](/blog/article/10-docker-openproject-init) — la plateforme de gestion de projets self-hosted qui centralisera le suivi de vos tâches, liera vos commits Forgejo à vos issues.

---

#####

::right-note
Cet article a été rédigé avec l'assistance d'IA.
::