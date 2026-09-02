#!/bin/bash

# Server-side deploy script for Viber Bot (Compose-on-VPS)
# Expects prebuilt images in GHCR; never builds on the server.
# Usage: IMAGE_TAG=<sha> bash deploy.sh   (or rely on IMAGE_TAG in .env)

set -e

echo "Starting deployment..."

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

COMPOSE_FILE="infrastructure/docker-compose.yml"
COMPOSE=(docker compose --env-file .env -f "$COMPOSE_FILE")

# Required variables in root .env (must be set; no insecure defaults)
REQUIRED_VARS=(
  MONGO_ROOT_USER
  MONGO_ROOT_PASSWORD
  RABBITMQ_URI
  RABBITMQ_USER
  RABBITMQ_PASS
  VIBER_BOT_TOKEN
  VIBER_BOT_WEBHOOK_URL
  ADMIN_SERVICE_TOKEN
  VIBER_SERVICE_TOKEN
  SERVICE_TOKEN
  JWT_SECRET
  BOT_TOKEN_ENCRYPTION_KEY
  AI_MODEL_PROVIDER
)

if [ ! -f .env ]; then
  echo -e "${RED}.env file not found!${NC}"
  echo "Copy the template and fill in values: cp .env.example .env"
  exit 1
fi

# shellcheck disable=SC1091
set -a
# shellcheck source=/dev/null
source .env
set +a

MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING+=("$var")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo -e "${RED}.env is missing required variables:${NC}"
  for var in "${MISSING[@]}"; do
    echo "  - $var"
  done
  echo "See .env.example for the full contract."
  exit 1
fi

if ! command -v docker &> /dev/null; then
  echo -e "${RED}Docker is not installed!${NC}"
  exit 1
fi

if ! docker compose version &> /dev/null; then
  echo -e "${RED}Docker Compose plugin is not installed!${NC}"
  exit 1
fi

echo -e "${GREEN}Docker and Docker Compose are installed${NC}"
echo "IMAGE_TAG=${IMAGE_TAG:-latest}"

check_service_health() {
  local service=$1
  local url=$2
  local max_attempts=30
  local attempt=1

  echo -n "Waiting for $service to be healthy..."
  while [ $attempt -le $max_attempts ]; do
    if curl -f -s "$url" > /dev/null 2>&1; then
      echo -e " ${GREEN}ok${NC}"
      return 0
    fi
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
  done

  echo -e " ${RED}failed${NC}"
  echo -e "${RED}Service $service failed to become healthy${NC}"
  return 1
}

echo ""
echo -e "${YELLOW}Pulling images...${NC}"
"${COMPOSE[@]}" pull

echo ""
echo -e "${YELLOW}Starting services (no build)...${NC}"
"${COMPOSE[@]}" up -d

echo ""
echo -e "${GREEN}Services started${NC}"
echo "Waiting for services to be ready..."
sleep 10

echo ""
echo -e "${YELLOW}Checking service health...${NC}"
check_service_health "Admin Service" "http://localhost:3000/api/health" || true
check_service_health "Viber Service" "http://localhost:3001/health" || true

echo ""
echo -e "${GREEN}Running containers:${NC}"
"${COMPOSE[@]}" ps

echo ""
echo -e "${GREEN}Deployment complete${NC}"
echo ""
echo "Useful commands:"
echo "  View logs:     docker compose --env-file .env -f $COMPOSE_FILE logs -f"
echo "  Stop services: docker compose --env-file .env -f $COMPOSE_FILE down"
echo "  Restart:       docker compose --env-file .env -f $COMPOSE_FILE restart"
echo "  Local LLM:     docker compose --env-file .env -f $COMPOSE_FILE --profile local-llm up -d"
echo "  RAG / Chroma:  docker compose --env-file .env -f $COMPOSE_FILE --profile rag up -d"
echo ""
echo "Service URLs (behind reverse proxy in production):"
echo "  Admin:    http://localhost:3000"
echo "  Viber:    http://localhost:3001"
echo "  RabbitMQ: http://127.0.0.1:15672 (SSH tunnel)"
