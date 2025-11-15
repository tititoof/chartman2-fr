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
                                        -Dsonar.sources='pages, layouts, components, stores, composables' \
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
                        def qualitygate = waitForQualityGate()
                        if (qualitygate.status != "OK") {
                            env.WORKSPACE = pwd()
                            error "Pipeline aborted due to quality gate coverage failure: ${qualitygate.status}"
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
                                    echo "sonar.sources=pages,layouts,components,store" >> ./.sonarcloud.properties
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
                                    pnpm add dotenv --save
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
                                    echo "sonar.sources=pages,layouts,components,store" >> ./.sonarcloud.properties
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
                            def buildArgs = sh "$(grep -vE '^\s*#|^\s*$' $ENV_FILE | sed 's/^/--build-arg /')"
                             
                            sh """
                                echo ${buildArgs}
                                docker build ${buildArgs} -t registry.chartman2-fr.ovh/frontend-chartman2fr:staging -t ghcr.io/tititoof/frontend-chartman2fr/frontend-chartman2fr:staging -f Dockerfile.prod .
                            """
                            docker.withRegistry('https://registry.chartman2-fr.ovh/') {
                                sh """
                                    docker push registry.chartman2-fr.ovh/frontend-chartman2fr:staging
                                """
                            }
                            docker.withRegistry('https://ghcr.io/tititoof/frontend-chartman2fr', 'ghcr-token') {
                                sh """
                                    docker push registry.chartman2-fr.ovh/frontend-chartman2fr:staging
                                """
                            }
                        }
                        if (env.BRANCH_NAME == 'main') {
                            env.BUILD_ARGS = sh(
                                script: """
                                    grep -v '^#' $ENV_FILE | xargs -I {} echo --build-arg {}
                                """,
                                returnStdout: true
                            ).trim()

                            sh """
                                docker build \
                                ${env.BUILD_ARGS} \
                                -t registry.chartman2-fr.ovh/frontend-chartman2fr:latest \
                                -t ghcr.io/tititoof/frontend-chartman2fr/frontend-chartman2fr:latest \
                                -f Dockerfile.prod \
                                .
                            """
                            docker.withRegistry('https://registry.chartman2-fr.ovh/') {
                                sh """
                                    docker push registry.chartman2-fr.ovh/frontend-chartman2fr:latest
                                """
                            }
                            docker.withRegistry('https://ghcr.io/tititoof/frontend-chartman2fr', 'ghcr-token') {
                                sh """
                                    docker push registry.chartman2-fr.ovh/frontend-chartman2fr:latest
                                """
                            }
                        }
                    }
                }
            }
        }
        stage('Deploy') {
            steps {
                script {
                    echo 'Deploy finished'
                    // withCredentials([string(credentialsId: 'home-dev-staging-ip', variable: 'HomeStagingIp')]) {
                    //     withCredentials([string(credentialsId: 'production-ip-1', variable: 'ProductionIp')]) {
                    //         withCredentials([string(credentialsId: 'production-port', variable: 'ProductionPort')]) {
                    //             withCredentials([file(credentialsId: 'staging-ssh-id-file', variable: 'sshId')]) {
                    //                 withCredentials([file(credentialsId: 'chartman2-fr-frontend-env', variable: 'envFile')]) {
                    //                     writeFile file: './.env', text: readFile(envFile)
                    //                     sh '''
                    //                         if [ ! -d ~/.ssh ]
                    //                         then
                    //                             mkdir ~/.ssh
                    //                         fi
                    //                         if [ -f ../.ssh/id_ed25519.pub ]
                    //                         then
                    //                             sudo rm ../.ssh/id_ed25519.pub
                    //                         fi
                    //                     '''
                    //                     writeFile file: '../.ssh/id_ed25519.pub', text: readFile(sshId)
                    //                     sh '''
                    //                         if [ -f ../.ssh/id_ed25519.pub ]
                    //                         then
                    //                             chmod 400 ../.ssh/id_ed25519.pub
                    //                         fi

                    //                         if [ -f "~/.ssh/known_hosts" ]
                    //                         then
                    //                             sudo rm ~/.ssh/known_hosts
                    //                         fi

                    //                         touch ~/.ssh/known_hosts
                    //                         ssh-keyscan -t rsa $HomeStagingIp >> ~/.ssh/known_hosts
                    //                         ssh-keyscan -t rsa -p $ProductionPort $ProductionIp >> ~/.ssh/known_hosts
                    //                     '''
                    //                     if (env.BRANCH_NAME == 'main') {
                    //                         sh '''
                    //                             pm2 deploy production
                    //                         '''
                    //                     }
                    //                     // if (env.BRANCH_NAME == 'develop') {
                    //                     //     sh '''
                    //                     //         pm2 deploy staging
                    //                     //     '''
                    //                     // }
                    //                 }
                    //             }
                    //             echo "PR branch"
                    //         }
                    //     }
                    // }
                }
            }
        }
    }
}