#!/bin/bash
# Generate coverage report for SonarQube
# Run from project root: ./scripts/generate-coverage.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

cd "$BACKEND_DIR"

echo "Running tests and generating coverage..."
echo "Backend directory: $BACKEND_DIR"

go test ./routes/... \
  -coverprofile=coverage.out \
  -coverpkg=./routes,./models,./db,./utils,./middlewares \
  -covermode=atomic \
  -v

echo "Coverage report generated: $BACKEND_DIR/coverage.out"
go tool cover -func=coverage.out | grep -E "(routes/|total)"

