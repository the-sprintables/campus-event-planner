#!/bin/bash
# Local testing script that mimics the Jenkins pipeline
# Run from project root: ./scripts/test-pipeline-local.sh

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "========================================="
echo "Testing Pipeline Locally"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Stage 1: Test Frontend
echo -e "${BLUE}[1/6] Testing Frontend...${NC}"
cd "$PROJECT_ROOT/frontend"
echo "Installing dependencies..."
npm ci
echo "Running TypeScript type check..."
npx tsc --noEmit
echo -e "${GREEN}✓ Frontend tests passed${NC}"
echo ""

# Stage 2: Test Backend
echo -e "${BLUE}[2/6] Testing Backend...${NC}"
cd "$PROJECT_ROOT/backend"
echo "Downloading Go dependencies..."
go mod download
echo "Running Go tests with coverage..."
go test ./... -v -coverprofile=coverage.out -covermode=atomic
echo "Coverage summary:"
go tool cover -func=coverage.out | tail -1
echo -e "${GREEN}✓ Backend tests passed${NC}"
echo ""

# Stage 3: Build Frontend
echo -e "${BLUE}[3/6] Building Frontend...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run build
echo -e "${GREEN}✓ Frontend build successful${NC}"
echo ""

# Stage 4: Build Backend
echo -e "${BLUE}[4/6] Building Backend...${NC}"
cd "$PROJECT_ROOT/backend"
CGO_ENABLED=1 go build -o event-planner-server ./main.go
if [ -f "event-planner-server" ]; then
    echo -e "${GREEN}✓ Backend build successful${NC}"
    echo "Binary created: backend/event-planner-server"
else
    echo -e "${YELLOW}✗ Backend build failed${NC}"
    exit 1
fi
echo ""

# Stage 5: Build Docker Images
echo -e "${BLUE}[5/6] Building Docker Images...${NC}"
cd "$PROJECT_ROOT"

# Build Frontend Docker Image
echo "Building frontend Docker image..."
docker build -t campus-event-planner-frontend:local -f frontend/Dockerfile frontend/
docker tag campus-event-planner-frontend:local campus-event-planner-frontend:latest
echo -e "${GREEN}✓ Frontend Docker image built${NC}"

# Build Backend Docker Image
echo "Building backend Docker image..."
docker build -t campus-event-planner-backend:local -f backend/Dockerfile backend/
docker tag campus-event-planner-backend:local campus-event-planner-backend:latest
echo -e "${GREEN}✓ Backend Docker image built${NC}"
echo ""

# Stage 6: Verify Docker Images
echo -e "${BLUE}[6/6] Verifying Docker Images...${NC}"
echo "Docker images created:"
docker images | grep campus-event-planner
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}All pipeline stages completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "To run the containers:"
echo "  Backend:  docker run -p 8080:8080 campus-event-planner-backend:local"
echo "  Frontend: docker run -p 80:80 campus-event-planner-frontend:local"
echo ""






