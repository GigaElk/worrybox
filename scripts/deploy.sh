#!/bin/bash

# Production deployment script for WorryBox
# This script handles the complete deployment process

set -e

echo "🚀 Starting WorryBox deployment..."

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_BEFORE_DEPLOY=true
HEALTH_CHECK_TIMEOUT=300

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if service is healthy
check_health() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    print_status "Checking health of $service..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f $COMPOSE_FILE ps $service | grep -q "Up (healthy)"; then
            print_status "$service is healthy"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts - waiting for $service to be healthy..."
        sleep 10
        ((attempt++))
    done
    
    print_error "$service failed to become healthy"
    return 1
}

# Pre-deployment checks
print_status "Running pre-deployment checks..."

# Check if required files exist
if [ ! -f "$COMPOSE_FILE" ]; then
    print_error "Docker compose file $COMPOSE_FILE not found"
    exit 1
fi

if [ ! -f ".env.production" ]; then
    print_error "Production environment file .env.production not found"
    exit 1
fi

# Load environment variables
source .env.production

# Create backup if requested
if [ "$BACKUP_BEFORE_DEPLOY" = true ]; then
    print_status "Creating pre-deployment backup..."
    if [ -f "scripts/backup-database.sh" ]; then
        chmod +x scripts/backup-database.sh
        ./scripts/backup-database.sh
    else
        print_warning "Backup script not found, skipping backup"
    fi
fi

# Pull latest images
print_status "Pulling latest Docker images..."
docker-compose -f $COMPOSE_FILE pull

# Build custom images
print_status "Building application images..."
docker-compose -f $COMPOSE_FILE build --no-cache

# Stop existing services gracefully
print_status "Stopping existing services..."
docker-compose -f $COMPOSE_FILE down --remove-orphans

# Start infrastructure services first
print_status "Starting infrastructure services..."
docker-compose -f $COMPOSE_FILE up -d postgres redis

# Wait for infrastructure to be ready
print_status "Waiting for infrastructure services..."
sleep 30

# Start application services
print_status "Starting application services..."
docker-compose -f $COMPOSE_FILE up -d backend frontend

# Wait for application to be ready
print_status "Waiting for application services..."
sleep 60

# Start monitoring services
print_status "Starting monitoring services..."
docker-compose -f $COMPOSE_FILE up -d prometheus grafana loki promtail

# Start reverse proxy
print_status "Starting reverse proxy..."
docker-compose -f $COMPOSE_FILE up -d traefik

# Health checks
print_status "Performing health checks..."

# Check backend health
if ! curl -f http://localhost/health > /dev/null 2>&1; then
    print_error "Backend health check failed"
    print_status "Checking backend logs..."
    docker-compose -f $COMPOSE_FILE logs --tail=50 backend
    exit 1
fi

# Check frontend
if ! curl -f http://localhost/health > /dev/null 2>&1; then
    print_error "Frontend health check failed"
    print_status "Checking frontend logs..."
    docker-compose -f $COMPOSE_FILE logs --tail=50 frontend
    exit 1
fi

# Clean up old images and containers
print_status "Cleaning up old Docker resources..."
docker system prune -f
docker image prune -f

# Display deployment summary
print_status "Deployment completed successfully! 🎉"
echo ""
echo "Services Status:"
docker-compose -f $COMPOSE_FILE ps
echo ""
echo "Application URLs:"
echo "  Frontend: https://$DOMAIN"
echo "  API: https://api.$DOMAIN"
echo "  Grafana: https://grafana.$DOMAIN"
echo "  Prometheus: https://prometheus.$DOMAIN"
echo ""
print_status "Deployment completed at $(date)"