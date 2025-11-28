#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "Testing Pipeline Locally"
echo "========================================="
echo ""

echo -e "${BLUE}[1/6] Testing Frontend...${NC}"
cd "$PROJECT_ROOT/frontend"
npm ci
npx tsc --noEmit
echo -e "${GREEN}✓ Frontend tests passed${NC}"
echo ""

echo -e "${BLUE}[2/6] Testing Backend...${NC}"
cd "$PROJECT_ROOT/backend"
go mod download
go test ./... -v -coverprofile=coverage.out -covermode=atomic
go tool cover -func=coverage.out | tail -1
echo -e "${GREEN}✓ Backend tests passed${NC}"
echo ""

echo -e "${BLUE}[3/6] Building Frontend...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run build
echo -e "${GREEN}✓ Frontend build successful${NC}"
echo ""

echo -e "${BLUE}[4/6] Building Backend...${NC}"
cd "$PROJECT_ROOT/backend"
CGO_ENABLED=1 go build -o event-planner-server ./main.go
[ -f "event-planner-server" ] || { echo -e "${YELLOW}✗ Backend build failed${NC}"; exit 1; }
echo -e "${GREEN}✓ Backend build successful${NC}"
echo ""

echo -e "${BLUE}[5/6] Building Docker Images...${NC}"
cd "$PROJECT_ROOT"
docker build -t campus-event-planner-frontend:local -f frontend/Dockerfile frontend/
docker tag campus-event-planner-frontend:local campus-event-planner-frontend:latest
echo -e "${GREEN}✓ Frontend Docker image built${NC}"
docker build -t campus-event-planner-backend:local -f backend/Dockerfile backend/
docker tag campus-event-planner-backend:local campus-event-planner-backend:latest
echo -e "${GREEN}✓ Backend Docker image built${NC}"
echo ""

echo -e "${BLUE}[6/6] Verifying Docker Images...${NC}"
docker images | grep campus-event-planner
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}All pipeline stages completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "To run the containers:"
echo "  Backend:  docker run -p 8080:8080 campus-event-planner-backend:local"
echo "  Frontend: docker run -p 80:80 campus-event-planner-frontend:local"
