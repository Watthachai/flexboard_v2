#!/bin/bash

# ==================== FLEXBOARD V2 - PUSH TO BITBUCKET ====================
# This script pushes monorepo subdirectories to separate Bitbucket repositories

set -e  # Exit on error

echo "🚀 Starting Bitbucket deployment..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==================== CONFIGURATION ====================
BITBUCKET_ORG="digitalvalue"
BRANCH="main"  # หรือ "dev" ถ้าต้องการ push ไป dev branch

# ==================== FUNCTIONS ====================
push_subtree() {
    local folder=$1
    local repo=$2
    
    echo -e "${BLUE}📦 Pushing ${folder} to ${repo}...${NC}"
    
    # Push using git subtree
    git subtree push --prefix=${folder} bitbucket-${repo} ${BRANCH}
    
    echo -e "${GREEN}✅ ${folder} pushed successfully!${NC}"
}

# ==================== MAIN ====================
echo "📋 Current branch: $(git branch --show-current)"
echo "📋 Last commit: $(git log -1 --oneline)"
echo ""

# Confirm before pushing
read -p "Do you want to push to Bitbucket? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Cancelled"
    exit 1
fi

# Push each directory to its corresponding Bitbucket repo
push_subtree "backend" "backend"
push_subtree "frontend" "frontend"
push_subtree "onprem-frontend" "onprem"

echo ""
echo -e "${GREEN}🎉 All repositories pushed successfully!${NC}"
echo ""
echo "📊 Bitbucket URLs:"
echo "   Backend:  https://bitbucket.org/${BITBUCKET_ORG}/flexb-backend"
echo "   Frontend: https://bitbucket.org/${BITBUCKET_ORG}/flexb-frontend"
echo "   OnPrem:   https://bitbucket.org/${BITBUCKET_ORG}/flexb-onprem"
