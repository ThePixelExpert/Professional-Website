#!/bin/bash

# Unified Deployment Script for Edwards Engineering
# Supports development, staging, and production deployments with appropriate safety levels

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m'

# Default values
ENVIRONMENT=""
DRY_RUN=false
SKIP_SECURITY_CHECK=false
SKIP_CLEANUP=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-security-check)
            SKIP_SECURITY_CHECK=true
            shift
            ;;
        --skip-cleanup)
            SKIP_CLEANUP=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 -e|--environment <development|staging|production> [options]"
            echo "Options:"
            echo "  --dry-run              Perform dry run without actual deployment"
            echo "  --skip-security-check  Skip security checks (not recommended for production)"
            echo "  --skip-cleanup         Skip cleanup of old Docker images"
            echo "  -h|--help             Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

# Validate environment parameter
if [[ -z "$ENVIRONMENT" ]]; then
    echo -e "${RED}Error: Environment parameter is required${NC}"
    echo "Usage: $0 -e|--environment <development|staging|production>"
    exit 1
fi

if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}Error: Environment must be development, staging, or production${NC}"
    exit 1
fi

# Configuration based on environment
case $ENVIRONMENT in
    development)
        DOCKER_TAG=$(date +"%Y%m%d%H%M%S")
        SECURITY_REQUIRED=false
        SECRET_VALIDATION=false
        CLEANUP_ENABLED=true
        DESCRIPTION="Development deployment with timestamp tags"
        ;;
    staging)
        DOCKER_TAG="staging-$(date +'%Y%m%d%H%M%S')"
        SECURITY_REQUIRED=true
        SECRET_VALIDATION=true
        CLEANUP_ENABLED=true
        DESCRIPTION="Staging deployment with security checks"
        ;;
    production)
        DOCKER_TAG="latest"
        SECURITY_REQUIRED=true
        SECRET_VALIDATION=true
        CLEANUP_ENABLED=false
        DESCRIPTION="Production deployment with full security audit"
        ;;
esac

echo -e "${CYAN}🚀 Edwards Engineering Deployment${NC}"
echo -e "${YELLOW}Environment: $ENVIRONMENT ($DESCRIPTION)${NC}"
echo -e "${GREEN}Docker Tag: $DOCKER_TAG${NC}"

if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}🧪 DRY RUN MODE - No actual deployment will occur${NC}"
fi

# Get project root from scripts folder location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PI_IP="192.168.0.40"

