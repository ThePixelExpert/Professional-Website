#!/bin/bash
set -euo pipefail

# Make paths robust: change working dir to repo root (script_dir/..)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="192.168.68.67:5000"
GIT_SHA=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%s)
IMAGE_TAG="main-${GIT_SHA}-${TIMESTAMP}"

# Determine what to build
BUILD_TARGET="${1:-all}"

# Validate build target
if [[ ! "$BUILD_TARGET" =~ ^(all|frontend|backend)$ ]]; then
  echo -e "${RED}Error: Invalid build target '$BUILD_TARGET'${NC}"
  echo "Usage: $0 [all|frontend|backend]"
  exit 1
fi

echo -e "${GREEN}=== Build and Push Script ===${NC}"
echo -e "${YELLOW}Registry: ${REGISTRY}${NC}"
echo -e "${YELLOW}Git SHA: ${GIT_SHA}${NC}"
echo -e "${YELLOW}Image Tag: ${IMAGE_TAG}${NC}"
echo -e "${YELLOW}Build Target: ${BUILD_TARGET}${NC}"
echo ""

# Check for .env.production file (required for frontend build)
if [[ "$BUILD_TARGET" == "all" || "$BUILD_TARGET" == "frontend" ]]; then
  if [ ! -f "${REPO_ROOT}/.env.production" ]; then
    echo -e "${RED}Error: .env.production not found!${NC}"
    echo ""
    echo "Frontend build requires .env.production with React environment variables."
    echo "Create it from .env.template and fill in production values:"
    echo ""
    echo "  cp .env.template .env.production"
    echo "  # Edit .env.production with production Supabase URL, API URL, etc."
    echo ""
    exit 1
  fi

  # Source environment variables for frontend build
  echo -e "${YELLOW}Loading environment variables from .env.production...${NC}"
  set -a
  source "${REPO_ROOT}/.env.production"
  set +a
fi

# Ensure a buildx builder with multi-arch support exists
if ! docker buildx inspect multiarch &>/dev/null; then
  echo -e "${YELLOW}Creating multiarch buildx builder...${NC}"
  docker buildx create --name multiarch --driver docker-container --use
else
  docker buildx use multiarch
fi

# Build frontend
if [[ "$BUILD_TARGET" == "all" || "$BUILD_TARGET" == "frontend" ]]; then
  echo -e "${GREEN}Building frontend image (linux/amd64 + linux/arm64)...${NC}"

  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -f "${REPO_ROOT}/Dockerfile.frontend" \
    --build-arg REACT_APP_SUPABASE_URL="${REACT_APP_SUPABASE_URL}" \
    --build-arg REACT_APP_SUPABASE_ANON_KEY="${REACT_APP_SUPABASE_ANON_KEY}" \
    --build-arg REACT_APP_API_URL="${REACT_APP_API_URL}" \
    --build-arg REACT_APP_STRIPE_PUBLISHABLE_KEY="${REACT_APP_STRIPE_PUBLISHABLE_KEY:-}" \
    -t "${REGISTRY}/frontend:${IMAGE_TAG}" \
    -t "${REGISTRY}/frontend:latest" \
    --push \
    "${REPO_ROOT}"

  echo -e "${GREEN}✓ Frontend image built and pushed${NC}"
  echo "  - ${REGISTRY}/frontend:${IMAGE_TAG}"
  echo "  - ${REGISTRY}/frontend:latest"
  echo ""
fi

# Build backend
if [[ "$BUILD_TARGET" == "all" || "$BUILD_TARGET" == "backend" ]]; then
  echo -e "${GREEN}Building backend image (linux/amd64 + linux/arm64)...${NC}"

  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -f "${REPO_ROOT}/Dockerfile.backend" \
    -t "${REGISTRY}/backend:${IMAGE_TAG}" \
    -t "${REGISTRY}/backend:latest" \
    --push \
    "${REPO_ROOT}"

  echo -e "${GREEN}✓ Backend image built and pushed${NC}"
  echo "  - ${REGISTRY}/backend:${IMAGE_TAG}"
  echo "  - ${REGISTRY}/backend:latest"
  echo ""
