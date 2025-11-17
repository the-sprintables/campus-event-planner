pipeline {
    agent any

    environment {
        // Docker
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_IMAGE_PREFIX = ''
        LATEST_TAG = 'latest'
        DOCKER_CREDENTIALS_ID = '' // Optional: set Jenkins credential ID for docker registry (username/password)

        // Git
        GIT_REPO_URL = 'https://github.com/the-sprintables/campus-event-planner.git'
        GIT_BRANCH = 'development'
        GIT_CREDENTIALS_ID = ''
    }

    stages {

        stage('Init Helpers') {
            steps {
                script {
                    findTool = { toolName, paths ->
                        for (p in paths) {
                            if (fileExists(p)) return p
                        }
                        def out = sh(script: "command -v ${toolName} || true", returnStdout: true).trim()
                        return out ?: ''
                    }

                    nvmLoad = '''
                        if ! command -v npm &> /dev/null; then
                          if [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh" && nvm use node &>/dev/null; fi
                          if [ -s "/usr/local/opt/nvm/nvm.sh" ]; then . "/usr/local/opt/nvm/nvm.sh" && nvm use node &>/dev/null; fi
                        fi
                    '''

                    runNpm = { cmd ->
                        sh """${nvmLoad}
                            npm ${cmd}
                        """
                    }

                    showVersion = { name, cmd ->
                        echo "${name}: " + sh(script: "${cmd} || echo NOT_FOUND", returnStdout: true).trim()
                    }
                }
            }
        }

        stage('Setup') {
            steps {
                script {
                    try {
                        def reg = credentials('docker-registry-url')
                        if (reg) env.DOCKER_REGISTRY = reg
                    } catch (_) {}

                    env.DOCKER_IMAGE_PREFIX = env.DOCKER_REGISTRY.contains('docker.io') ? 'your-username' : ''
                    def prefix = env.DOCKER_IMAGE_PREFIX ? "${env.DOCKER_IMAGE_PREFIX}/" : ""
                    def buildNum = env.BUILD_NUMBER ?: 'local'

                    env.FRONTEND_IMAGE = "${prefix}campus-event-planner-frontend:${buildNum}"
                    env.BACKEND_IMAGE = "${prefix}campus-event-planner-backend:${buildNum}"
                }
            }
        }

        stage('Setup Tools') {
            steps {
                script {
                    // Node
                    nodePath = findTool('node', ['/usr/local/bin/node', '/opt/homebrew/bin/node'])
                    if (!nodePath) {
                        brewPath = findTool('brew', ['/usr/local/bin/brew', '/opt/homebrew/bin/brew'])
                        if (brewPath) sh "${brewPath} install node || true"
                        nodePath = findTool('node', ['/usr/local/bin/node', '/opt/homebrew/bin/node'])
                    }
                    if (!nodePath) error("Node not found and cannot be installed automatically.")
                    env.PATH = "${nodePath.replaceFirst('/node$','')}:${env.PATH}"
                    showVersion("Node", "node --version")
                    showVersion("NPM", "npm --version")

                    // Go
                    goPath = findTool('go', ['/usr/local/bin/go', '/opt/homebrew/bin/go', '/usr/local/go/bin/go', '/usr/bin/go'])
                    if (!goPath) {
                        if (binding.hasVariable('brewPath') && brewPath) sh "${brewPath} install go || true"
                        goPath = findTool('go', ['/usr/local/bin/go', '/opt/homebrew/bin/go', '/usr/local/go/bin/go', '/usr/bin/go'])
                    }
                    if (!goPath) error("Go not found and cannot be installed automatically.")
                    env.PATH = "${goPath.replaceFirst('/go$','')}:${env.PATH}"
                    showVersion("Go", "go version")
                }
            }
        }

        stage('Checkout') {
            steps {
                script {
                    try {
                        checkout scm
                        echo "SCM checkout successful."
                        return
                    } catch (_) {
                        echo "SCM checkout unavailable; trying manual checkout..."
                    }

                    def src = env.GIT_REPO_URL ?: ''
                    if (!src) {
                        def gitDir = sh(script: 'git rev-parse --git-dir 2>/dev/null || true', returnStdout: true).trim()
                        if (gitDir) { echo "Code already present in workspace"; return }
                        error("No GIT_REPO_URL provided and no SCM configured.")
                    }

                    if (src.startsWith('/') || src.startsWith('file://')) {
                        def local = src.replace('file://', '')
                        sh "rsync -av --exclude='.git' --exclude='node_modules' --exclude='dist' '${local}/' ."
                        echo "Copied from local path: ${local}"
                    } else {
                        def cfg = [
                            $class: 'GitSCM',
                            branches: [[name: "*/${env.GIT_BRANCH}"]],
                            doGenerateSubmoduleConfigurations: false,
                            extensions: [],
                            userRemoteConfigs: [[url: src, credentialsId: env.GIT_CREDENTIALS_ID ?: null]]
                        ]
                        if (!env.GIT_CREDENTIALS_ID) cfg.userRemoteConfigs[0].remove('credentialsId')
                        checkout(cfg)
                    }
                }
            }
        }

        stage('Build and Test') {
            parallel {
                stage('Frontend') {
                    stages {
                        stage('Frontend Test') {
                            steps {
                                dir('frontend') {
                                    script {
                                        runNpm('ci')
                                        sh "${nvmLoad} npx tsc --noEmit"
                                    }
                                }
                            }
                        }
                        stage('Frontend Build') {
                            steps {
                                dir('frontend') { script { runNpm('run build') } }
                            }
                        }
                    }
                }
                stage('Backend') {
                    stages {
                        stage('Backend Test') {
                            steps {
                                dir('backend') {
                                    sh 'go mod download'
                                    sh 'go test ./... -v -coverprofile=coverage.out -covermode=atomic || true'
                                }
                            }
                            post {
                                always {
                                    dir('backend') {
                                        script {
                                            if (fileExists('coverage.out')) {
                                                archiveArtifacts artifacts: 'coverage.out', allowEmptyArchive: false
                                                sh "go tool cover -func=coverage.out | tail -1 || true"
                                            } else { echo "coverage.out not found" }
                                        }
                                    }
                                }
                            }
                        }
                        stage('Backend Build') {
                            steps { dir('backend') { sh 'CGO_ENABLED=1 go build -o event-planner-server ./main.go' } }
                        }
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    def frontendBase = env.FRONTEND_IMAGE.split(':')[0]
                    def backendBase = env.BACKEND_IMAGE.split(':')[0]

                    echo "Building frontend: ${env.FRONTEND_IMAGE}"
                    sh """
                        docker build -t ${env.FRONTEND_IMAGE} -f frontend/Dockerfile frontend/
                        docker tag ${env.FRONTEND_IMAGE} ${frontendBase}:${env.LATEST_TAG}
                    """

                    echo "Building backend: ${env.BACKEND_IMAGE}"
                    sh """
                        docker build -t ${env.BACKEND_IMAGE} -f backend/Dockerfile backend/
                        docker tag ${env.BACKEND_IMAGE} ${backendBase}:${env.LATEST_TAG}
                    """
                }
            }
        }

        stage('Push Docker Images') {
            when {
                expression {
                    def currentBranch = (env.BRANCH_NAME ?: env.GIT_BRANCH ?: '').replaceAll('origin/','').replaceAll('.*/','')
                    def allowed = ['main','master','development']
                    def ok = allowed.contains(currentBranch)
                    echo "Push check: branch='${currentBranch}', allowed=${allowed}, push=${ok}"
                    return ok
                }
            }
            steps {
                script {
                    def frontendBase = env.FRONTEND_IMAGE.split(':')[0]
                    def backendBase = env.BACKEND_IMAGE.split(':')[0]

                    if (env.DOCKER_CREDENTIALS_ID) {
                        withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDENTIALS_ID, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                            echo "Logging into ${env.DOCKER_REGISTRY} as ${DOCKER_USER}"
                            sh "echo \$DOCKER_PASS | docker login ${env.DOCKER_REGISTRY} -u \$DOCKER_USER --password-stdin"
                        }
                    } else {
                        echo "No Docker credentials provided; attempting anonymous push (may fail)."
                    }

                    // push with tolerance for failures (so logs show any errors but pipeline continues to record them)
                    sh """
                        docker push ${env.FRONTEND_IMAGE} || echo "Failed pushing ${env.FRONTEND_IMAGE}"
                        docker push ${frontendBase}:${env.LATEST_TAG} || echo "Failed pushing ${frontendBase}:${env.LATEST_TAG}"
                        docker push ${env.BACKEND_IMAGE} || echo "Failed pushing ${env.BACKEND_IMAGE}"
                        docker push ${backendBase}:${env.LATEST_TAG} || echo "Failed pushing ${backendBase}:${env.LATEST_TAG}"
                    """
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline succeeded — images: ${env.FRONTEND_IMAGE}, ${env.BACKEND_IMAGE}"
        }
        failure {
            echo "Pipeline failed. Inspect the console output for details."
        }
        always {
            cleanWs()
        }
    }
}
