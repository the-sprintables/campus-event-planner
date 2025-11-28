# Useful Scripts

## End-to-End Testing

### Run All E2E Tests
Run both backend and frontend E2E tests:
```bash
./scripts/run-e2e-tests.sh
```

Or using npm:
```bash
npm run test:e2e
```

Options:
- `--backend-only` - Run only backend E2E tests
- `--frontend-only` - Run only frontend E2E tests
- `--skip-install` - Skip dependency installation

Examples:
```bash
# Run only backend tests
./scripts/run-e2e-tests.sh --backend-only

# Run only frontend tests
./scripts/run-e2e-tests.sh --frontend-only

# Skip dependency installation (faster if already installed)
./scripts/run-e2e-tests.sh --skip-install
```

This script will:
1. Install dependencies (unless `--skip-install` is used)
2. Run Backend E2E tests (unless `--frontend-only` is used)
3. Run Frontend E2E tests (unless `--backend-only` is used)
4. Display a summary of test results

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
