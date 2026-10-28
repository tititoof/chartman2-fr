// Scan Trivy de l'image, non bloquant, envoyé à DefectDojo (lab DevSecOps, épisode 5).
// L'image est lue dans le registry, où BuildKit vient de la pousser : l'agent
// n'a plus de démon Docker local.
def scanImageToDefectDojo(String image) {
    container('trivy') {
        sh """
            trivy image \
                --exit-code 0 \
                --ignore-unfixed \
                --no-progress \
                --quiet \
                --format json \
                --output trivy-image.json \
                ${image}
        """
    }
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
                -X POST "http://defectdojo.chartman2-fr.ovh/api/v2/reimport-scan/" \
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

// Construit l'image avec BuildKit sans root (conteneur buildkit du pod), la pousse
// vers le registry du homelab et vers ghcr.io, puis la scanne.
def buildAndPushImage(String tag) {
    def images = "registry.chartman2-fr.ovh/frontend-chartman2fr:${tag},ghcr.io/tititoof/frontend-chartman2fr:${tag}"
    def cache = 'registry.chartman2-fr.ovh/frontend-chartman2fr:buildcache'
    withCredentials([
        file(credentialsId: 'frontend-chartman2-fr-env', variable: 'ENV_FILE'),
        string(credentialsId: 'ghcr-token', variable: 'CR_PAT'),
    ]) {
        container('buildkit') {
            // Identifiants ghcr.io dans un fichier temporaire, jamais dans la ligne de commande.
            // Guillemets simples : le jeton est lu par le shell, jamais interpolé par Groovy.
            sh '''
                umask 077
                mkdir -p "$WORKSPACE_TMP/docker"
                printf '{"auths":{"ghcr.io":{"auth":"%s"}}}' "$(printf 'tititoof:%s' "$CR_PAT" | base64 -w0)" \
                    > "$WORKSPACE_TMP/docker/config.json"
            '''
            // Les variables du fichier d'environnement deviennent des build-args, sans être
            // affichées : set +x coupe la trace de « sh -xe », qui montrerait leurs valeurs
            sh """
                set +x
                BUILD_ARGS=\$(grep -vE '^[[:space:]]*#|^[[:space:]]*\$' "\$ENV_FILE" | sed 's/^/--opt build-arg:/' | tr '\\n' ' ')
                DOCKER_CONFIG="\$WORKSPACE_TMP/docker" buildctl-daemonless.sh build \
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
    }
    scanImageToDefectDojo("registry.chartman2-fr.ovh/frontend-chartman2fr:${tag}")
}

pipeline {
    agent {
        node {
            label 'agent_vuejs_1'
        }
    }

    stages {
        stage('Build') {
            steps {
                script {
                    echo 'Building..'
                    sh('''
                        rm -Rf ./node_modules
                        pnpm install
                        pnpm build
                    ''')

                }
            }
        }
        stage('Test') {
            steps {
                 echo 'Testing..'
                script {
                    def status = sh(
                        script: 'pnpm run test:ci-cd',
                        returnStatus: true
                    )
                    echo "Code de sortie : ${status}"
                    echo 'Finished tests!'
                }
            }
        }
        stage('SonarQube Quality Gate') {
            steps {
                echo 'Check quality..'
                script {
                    def scannerHome = tool 'sonarqube-scanner';
                    def sonarqubeBranch = 'frontend-chartman2-fr.ovh';
                    withCredentials([string(credentialsId: 'sonarqube-server', variable: 'SONAR_URL')]) {
                        withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_CREDENTIALS')]) {
                            withSonarQubeEnv() {
                                if (env.BRANCH_NAME == 'main') {
                                    sonarqubeBranch = 'frontend-chartman2-fr.ovh'
                                }
                                sh "${scannerHome}/bin/sonar-scanner \
                                        -Dsonar.projectKey=$sonarqubeBranch \
                                        -Dsonar.sources='app' \
                                        -Dsonar.exclusions=public/**/* \
                                        -Dsonar.host.url=$SONAR_URL \
                                        -Dsonar.login=$SONAR_CREDENTIALS \
                                        -Dsonar.testExecutionReportPaths=sonar-report.xml \
                                        -Dsonar.javascript.lcov.reportPaths=./coverage/lcov.info \
                                        -Dsonar.javascript.node.maxspace=4096"
                            }
                        }
                    }
                }
            }
        }
        stage("Quality Gate") {
            steps {
                script {
                    withSonarQubeEnv() {
                        sleep(10)
                        timeout(time: 1, unit: 'HOURS') {
                            def qualitygate = waitForQualityGate()
                            if (qualitygate.status != "OK") {
                                env.WORKSPACE = pwd()
                                error "Pipeline aborted due to quality gate coverage failure: ${qualitygate.status}"
                            }
                        }
                    }
                }
            }
        }
        stage('Github update') {
            steps {
                script {
                    def giteaBranch = env.BRANCH_NAME;
                    if (env.BRANCH_NAME.startsWith('PR')) {
                        echo "PR branch"
                    } else {
                        if (env.BRANCH_NAME == 'main') {
                            withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_CREDENTIALS')]) {
                                sh '''
                                    if git remote | grep github > /dev/null; then
                                        git remote rm github
                                    fi
                                    if [ -f ../.ssh/id_ed25519.pub ]
                                    then
                                        rm ../.ssh/id_ed25519.pub
                                    fi
                                    git remote add github https://$GITHUB_CREDENTIALS@github.com/tititoof/chartman2-fr.git
                                '''
                                sh """
                                    git config --global user.email "chartmann.35@gmail.com"
                                    git config --global user.name "Christophe Hartmann"
                                    touch github-update.txt
                                    touch ./.sonarcloud.properties
                                    echo "sonar.sources=app" >> ./.sonarcloud.properties
                                    echo "sonar.exclusions=test/**/*, coverage/**/*" >> ./.sonarcloud.properties
                                    echo "sonar.testExecutionReportPaths=test-report.xml" >> ./.sonarcloud.properties
                                    echo "sonar.javascript.lcov.reportPaths=./coverage/lcov.info" >> ./.sonarcloud.properties
                                    git add .
                                    git commit -m "feat(github): update repository"
                                    git push -f github HEAD:main
                                """
                            }
                        }
                        if (env.BRANCH_NAME == 'develop') {
                            withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_CREDENTIALS')]) {

                                sh '''
                                    if [ -f ../.ssh/id_ed25519.pub ]
                                    then
                                        rm ../.ssh/id_ed25519.pub
                                    fi
                                    if [ -f ~/.ssh/id_ed25519.pub ]
                                    then
                                        rm ~/.ssh/id_ed25519.pub
                                    fi
                                    if git remote | grep github > /dev/null; then
                                        git remote rm github
                                    fi
                                    git remote add github https://$GITHUB_CREDENTIALS@github.com/tititoof/chartman2-fr.git
                                '''
                                sh """
                                    git config --global user.email "chartmann.35@gmail.com"
                                    git config --global user.name "Christophe Hartmann"
                                    touch github-update.txt
                                    touch ./.sonarcloud.properties
                                    echo "sonar.sources=app" >> ./.sonarcloud.properties
                                    echo "sonar.exclusions=test/**/*, coverage/**/*" >> ./.sonarcloud.properties
                                    echo "sonar.testExecutionReportPaths=test-report.xml" >> ./.sonarcloud.properties
                                    echo "sonar.javascript.lcov.reportPaths=./coverage/lcov.info" >> ./.sonarcloud.properties
                                    git add .
                                    git commit -m "feat(github): update repository"
                                    git push -f github HEAD:develop
                                """
                            }
                        }
                        echo 'Github finished'
                    }
                }
            }
        }
        stage('Build HomeLab') {
            when { anyOf { branch 'develop'; branch 'main' } }
            steps {
                script {
                    buildAndPushImage(env.BRANCH_NAME == 'main' ? 'latest' : 'staging')
                }
            }
        }
        stage('Deploy') {
            steps {
                withCredentials([string(credentialsId: 'coolify-token', variable: 'COOLIFY_TOKEN')]) {
                    script {
                        if (env.BRANCH_NAME == 'develop') {
                            sh """
                                curl -X POST 'http://coolify.chartman2-fr.ovh:8000/api/v1/deploy?tag=frontend-chartman2-fr-staging' \
                                --header "Authorization: Bearer \$COOLIFY_TOKEN"
                            """
                        }
                        if (env.BRANCH_NAME == 'main') {
                            sh """
                                curl -X POST 'http://coolify.chartman2-fr.ovh:8000/api/v1/deploy?tag=frontend-chartman2-fr-production' \
                                --header "Authorization: Bearer \$COOLIFY_TOKEN"
                            """
                        }
                    }
                    echo 'Deploy finished'
                }
            }
        }
    }
}