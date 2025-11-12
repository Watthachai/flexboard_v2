#!/bin/bash

# ==================== SETUP SECRET MANAGER SECRETS ====================
# This script creates required secrets for Cloud Build deployment

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔐 Setting up Secret Manager secrets${NC}"
echo ""

PROJECT_ID=$(gcloud config get-value project)
echo -e "${YELLOW}📋 Project: ${PROJECT_ID}${NC}"
echo ""

# ==================== SECRET KEY ====================
echo -e "${BLUE}🔑 Generating secret keys...${NC}"

# Generate random secret keys
SECRET_KEY_PROD=$(openssl rand -hex 32)
SECRET_KEY_STAGING=$(openssl rand -hex 32)

echo -e "${GREEN}✅ Generated secret keys${NC}"
echo ""

# Create secrets
echo -e "${BLUE}📝 Creating FLEXBOARD_SECRET_KEY_PROD...${NC}"
echo -n "${SECRET_KEY_PROD}" | gcloud secrets create FLEXBOARD_SECRET_KEY_PROD \
    --data-file=- \
    --replication-policy="automatic" \
    2>/dev/null || echo -e "${YELLOW}⚠️  Secret already exists, updating...${NC}" && \
    echo -n "${SECRET_KEY_PROD}" | gcloud secrets versions add FLEXBOARD_SECRET_KEY_PROD --data-file=-

echo -e "${BLUE}📝 Creating FLEXBOARD_SECRET_KEY_STAGING...${NC}"
echo -n "${SECRET_KEY_STAGING}" | gcloud secrets create FLEXBOARD_SECRET_KEY_STAGING \
    --data-file=- \
    --replication-policy="automatic" \
    2>/dev/null || echo -e "${YELLOW}⚠️  Secret already exists, updating...${NC}" && \
    echo -n "${SECRET_KEY_STAGING}" | gcloud secrets versions add FLEXBOARD_SECRET_KEY_STAGING --data-file=-

# ==================== FIREBASE SERVICE ACCOUNT ====================
echo ""
echo -e "${BLUE}🔥 Setting up Firebase service account secrets...${NC}"

FIREBASE_SA_FILE="backend/flexboard-v2-firebase-adminsdk-fbsvc-fca7f36834.json"

if [ ! -f "${FIREBASE_SA_FILE}" ]; then
    echo -e "${RED}❌ Firebase service account file not found: ${FIREBASE_SA_FILE}${NC}"
    echo -e "${YELLOW}Please download it from Firebase Console:${NC}"
    echo "https://console.firebase.google.com/project/flexboard-466304/settings/serviceaccounts/adminsdk"
    exit 1
fi

echo -e "${BLUE}📝 Creating FLEXBOARD_FIREBASE_SERVICE_ACCOUNT_PROD...${NC}"
gcloud secrets create FLEXBOARD_FIREBASE_SERVICE_ACCOUNT_PROD \
    --data-file="${FIREBASE_SA_FILE}" \
    --replication-policy="automatic" \
    2>/dev/null || echo -e "${YELLOW}⚠️  Secret already exists, updating...${NC}" && \
    gcloud secrets versions add FLEXBOARD_FIREBASE_SERVICE_ACCOUNT_PROD --data-file="${FIREBASE_SA_FILE}"

echo -e "${BLUE}📝 Creating FLEXBOARD_FIREBASE_SERVICE_ACCOUNT_STAGING...${NC}"
gcloud secrets create FLEXBOARD_FIREBASE_SERVICE_ACCOUNT_STAGING \
    --data-file="${FIREBASE_SA_FILE}" \
    --replication-policy="automatic" \
    2>/dev/null || echo -e "${YELLOW}⚠️  Secret already exists, updating...${NC}" && \
    gcloud secrets versions add FLEXBOARD_FIREBASE_SERVICE_ACCOUNT_STAGING --data-file="${FIREBASE_SA_FILE}"

# ==================== GRANT ACCESS TO CLOUD BUILD ====================
echo ""
echo -e "${BLUE}🔓 Granting Cloud Build access to secrets...${NC}"

PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

for SECRET in FLEXBOARD_SECRET_KEY_PROD FLEXBOARD_SECRET_KEY_STAGING FLEXBOARD_FIREBASE_SERVICE_ACCOUNT_PROD FLEXBOARD_FIREBASE_SERVICE_ACCOUNT_STAGING; do
    echo -e "${BLUE}  Granting access to ${SECRET}...${NC}"
    gcloud secrets add-iam-policy-binding ${SECRET} \
        --member="serviceAccount:${CLOUD_BUILD_SA}" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet 2>/dev/null || true
done

echo ""
echo -e "${GREEN}🎉 All secrets created and configured!${NC}"
echo ""
echo -e "${BLUE}📊 View secrets at:${NC}"
echo "https://console.cloud.google.com/security/secret-manager?project=${PROJECT_ID}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Commit and push your changes:"
echo "   git add ."
echo "   git commit -m \"Add Cloud Build configuration\""
echo "   git push origin dev"
echo ""
echo "2. Merge to main to trigger production deployment:"
echo "   git checkout main"
echo "   git merge dev"
echo "   git push origin main"
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