# Security Pre-check (required for staging/production)
if [[ "$SECURITY_REQUIRED" == "true" && "$SKIP_SECURITY_CHECK" != "true" ]]; then
    echo -e "\n${RED}🔒 Running Security Pre-check...${NC}"
    
    SUSPICIOUS_FILES=()
    
    # Check for localhost URLs in source
    if grep -r "localhost:300[0-9]" "$PROJECT_ROOT/src" 2>/dev/null; then
        SUSPICIOUS_FILES+=("❌ Found localhost URLs in source files")
    fi
    
    # Check for test Stripe keys
    if grep -r "pk_test_\|sk_test_" "$PROJECT_ROOT" 2>/dev/null; then
        SUSPICIOUS_FILES+=("❌ Found test Stripe keys")
    fi
    
    # Check for .env files
    if find "$PROJECT_ROOT" -name ".env*" -type f 2>/dev/null | grep -q .; then
        SUSPICIOUS_FILES+=("❌ Found .env files (should not be committed)")
    fi
    
    # Check for hardcoded passwords
    if grep -r "password.*=.*[\"'].*[\"']" "$PROJECT_ROOT" 2>/dev/null; then
        SUSPICIOUS_FILES+=("❌ Found potential hardcoded passwords")
    fi
    
    if [[ ${#SUSPICIOUS_FILES[@]} -gt 0 ]]; then
        echo -e "\n${RED}❌ SECURITY ISSUES FOUND! Cannot deploy to $ENVIRONMENT safely.${NC}"
        echo -e "${RED}Please fix these issues before deployment:${NC}"
        for issue in "${SUSPICIOUS_FILES[@]}"; do
            echo -e "${RED}   $issue${NC}"
        done
        echo -e "\n${YELLOW}Use --skip-security-check to bypass (NOT recommended for production)${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ Security pre-check passed!${NC}"
    fi
elif [[ "$SECURITY_REQUIRED" == "true" ]]; then
    echo -e "\n${YELLOW}⚠️  Security check skipped (not recommended for $ENVIRONMENT)${NC}"
fi

# Environment variable validation (required for staging/production)
if [[ "$SECRET_VALIDATION" == "true" ]]; then
    REQUIRED_ENV_VARS=(
        "STRIPE_SECRET_KEY"
        "JWT_SECRET"
        "ADMIN_PASS"
        "DB_PASSWORD"
        "EMAIL_APP_PASSWORD"
    )
    
    echo -e "\n${BLUE}🔍 Checking environment configuration...${NC}"
    for env_var in "${REQUIRED_ENV_VARS[@]}"; do
        if [[ -z "${!env_var}" ]]; then
            echo -e "${RED}❌ Missing environment variable: $env_var${NC}"
            echo -e "${YELLOW}Set with: export $env_var='your-value'${NC}"
            exit 1
        else
            echo -e "${GREEN}✅ $env_var is configured${NC}"
        fi
    done
fi

# Generate/update tag file
echo -e "\n${BLUE}📝 Generating deployment tag...${NC}"
ANSIBLE_TAG_PATH="$PROJECT_ROOT/ansible/tag.txt"
ANSIBLE_DIR="$(dirname "$ANSIBLE_TAG_PATH")"

if [[ ! -d "$ANSIBLE_DIR" ]]; then
    mkdir -p "$ANSIBLE_DIR"
fi
echo "$DOCKER_TAG" > "$ANSIBLE_TAG_PATH"

# Prepare Pi infrastructure
echo -e "\n${BLUE}🏗️  Preparing Pi infrastructure...${NC}"
if [[ "$DRY_RUN" != "true" ]]; then
    ssh pi@${PI_IP} "mkdir -p /home/pi/Professional-Website/ansible /home/pi/Professional-Website/k8s/frontend /home/pi/Professional-Website/k8s/backend /home/pi/Professional-Website/k8s/database"
fi

# Copy Kubernetes manifests
echo -e "\n${BLUE}📋 Copying Kubernetes manifests...${NC}"
if [[ "$DRY_RUN" != "true" ]]; then
    scp ../k8s/frontend/deployment.yaml pi@${PI_IP}:/home/pi/Professional-Website/k8s/frontend/deployment.yaml
    scp ../k8s/backend/deployment.yaml pi@${PI_IP}:/home/pi/Professional-Website/k8s/backend/deployment.yaml
    scp ../k8s/backend/secret.yaml pi@${PI_IP}:/home/pi/Professional-Website/k8s/backend/secret.yaml
    scp ../k8s/database/postgres-deployment.yaml pi@${PI_IP}:/home/pi/Professional-Website/k8s/database/postgres-deployment.yaml
    scp ../k8s/ingress.yaml pi@${PI_IP}:/home/pi/Professional-Website/k8s/ingress.yaml
fi

# Build and push Docker images
echo -e "\n${BLUE}🔨 Building Docker images...${NC}"
if [[ "$DRY_RUN" != "true" ]]; then
    if [[ "$ENVIRONMENT" == "development" ]]; then
        docker buildx build --no-cache --platform linux/arm64 -f ../Dockerfile.frontend -t 192.168.0.40:5000/edwards-frontend:$DOCKER_TAG --push ..
        docker buildx build --no-cache --platform linux/arm64 -f ../Dockerfile.backend -t 192.168.0.40:5000/edwards-backend:$DOCKER_TAG --push ..
    else
        docker buildx build --no-cache --platform linux/amd64,linux/arm64 -f ../Dockerfile.frontend -t 192.168.0.40:5000/edwards-frontend:$DOCKER_TAG --push ..
        docker buildx build --no-cache --platform linux/amd64,linux/arm64 -f ../Dockerfile.backend -t 192.168.0.40:5000/edwards-backend:$DOCKER_TAG --push ..
    fi
else
    echo -e "${GRAY}   Would build: edwards-frontend:$DOCKER_TAG${NC}"
    echo -e "${GRAY}   Would build: edwards-backend:$DOCKER_TAG${NC}"
fi

# Update Kubernetes secrets (production/staging only)
if [[ "$SECRET_VALIDATION" == "true" && "$DRY_RUN" != "true" ]]; then
    echo -e "\n${BLUE}🔐 Updating Kubernetes secrets...${NC}"
    
    kubectl create secret generic backend-secrets \
        --from-literal=jwt-secret="$JWT_SECRET" \
        --from-literal=admin-user="$ADMIN_USER" \
        --from-literal=admin-password="$ADMIN_PASS" \
        --from-literal=stripe-secret-key="$STRIPE_SECRET_KEY" \
        --from-literal=email-user="$EMAIL_USER" \
        --from-literal=email-password="$EMAIL_APP_PASSWORD" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    DB_PASSWORD_BASE64=$(echo -n "$DB_PASSWORD" | base64)
    sed "s/<REPLACE_WITH_SECURE_BASE64_PASSWORD>/$DB_PASSWORD_BASE64/g" ../k8s/database/postgres-deployment.yaml > ../k8s/database/postgres-deployment-temp.yaml
    kubectl apply -f ../k8s/database/postgres-deployment-temp.yaml
    rm ../k8s/database/postgres-deployment-temp.yaml
elif [[ "$SECRET_VALIDATION" == "true" ]]; then
    echo -e "\n${GRAY}🔐 Would update Kubernetes secrets...${NC}"
fi

# Copy tag file and run Ansible
echo -e "\n${BLUE}📤 Deploying with Ansible...${NC}"
if [[ "$DRY_RUN" != "true" ]]; then
    scp "$ANSIBLE_TAG_PATH" pi@${PI_IP}:/home/pi/Professional-Website/ansible/tag.txt
    
    ANSIBLE_PATH="$PROJECT_ROOT/ansible"
    cd "$ANSIBLE_PATH" && ansible-playbook -i inventory/hosts.yml playbooks/deploy-website.yml
else
    echo -e "${GRAY}   Would copy tag file and run Ansible playbook${NC}"
fi

# Clean up old images (optional)
if [[ "$CLEANUP_ENABLED" == "true" && "$SKIP_CLEANUP" != "true" && "$DRY_RUN" != "true" ]]; then
    echo -e "\n${BLUE}🧹 Cleaning up old Docker images...${NC}"
    
    if command -v jq &> /dev/null; then
        # Frontend cleanup (keep last 5)
        FRONTEND_TAGS=$(curl -s "http://192.168.0.40:5000/v2/edwards-frontend/tags/list" | jq -r '.tags[]' 2>/dev/null | sort -r | tail -n +6)
        if [[ ! -z "$FRONTEND_TAGS" ]]; then
            echo "$FRONTEND_TAGS" | while read -r oldTag; do
                if [[ ! -z "$oldTag" ]]; then
                    MANIFEST=$(curl -s -I -H "Accept: application/vnd.docker.distribution.manifest.v2+json" "http://192.168.0.40:5000/v2/edwards-frontend/manifests/$oldTag" 2>/dev/null | grep -i "Docker-Content-Digest" | cut -d' ' -f2 | tr -d '\r')
                    if [[ ! -z "$MANIFEST" ]]; then
                        curl -s -X DELETE "http://192.168.0.40:5000/v2/edwards-frontend/manifests/$MANIFEST" 2>/dev/null || true
                    fi
                fi
            done
        fi
        
        # Backend cleanup (keep last 5)
        BACKEND_TAGS=$(curl -s "http://192.168.0.40:5000/v2/edwards-backend/tags/list" | jq -r '.tags[]' 2>/dev/null | sort -r | tail -n +6)
        if [[ ! -z "$BACKEND_TAGS" ]]; then
            echo "$BACKEND_TAGS" | while read -r oldTag; do
                if [[ ! -z "$oldTag" ]]; then
                    MANIFEST=$(curl -s -I -H "Accept: application/vnd.docker.distribution.manifest.v2+json" "http://192.168.0.40:5000/v2/edwards-backend/manifests/$oldTag" 2>/dev/null | grep -i "Docker-Content-Digest" | cut -d' ' -f2 | tr -d '\r')
                    if [[ ! -z "$MANIFEST" ]]; then
                        curl -s -X DELETE "http://192.168.0.40:5000/v2/edwards-backend/manifests/$MANIFEST" 2>/dev/null || true
                    fi
                fi
            done
        fi
        
        echo -e "${GREEN}Registry cleanup completed${NC}"
    else
        echo -e "${YELLOW}Warning: jq is not installed. Skipping registry cleanup.${NC}"
    fi
    
    docker builder prune -f
elif [[ "$CLEANUP_ENABLED" == "true" && "$DRY_RUN" == "true" ]]; then
    echo -e "\n${GRAY}🧹 Would clean up old Docker images...${NC}"
fi

# Deployment verification (production/staging)
if [[ "$ENVIRONMENT" != "development" && "$DRY_RUN" != "true" ]]; then
    echo -e "\n${BLUE}🔍 Verifying deployment...${NC}"
    
    kubectl rollout status deployment/edwards-frontend-deployment -n website --timeout=300s
    kubectl rollout status deployment/edwards-backend-deployment -n website --timeout=300s
    kubectl rollout status statefulset/postgres -n website --timeout=300s
    
    echo -e "\n${BLUE}📋 Current pod status:${NC}"
    kubectl get pods -n website
fi

echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${CYAN}🌐 Access your application at: https://edwardstech.dev${NC}"
echo -e "${NC}📊 Environment: $ENVIRONMENT | Tag: $DOCKER_TAG${NC}"

case $ENVIRONMENT in
    development)
        echo -e "\n${BLUE}💡 Development deployment complete with timestamp tag $DOCKER_TAG${NC}"
        echo -e "${GRAY}   Use for quick testing and iteration${NC}"
        ;;
    staging)
        echo -e "\n${BLUE}🎭 Staging deployment complete with security validation${NC}"
        echo -e "${GRAY}   Test thoroughly before promoting to production${NC}"
        ;;
    production)
        echo -e "\n${BLUE}🏆 Production deployment complete with full security audit${NC}"
        echo -e "${GRAY}   Monitor logs and metrics closely${NC}"
        ;;
esac
