# Useful Scripts

## Local Testing and Docker Building

### Test Pipeline Locally
Run all pipeline stages locally (tests, builds, Docker images):
```bash
./scripts/test-pipeline-local.sh
```

This script will:
1. Test Frontend (TypeScript type checking)
2. Test Backend (Go tests with coverage)
3. Build Frontend
4. Build Backend
5. Build Docker images for both
6. Verify Docker images
