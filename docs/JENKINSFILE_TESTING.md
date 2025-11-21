# Testing the Jenkinsfile

This guide covers multiple approaches to test your Jenkinsfile before deploying it to Jenkins.

## Option 1: Local Test Script (Recommended for Quick Testing)

You already have a script that mimics the pipeline stages locally:

```bash
# Make sure the script is executable
chmod +x scripts/test-pipeline-local.sh

# Run from project root
./scripts/test-pipeline-local.sh
```

This script:
- ✅ Tests frontend (npm ci, TypeScript check)
- ✅ Tests backend (Go tests with coverage)
- ✅ Builds frontend
- ✅ Builds backend
- ✅ Builds Docker images
- ✅ Verifies Docker images

**Pros:** Fast, no Jenkins required, tests actual build steps
**Cons:** Doesn't validate Jenkinsfile syntax or Jenkins-specific features

---
