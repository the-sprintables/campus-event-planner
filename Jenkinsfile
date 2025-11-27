pipeline {
    agent any

    environment {
        // Docker
        DOCKER_REGISTRY = 'docker.io'  // docker.io is Docker Hub
        DOCKER_IMAGE_PREFIX = 'a00336001'  // MUST be your Docker Hub username or organization name
        LATEST_TAG = 'latest'
        DOCKER_CREDENTIALS_ID = 'docker-hub-credentials'  // Set to Jenkins credential ID for Docker Hub (username/password or access token)

        // Git
        // GIT_REPO_URL = 'https://github.com/the-sprintables/campus-event-planner.git'
        GIT_REPO_URL = '/Users/mac/Documents/TUS/Agile Build & Delivery/campus-event-planner'
        GIT_BRANCH = 'development'
        GIT_CREDENTIALS_ID = ''

        // SonarQube
        SONAR_TOKEN_CREDENTIAL_ID = 'SONAR_TOKEN'  // Set to Jenkins credential ID for SonarQube token
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

                    // For Docker Hub, DOCKER_IMAGE_PREFIX MUST be your Docker Hub username or organization name
                    // Docker Hub format: username/repository-name:tag
                    // Example: if username is 'johndoe', images will be 'johndoe/campus-event-planner-frontend:tag'
                    if (!env.DOCKER_IMAGE_PREFIX && env.DOCKER_REGISTRY.contains('docker.io')) {
                        env.DOCKER_IMAGE_PREFIX = 'a00336001'  // Docker Hub username
                    }
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
                        // Use BRANCH_NAME if available (from Jenkins SCM), otherwise fall back to GIT_BRANCH
                        def branch = (env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'development').replaceAll('origin/','').replaceAll('.*/','')
                        def cfg = [
                            $class: 'GitSCM',
                            branches: [[name: "*/${branch}"]],
                            doGenerateSubmoduleConfigurations: false,
                            extensions: [],
                            userRemoteConfigs: [[url: src, credentialsId: env.GIT_CREDENTIALS_ID ?: null]]
                        ]
                        if (!env.GIT_CREDENTIALS_ID) cfg.userRemoteConfigs[0].remove('credentialsId')
                        echo "Checking out branch: ${branch}"
                        checkout(cfg)
                    }
                }
            }
        }

        stage('Test') {
            parallel {
                stage('Frontend Test') {
                    steps {
                        dir('frontend') {
                            script {
                                runNpm('ci')
                                sh "${nvmLoad} npx tsc --noEmit"
                                // Run tests with coverage
                                runNpm('run test:coverage')
                            }
                        }
                    }
                    post {
                        always {
                            script {
                                dir('frontend') {
                                    // Archive coverage report if it exists
                                    if (fileExists('coverage/lcov.info')) {
                                        archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: false
                                        echo "Frontend coverage report generated successfully"
                                    } else {
                                        echo "Warning: frontend/coverage/lcov.info not found"
                                    }
                                }
                            }
                        }
                    }
                }
                stage('Backend Test') {
                    steps {
                        dir('backend') {
                            sh 'go mod download'
                            sh 'go test ./... -v -coverprofile=coverage.out -covermode=atomic || true'
                        }
                    }
                    post {
                        always {
                            script {
                                // Fix coverage paths from event-planner/ to backend/ for SonarQube
                                if (fileExists('backend/coverage.out')) {
                                    sh 'chmod +x scripts/fix-coverage-paths.sh || true'
                                    sh './scripts/fix-coverage-paths.sh backend/coverage.out || true'
                                }
                                
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
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                timeout(time: 30, unit: 'MINUTES') {
                    script {
                        // Setup Java 17+ for SonarQube Scanner
                        def javaPath = null
                        def javaPaths = [
                            '/opt/homebrew/opt/openjdk@17/bin/java',
                            '/opt/homebrew/opt/openjdk@21/bin/java',
                            '/usr/local/opt/openjdk@17/bin/java',
                            '/usr/local/opt/openjdk@21/bin/java'
                        ]
                        
                        // Try to find Java 17+ in common locations
                        for (def path : javaPaths) {
                            if (fileExists(path)) {
                                def version = sh(script: "${path} -version 2>&1 | head -1", returnStdout: true).trim()
                                def versionMatch = version =~ /version "(\d+)/
                                if (versionMatch) {
                                    def majorVersion = versionMatch[0][1] as Integer
                                    if (majorVersion >= 17) {
                                        javaPath = path
                                        echo "Found Java ${majorVersion}: ${version}"
                                        break
                                    }
                                }
                            }
                        }
                        
                        // Fallback to system Java if it's 17+
                        if (!javaPath) {
                            def systemJava = sh(script: 'command -v java || echo ""', returnStdout: true).trim()
                            if (systemJava) {
                                def version = sh(script: "${systemJava} -version 2>&1 | head -1", returnStdout: true).trim()
                                def versionMatch = version =~ /version "(\d+)/
                                if (versionMatch) {
                                    def majorVersion = versionMatch[0][1] as Integer
                                    if (majorVersion >= 17) {
                                        javaPath = systemJava
                                        echo "Using system Java ${majorVersion}: ${version}"
                                    }
                                }
                            }
                        }
                        
                        if (javaPath) {
                            def javaHome = javaPath.replaceFirst('/bin/java$', '')
                            env.JAVA_HOME = javaHome
                            env.PATH = "${javaPath.replaceFirst('/java$','')}:${env.PATH}"
                            sh "java -version"
                        } else {
                            error("Java 17+ required for SonarQube Scanner but not found. Please install Java 17 or higher.")
                        }
                        
                        // Build sonar-scanner command
                        def sonarArgs = [
                            '-Dsonar.projectKey=the-sprintables_campus-event-planner',
                            '-Dsonar.organization=the-sprintables',
                            '-Dsonar.sources=backend,frontend/src',
                            '-Dsonar.tests=frontend/src,backend/routes',
                            '-Dsonar.go.coverage.reportPaths=backend/coverage.out',
                            '-Dsonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info',
                            '-Dsonar.host.url=https://sonarcloud.io',
                            '-Dsonar.login=$SONAR_TOKEN'
                        ]
                        
                        // Use SONAR_TOKEN from Jenkins credential
                        if (env.SONAR_TOKEN_CREDENTIAL_ID) {
                            withCredentials([string(credentialsId: env.SONAR_TOKEN_CREDENTIAL_ID, variable: 'SONAR_TOKEN')]) {
                                echo "Starting SonarQube analysis..."
                                sh "npx sonar-scanner ${sonarArgs.join(' ')}"
                            }
                        } else {
                            error("SONAR_TOKEN_CREDENTIAL_ID is not set. Please configure the SonarQube token credential ID in Jenkins.")
                        }
                    }
                }
            }
        }

        stage('Build') {
            parallel {
                stage('Frontend Build') {
                    steps {
                        dir('frontend') { script { runNpm('run build') } }
                    }
                }
                stage('Backend Build') {
                    steps { dir('backend') { sh 'CGO_ENABLED=1 go build -o event-planner-server ./main.go' } }
                }
            }
        }

        stage('E2E Tests') {
            steps {
                script {
                    // Make sure the script is executable
                    sh 'chmod +x scripts/run-e2e-tests.sh || true'
                    
                    // Run E2E tests
                    sh './scripts/run-e2e-tests.sh'
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

                    echo "Preparing to push images:"
                    echo "  Frontend: ${env.FRONTEND_IMAGE} and ${frontendBase}:${env.LATEST_TAG}"
                    echo "  Backend: ${env.BACKEND_IMAGE} and ${backendBase}:${env.LATEST_TAG}"

                    // Docker login
                    if (env.DOCKER_CREDENTIALS_ID) {
                        try {
                            withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDENTIALS_ID, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                                echo "Logging into ${env.DOCKER_REGISTRY} as ${DOCKER_USER}"
                                def loginResult = sh(
                                    script: "echo \$DOCKER_PASS | docker login ${env.DOCKER_REGISTRY} -u \$DOCKER_USER --password-stdin",
                                    returnStatus: true
                                )
                                if (loginResult != 0) {
                                    error("Docker login failed. Please check your credentials (ID: ${env.DOCKER_CREDENTIALS_ID})")
                                }
                                echo "Docker login successful"
                            }
                        } catch (Exception e) {
                            error("Failed to authenticate with Docker Hub: ${e.message}. Check that credential ID '${env.DOCKER_CREDENTIALS_ID}' exists in Jenkins.")
                        }
                    } else {
                        echo "Warning: No Docker credentials provided (DOCKER_CREDENTIALS_ID is empty). Attempting anonymous push (will likely fail)."
                    }

                    // Push images - fail if any push fails
                    echo "Pushing Docker images..."
                    def pushFailed = false
                    def errors = []

                    // Push frontend images
                    echo "Pushing ${env.FRONTEND_IMAGE}..."
                    def result1 = sh(script: "docker push ${env.FRONTEND_IMAGE}", returnStatus: true)
                    if (result1 != 0) {
                        pushFailed = true
                        errors.add("Failed to push ${env.FRONTEND_IMAGE}")
                    }

                    echo "Pushing ${frontendBase}:${env.LATEST_TAG}..."
                    def result2 = sh(script: "docker push ${frontendBase}:${env.LATEST_TAG}", returnStatus: true)
                    if (result2 != 0) {
                        pushFailed = true
                        errors.add("Failed to push ${frontendBase}:${env.LATEST_TAG}")
                    }

                    // Push backend images
                    echo "Pushing ${env.BACKEND_IMAGE}..."
                    def result3 = sh(script: "docker push ${env.BACKEND_IMAGE}", returnStatus: true)
                    if (result3 != 0) {
                        pushFailed = true
                        errors.add("Failed to push ${env.BACKEND_IMAGE}")
                    }

                    echo "Pushing ${backendBase}:${env.LATEST_TAG}..."
                    def result4 = sh(script: "docker push ${backendBase}:${env.LATEST_TAG}", returnStatus: true)
                    if (result4 != 0) {
                        pushFailed = true
                        errors.add("Failed to push ${backendBase}:${env.LATEST_TAG}")
                    }

                    if (pushFailed) {
                        error("Docker push failed:\n${errors.join('\n')}\n\nCheck:\n1. Docker Hub credentials are correct\n2. You have permission to push to ${env.DOCKER_IMAGE_PREFIX}\n3. Images were built successfully\n4. Network connectivity to Docker Hub")
                    } else {
                        echo "All images pushed successfully to Docker Hub!"
                    }
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
