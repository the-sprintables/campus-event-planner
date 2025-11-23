# Docker Hub Push Configuration Guide

This guide explains how to configure the Jenkins pipeline to push Docker images to Docker Hub instead of just building them locally.

## Prerequisites

1. **Docker Hub Account**: You need a Docker Hub account
2. **Docker Hub Access Token** (recommended) or password
3. **Jenkins Credentials**: Configure credentials in Jenkins

## Steps to Configure

### Step 1: Create Jenkins Credentials for Docker Hub

1. In Jenkins, go to **Manage Jenkins** → **Credentials** → **System** → **Global credentials**
2. Click **Add Credentials**
3. Configure:
   - **Kind**: Username with password
   - **Username**: Your Docker Hub username
   - **Password**: Your Docker Hub password or access token (recommended)
   - **ID**: Give it a memorable ID (e.g., `docker-hub-credentials`)
   - **Description**: "Docker Hub credentials for pushing images"

**Note**: For better security, use a Docker Hub Access Token instead of your password:
- Go to Docker Hub → Account Settings → Security → New Access Token
- Create a token with read/write permissions
- Use this token as the password in Jenkins credentials

### Step 2: Update Jenkinsfile Environment Variables

Edit the `Jenkinsfile` and update these environment variables at the top:

```groovy
environment {
    // Docker
    DOCKER_REGISTRY = 'docker.io'  // docker.io is Docker Hub (already correct)
    DOCKER_IMAGE_PREFIX = 'your-dockerhub-username'  // MUST be your Docker Hub username or organization name
    LATEST_TAG = 'latest'
    DOCKER_CREDENTIALS_ID = 'docker-hub-credentials'  // CHANGE THIS to your Jenkins credential ID
    // ... rest of config
}
```

**Important:** `DOCKER_IMAGE_PREFIX` **MUST** be your actual Docker Hub username (or organization name). Docker Hub requires the format `username/repository-name:tag`, so the prefix must be a valid username/organization that you own.

**Example:**
```groovy
DOCKER_IMAGE_PREFIX = 'johndoe'  // Your actual Docker Hub username
DOCKER_CREDENTIALS_ID = 'docker-hub-credentials'  // The ID you set in Step 1
```

This will create images like:
- `johndoe/campus-event-planner-frontend:BUILD_NUMBER`
- `johndoe/campus-event-planner-backend:BUILD_NUMBER`

### Step 3: Verify Image Names

After setting `DOCKER_IMAGE_PREFIX`, your images will be named:
- `your-username/campus-event-planner-frontend:BUILD_NUMBER`
- `your-username/campus-event-planner-backend:BUILD_NUMBER`
- `your-username/campus-event-planner-frontend:latest`
- `your-username/campus-event-planner-backend:latest`

### Step 4: Run the Pipeline

The pipeline will:
1. Build the Docker images
2. Tag them with your Docker Hub username prefix
3. Log in to Docker Hub using your credentials
4. Push the images to Docker Hub

## Current Configuration

The pipeline is already configured to:
- ✅ Push only on `main`, `master`, or `development` branches
- ✅ Handle Docker login automatically
- ✅ Push both versioned (BUILD_NUMBER) and `latest` tags
- ✅ Continue even if push fails (logs the error)

## Troubleshooting

### Push Fails with "authentication required"
- Verify `DOCKER_CREDENTIALS_ID` matches your Jenkins credential ID
- Check that the credentials have the correct username and password/token
- Ensure the Docker Hub account has permission to create repositories

### Images Not Found After Push
- Verify the image names match your Docker Hub username
- Check Docker Hub → Repositories to see if images were pushed
- Ensure you're looking at the correct repository (your-username/campus-event-planner-frontend)

### "Repository does not exist" Error
- Docker Hub will automatically create repositories on first push
- Make sure your Docker Hub username in `DOCKER_IMAGE_PREFIX` is correct
- Verify you have permission to create repositories in your Docker Hub account

## Alternative: Using Jenkins Parameters

Instead of hardcoding values, you can make the pipeline accept parameters:

```groovy
parameters {
    string(name: 'DOCKER_HUB_USERNAME', defaultValue: '', description: 'Docker Hub username')
    credentials(name: 'DOCKER_CREDENTIALS', defaultValue: '', description: 'Docker Hub credentials')
}
```

Then use `params.DOCKER_HUB_USERNAME` and `params.DOCKER_CREDENTIALS` in your pipeline.

## Security Best Practices

1. **Use Access Tokens**: Prefer Docker Hub access tokens over passwords
2. **Limit Token Permissions**: Create tokens with only necessary permissions
3. **Rotate Credentials**: Regularly rotate your Docker Hub tokens
4. **Secure Credentials**: Never commit credentials to version control
5. **Use Jenkins Credentials**: Always use Jenkins credential management, never hardcode credentials

