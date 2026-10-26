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
                        sudo npm install -g pnpm
                        sudo npm install -g pm2
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
                                        -Dsonar.javascript.lcov.reportPaths=./coverage/lcov.info"
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
                                        sudo rm ../.ssh/id_ed25519.pub
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
                                        sudo rm ../.ssh/id_ed25519.pub
                                    fi
                                    if [ -f ~/.ssh/id_ed25519.pub ]
                                    then
                                        sudo rm ~/.ssh/id_ed25519.pub
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
            steps {
                withCredentials([file(credentialsId: 'frontend-chartman2-fr-env', variable: 'ENV_FILE')]) {
                    script {
                        if (env.BRANCH_NAME == 'develop') {
                            def buildArgs = sh(
                                script: "grep -vE '^[[:space:]]*#|^[[:space:]]*\$' ${ENV_FILE} | sed 's/^/--build-arg /' | tr '\\n' ' '",
                                returnStdout: true
                            )
                             
                            sh """
                                echo ${buildArgs}
                                docker build --pull ${buildArgs} -t registry.chartman2-fr.ovh/frontend-chartman2fr:staging -t ghcr.io/tititoof/frontend-chartman2fr:staging -f Dockerfile.prod .
                            """
                            scanImageToDefectDojo('registry.chartman2-fr.ovh/frontend-chartman2fr:staging')
                            sh """
                                docker push registry.chartman2-fr.ovh/frontend-chartman2fr:staging
                            """

                            withCredentials([string(credentialsId: 'ghcr-token', variable: 'CR_PAT')]) {
                                sh """
                                    echo $CR_PAT | docker login ghcr.io -u tititoof --password-stdin
                                    docker push ghcr.io/tititoof/frontend-chartman2fr:staging
                                """
                            }
                        }
                        if (env.BRANCH_NAME == 'main') {
                            def buildArgs = sh(
                                script: "grep -vE '^[[:space:]]*#|^[[:space:]]*\$' ${ENV_FILE} | sed 's/^/--build-arg /' | tr '\\n' ' '",
                                returnStdout: true
                            )

                            sh """
                                echo ${buildArgs}
                                docker build --pull ${buildArgs} -t registry.chartman2-fr.ovh/frontend-chartman2fr:latest -t ghcr.io/tititoof/frontend-chartman2fr:latest -f Dockerfile.prod .
                            """
                            scanImageToDefectDojo('registry.chartman2-fr.ovh/frontend-chartman2fr:latest')
                            sh """
                                docker push registry.chartman2-fr.ovh/frontend-chartman2fr:latest
                            """
                            withCredentials([string(credentialsId: 'ghcr-token', variable: 'CR_PAT')]) {
                                sh """
                                    echo $CR_PAT | docker login ghcr.io -u tititoof --password-stdin
                                    docker push ghcr.io/tititoof/frontend-chartman2fr:latest
                                """
                            }
                        }
                    }
                }
            }
        }
        stage('Deploy') {
            steps {
                withCredentials([string(credentialsId: 'coolify-token', variable: 'COOLIFY_TOKEN')]) {
                    script {
                        if (env.BRANCH_NAME == 'develop') {
                            sh """
                                curl -X POST http://coolify.chartman2-fr.ovh:8000/api/v1/deploy?tag=frontend-chartman2-fr-staging \
                                --header "Authorization: Bearer ${COOLIFY_TOKEN}"
                            """
                        }
                        if (env.BRANCH_NAME == 'main') {
                            sh """
                                curl -X POST 'http://coolify.chartman2-fr.ovh:8000/api/v1/deploy?tag=frontend-chartman2-fr-production' \
                                --header 'Authorization: Bearer ${COOLIFY_TOKEN}'
                            """
                        }
                    }
                    echo 'Deploy finished'
                }
            }
        }
    }
}