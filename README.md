# campus-event-planner
Agile, Build &amp; Delivery Group Project

## SonarQube

This repository is configured for SonarQube analysis for both the Go backend and the React TypeScript frontend.

### CI workflow
- A GitHub Actions workflow at `.github/workflows/sonarqube.yml` runs on pushes and PRs to `main`/`master`.
- It optionally builds/tests the frontend and backend to produce coverage reports, then runs the SonarQube scan.

### Secrets required
Add these repository secrets to enable the workflow:
- `SONAR_HOST_URL`: your SonarQube server URL (e.g. `https://sonarqube.mycompany.com`).
- `SONAR_TOKEN`: a project or user token with scan permissions.

### Local scan (optional)
You can run scans locally if you have `sonar-scanner` installed and a token in your environment:

```bash
export SONAR_HOST_URL=https://sonarqube.mycompany.com
export SONAR_TOKEN=YOUR_TOKEN
sonar-scanner
```

### Coverage
- Frontend: if tests generate `frontend/coverage/lcov.info`, it will be picked up automatically.
- Backend (Go): `go test ./... -coverprofile=backend/coverage.out` is used by CI; local runs can produce the same file.

Configuration lives in `sonar-project.properties` at the repo root.

## End-to-End Testing

This project includes comprehensive E2E tests for both backend and frontend:

- **Backend E2E Tests**: Located in `backend/routes/e2e_test.go`, test complete API workflows
- **Frontend E2E Tests**: Located in `frontend/e2e/`, use Playwright to test the full application

See [docs/E2E_TESTING.md](docs/E2E_TESTING.md) for detailed documentation on running and writing E2E tests.
