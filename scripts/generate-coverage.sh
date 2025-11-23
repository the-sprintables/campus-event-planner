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

go tool cover -func=coverage.out | grep -E "(routes/|total)"
