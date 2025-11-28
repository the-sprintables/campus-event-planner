#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_ONLY=false
FRONTEND_ONLY=false
SKIP_INSTALL=false

for arg in "$@"; do
  case $arg in
    --backend-only) BACKEND_ONLY=true ;;
    --frontend-only) FRONTEND_ONLY=true ;;
    --skip-install) SKIP_INSTALL=true ;;
  esac
done

echo "========================================="
echo "Running E2E Tests"
echo "========================================="
echo ""

BACKEND_PASSED=false
FRONTEND_PASSED=false

if [ "$FRONTEND_ONLY" = false ]; then
  echo -e "${BLUE}[1/2] Running Backend E2E Tests...${NC}"
  cd "$PROJECT_ROOT/backend"
  [ "$SKIP_INSTALL" = false ] && go mod download
  if go test ./routes -v -run TestE2E; then
    echo -e "${GREEN}✓ Backend E2E tests passed${NC}"
    BACKEND_PASSED=true
  else
    echo -e "${RED}✗ Backend E2E tests failed${NC}"
  fi
  echo ""
fi

if [ "$BACKEND_ONLY" = false ]; then
  echo -e "${BLUE}[2/2] Running Frontend E2E Tests...${NC}"
  cd "$PROJECT_ROOT/frontend"
  if [ "$SKIP_INSTALL" = false ]; then
    npm install
    npx playwright install --with-deps
  fi
  if npm run test:e2e; then
    echo -e "${GREEN}✓ Frontend E2E tests passed${NC}"
    FRONTEND_PASSED=true
  else
    echo -e "${RED}✗ Frontend E2E tests failed${NC}"
  fi
  echo ""
fi

echo "========================================="
echo "E2E Test Summary"
echo "========================================="

[ "$FRONTEND_ONLY" = false ] && {
  [ "$BACKEND_PASSED" = true ] && echo -e "${GREEN}✓ Backend E2E Tests: PASSED${NC}" || echo -e "${RED}✗ Backend E2E Tests: FAILED${NC}"
}

[ "$BACKEND_ONLY" = false ] && {
  [ "$FRONTEND_PASSED" = true ] && echo -e "${GREEN}✓ Frontend E2E Tests: PASSED${NC}" || echo -e "${RED}✗ Frontend E2E Tests: FAILED${NC}"
}

echo ""

if [ "$FRONTEND_ONLY" = true ]; then
  [ "$FRONTEND_PASSED" = true ] && exit 0 || exit 1
elif [ "$BACKEND_ONLY" = true ]; then
  [ "$BACKEND_PASSED" = true ] && exit 0 || exit 1
else
  ([ "$BACKEND_PASSED" = true ] && [ "$FRONTEND_PASSED" = true ]) && exit 0 || exit 1
fi
