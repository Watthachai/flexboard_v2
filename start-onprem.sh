#!/bin/bash

# ==============================================================================
# FlexBoard OnPrem Startup Script
# ==============================================================================

# Default to production
ENV=${1:-prod}

if [ "$ENV" = "staging" ]; then
  ENV_FILE=".env.onprem.staging"
  BACKEND_URL="https://api-staging.fittflexb.com"
  echo "🧪 Starting FlexBoard OnPrem (STAGING)..."
else
  ENV_FILE=".env.onprem.prod"
  BACKEND_URL="https://api.fittflexb.com"
  echo "🚀 Starting FlexBoard OnPrem (PRODUCTION)..."
fi

echo ""
echo "This will start:"
echo "  - Frontend (port 3000) - Dashboard UI"
echo "  - SQL Proxy (port 5001) - Connects to your SQL Server"
echo ""
echo "Cloud Backend: $BACKEND_URL"
echo ""

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Error: Docker is not running. Please start Docker Desktop first."
  exit 1
fi

# Start containers with environment file
echo "📦 Building and starting containers..."
docker-compose -f docker-compose.onprem.yml --env-file $ENV_FILE up -d --build

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

echo ""
echo "==============================================" 
echo "🎉 FlexBoard OnPrem is running! ($ENV)"
echo "=============================================="
echo ""
echo "  📊 Dashboard: http://localhost:3000"
echo "  🔌 SQL Proxy: http://localhost:5001"
echo "  🌐 Backend:   $BACKEND_URL"
echo ""
echo "  📝 View logs: docker-compose -f docker-compose.onprem.yml logs -f"
echo "  🛑 Stop:      docker-compose -f docker-compose.onprem.yml down"
echo "=============================================="
echo ""
echo "Usage:"
echo "  ./start-onprem.sh          # Production"
echo "  ./start-onprem.sh staging  # Staging"
echo "=============================================="