fi

# Clean up local Docker build cache
echo -e "${YELLOW}Cleaning up local Docker build cache...${NC}"
docker builder prune -f
echo -e "${GREEN}✓ Local build cache cleaned${NC}"
echo ""

# Clean up old images in registry (keep last 5 tags)
echo -e "${YELLOW}Cleaning up old Docker images in registry...${NC}"

# Check if jq is available for JSON parsing
if ! command -v jq &>/dev/null; then
  echo -e "${RED}Warning: jq is not installed. Skipping registry cleanup.${NC}"
  echo -e "${YELLOW}Install jq with: sudo apt-get install jq${NC}"
else
  # Clean up frontend tags
  if [[ "$BUILD_TARGET" == "all" || "$BUILD_TARGET" == "frontend" ]]; then
    frontendTags=$(curl -s "http://${REGISTRY}/v2/frontend/tags/list" | jq -r '.tags[]' 2>/dev/null | sort -r | tail -n +6)
    if [ ! -z "$frontendTags" ]; then
      echo -e "${YELLOW}Removing old frontend tags...${NC}"
      echo "$frontendTags" | while read -r oldTag; do
        if [ ! -z "$oldTag" ]; then
          # Get manifest digest first
          manifest=$(curl -s -I -H "Accept: application/vnd.docker.distribution.manifest.v2+json" "http://${REGISTRY}/v2/frontend/manifests/$oldTag" 2>/dev/null | grep -i "Docker-Content-Digest" | awk '{print $2}' | tr -d '\r')
          if [ ! -z "$manifest" ]; then
            curl -s -X DELETE "http://${REGISTRY}/v2/frontend/manifests/$manifest" 2>/dev/null || true
            echo "  Deleted: frontend:$oldTag"
          fi
        fi
      done
    fi
  fi

  # Clean up backend tags
  if [[ "$BUILD_TARGET" == "all" || "$BUILD_TARGET" == "backend" ]]; then
    backendTags=$(curl -s "http://${REGISTRY}/v2/backend/tags/list" | jq -r '.tags[]' 2>/dev/null | sort -r | tail -n +6)
    if [ ! -z "$backendTags" ]; then
      echo -e "${YELLOW}Removing old backend tags...${NC}"
      echo "$backendTags" | while read -r oldTag; do
        if [ ! -z "$oldTag" ]; then
          # Get manifest digest first
          manifest=$(curl -s -I -H "Accept: application/vnd.docker.distribution.manifest.v2+json" "http://${REGISTRY}/v2/backend/manifests/$oldTag" 2>/dev/null | grep -i "Docker-Content-Digest" | awk '{print $2}' | tr -d '\r')
          if [ ! -z "$manifest" ]; then
            curl -s -X DELETE "http://${REGISTRY}/v2/backend/manifests/$manifest" 2>/dev/null || true
            echo "  Deleted: backend:$oldTag"
          fi
        fi
      done
    fi
  fi

  echo -e "${GREEN}✓ Registry cleanup completed${NC}"
fi

echo ""
echo -e "${GREEN}=== Build Summary ===${NC}"
echo -e "Git SHA: ${YELLOW}${GIT_SHA}${NC}"
echo -e "Image Tag: ${YELLOW}${IMAGE_TAG}${NC}"
if [[ "$BUILD_TARGET" == "all" || "$BUILD_TARGET" == "frontend" ]]; then
  echo -e "Frontend: ${GREEN}${REGISTRY}/frontend:${IMAGE_TAG}${NC}"
fi
if [[ "$BUILD_TARGET" == "all" || "$BUILD_TARGET" == "backend" ]]; then
  echo -e "Backend: ${GREEN}${REGISTRY}/backend:${IMAGE_TAG}${NC}"
fi
echo -e "${GREEN}Build and push complete!${NC}"
