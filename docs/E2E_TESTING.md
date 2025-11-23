# End-to-End Testing Guide

This document describes the E2E (End-to-End) testing setup for both the backend and frontend of the Campus Event Planner application.

## Overview

E2E tests verify that the entire application works correctly from the user's perspective, testing complete workflows across the frontend and backend.

## Backend E2E Tests

The backend E2E tests are located in `backend/routes/e2e_test.go` and test the complete API flow including authentication, event management, user registration, and authorization.

### Running Backend E2E Tests

```bash
cd backend
go test ./routes -v -run TestE2E
```

Or run all tests including E2E:

```bash
cd backend
go test ./... -v
```

### Backend E2E Test Coverage

The backend E2E tests cover:

1. **User Registration and Login Flow** (`TestE2E_UserRegistrationAndLogin`)
   - User registration
   - User login with JWT token generation
   - Token validation

2. **Event Lifecycle** (`TestE2E_EventLifecycle`)
   - Creating events
   - Reading events (list and individual)
   - Updating events
   - Deleting events

3. **Event Registration Flow** (`TestE2E_EventRegistrationFlow`)
   - Checking registration status
   - Registering for events
   - Canceling event registrations

4. **User Profile Management** (`TestE2E_UserProfileManagement`)
   - Getting user profile
   - Updating profile information
   - Changing password

5. **Authorization and Access Control** (`TestE2E_AuthorizationAndAccessControl`)
   - Verifying users can only modify their own events
   - Testing unauthorized access attempts

### Backend E2E Test Structure

- Uses in-memory SQLite database for isolation
- Sets up full router with all routes and middleware
- Tests complete request/response cycles
- Verifies HTTP status codes and response data

## Frontend E2E Tests

The frontend E2E tests use **Playwright** to test the application in a real browser environment. Tests are located in `frontend/e2e/`.

### Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Install Playwright browsers:

```bash
npx playwright install
```

### Running Frontend E2E Tests

```bash
cd frontend

# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug
```

### Frontend E2E Test Coverage

The frontend E2E tests are organized into the following test suites:

1. **Authentication Tests** (`e2e/auth.spec.ts`)
   - User registration
   - User login
   - Login error handling
   - User logout
   - Protected route access

2. **Events Tests** (`e2e/events.spec.ts`)
   - Displaying list of events
   - Creating new events
   - Viewing event details
   - Updating events
   - Deleting events
   - Registering for events

3. **Profile Tests** (`e2e/profile.spec.ts`)
   - Displaying user profile
   - Updating profile information
   - Changing password

### Frontend E2E Test Configuration

The Playwright configuration (`playwright.config.ts`) includes:

- **Base URL**: `http://localhost:5174` (Vite dev server)
- **Web Servers**: Automatically starts both frontend and backend servers
- **Browsers**: Tests run on Chromium, Firefox, and WebKit
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: Captured on test failures
- **Traces**: Collected on first retry

### Frontend E2E Test Structure

- Tests use API requests to set up test data
- Tests interact with the UI using Playwright's page object model
- Tests verify both UI state and API responses
- Each test is isolated with its own user data

## Running Both Backend and Frontend E2E Tests

### Single Script (Recommended)

The easiest way to run all E2E tests is using the provided script:

```bash
# From project root
./scripts/run-e2e-tests.sh
```

Or using npm:

```bash
npm run test:e2e
```

Options:
- `--backend-only` - Run only backend E2E tests
- `--frontend-only` - Run only frontend E2E tests
- `--skip-install` - Skip dependency installation (faster if already installed)

### Manual Execution

To run tests manually in separate terminals:

```bash
# Terminal 1: Run backend E2E tests
cd backend
go test ./routes -v -run TestE2E

# Terminal 2: Run frontend E2E tests
cd frontend
npm run test:e2e
```

## CI/CD Integration

### Backend E2E Tests in CI

Add to your CI pipeline:

```yaml
- name: Run Backend E2E Tests
  run: |
    cd backend
    go test ./routes -v -run TestE2E
```

### Frontend E2E Tests in CI

Add to your CI pipeline:

```yaml
- name: Install Playwright
  run: |
    cd frontend
    npm ci
    npx playwright install --with-deps

- name: Run Frontend E2E Tests
  run: |
    cd frontend
    npm run test:e2e
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Clean State**: Tests should clean up after themselves (or use test databases)
3. **Realistic Data**: Use realistic test data that matches production scenarios
4. **Error Cases**: Test both success and failure scenarios
5. **Performance**: Keep tests fast - use API setup when possible instead of UI interactions

## Troubleshooting

### Backend E2E Tests Fail

- Ensure Go dependencies are installed: `go mod tidy`
- Check that the test database is properly initialized
- Verify all routes and middleware are correctly set up

### Frontend E2E Tests Fail

- Ensure both frontend and backend servers can start
- Check that ports 5174 (frontend) and 8080 (backend) are available
- Verify Playwright browsers are installed: `npx playwright install`
- Check browser console for JavaScript errors

### Tests Timeout

- Increase timeout in `playwright.config.ts` if needed
- Check that servers are starting correctly
- Verify network connectivity between frontend and backend

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Go Testing Documentation](https://golang.org/pkg/testing/)
- [Gin Framework Testing](https://gin-gonic.com/docs/testing/)

