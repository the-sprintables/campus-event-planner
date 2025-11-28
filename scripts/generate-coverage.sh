#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT/backend"

go test ./routes/... \
  -coverprofile=coverage.out \
  -coverpkg=./routes,./models,./db,./utils,./middlewares \
  -covermode=atomic \
  -v

# Fix coverage paths from event-planner/ to backend/ for SonarQube
if [ -f "coverage.out" ]; then
    "$PROJECT_ROOT/scripts/fix-coverage-paths.sh" "$PROJECT_ROOT/backend/coverage.out"
fi

go tool cover -func=coverage.out | grep -E "(routes/|total)"
