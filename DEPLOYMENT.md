# 🚀 Flexboard V2 - Deployment Guide

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Backend Deployment](#backend-deployment)
- [Frontend Deployment](#frontend-deployment)
- [OnPrem Frontend Deployment](#onprem-frontend-deployment)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Flexboard V2 consists of 3 main components:

1. **Backend API** - Express.js + Firebase Admin + Database Connectors
2. **Frontend Admin** - Next.js Admin Dashboard
3. **OnPrem Frontend** - Next.js End-user Dashboard

Each component can be deployed independently to Google Cloud Run.

---

## 🔧 Prerequisites

### 1. Google Cloud Setup

```bash
# Set your project ID
export PROJECT_ID="flexboard-466304"

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com

# Set default project
gcloud config set project $PROJECT_ID
```

### 2. Create Secrets in Google Secret Manager

#### Backend Secrets (Production)

```bash
# Secret Key
echo -n "your-secret-key-here" | gcloud secrets create FLEXBOARD_SECRET_KEY_PROD --data-file=-

# Firebase Service Account
gcloud secrets create FLEXBOARD_FIREBASE_SERVICE_ACCOUNT_PROD \
  --data-file=backend/flexboard-v2-firebase-adminsdk-fbsvc-fca7f36834.json
```

#### Backend Secrets (Staging)

```bash
# Secret Key
echo -n "your-staging-secret-key-here" | gcloud secrets create FLEXBOARD_SECRET_KEY_STAGING --data-file=-

# Firebase Service Account
gcloud secrets create FLEXBOARD_FIREBASE_SERVICE_ACCOUNT_STAGING \
  --data-file=backend/flexboard-v2-firebase-adminsdk-fbsvc-fca7f36834.json
```

---

## 🔨 Backend Deployment

### Production

```bash
# Deploy backend to production
gcloud builds submit \
  --config=backend/cloudbuild-production.yaml \
  --substitutions=_FIREBASE_PROJECT_ID="flexboard-466304"

# Get the deployed URL
gcloud run services describe flexboard-api-prod \
  --region=asia-southeast1 \
  --format='value(status.url)'
```

### Staging

```bash
# Deploy backend to staging
gcloud builds submit \
  --config=backend/cloudbuild-staging.yaml \
  --substitutions=_FIREBASE_PROJECT_ID="flexboard-466304"

# Get the deployed URL
gcloud run services describe flexboard-api-staging \
  --region=asia-southeast1 \
  --format='value(status.url)'
```

### Test Backend

```bash
# Health check
curl https://flexboard-api-prod-xxxxxxxxxx-as.a.run.app/health

# Expected response: {"status":"ok"}
```

---

## 🎨 Frontend Deployment

### Production

#### Step 1: Update Firebase Config

Edit `frontend/cloudbuild-production.yaml` and update these values:

```yaml
substitutions:
  _BACKEND_URL_PROD: "https://flexboard-api-prod-xxxxxxxxxx-as.a.run.app"
  _FIREBASE_API_KEY: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX"
  _FIREBASE_MESSAGING_SENDER_ID: "123456789012"
  _FIREBASE_APP_ID: "1:123456789012:web:xxxxxxxxxxxx"
```

#### Step 2: Deploy

```bash
# Deploy frontend admin
gcloud builds submit \
  --config=frontend/cloudbuild-production.yaml

# Get the deployed URL
gcloud run services describe flexboard-admin-prod \
  --region=asia-southeast1 \
  --format='value(status.url)'
```

---

## 👥 OnPrem Frontend Deployment

### Production

#### Step 1: Update Firebase Config

Edit `onprem-frontend/cloudbuild-production.yaml` and update these values:

```yaml
substitutions:
  _BACKEND_URL_PROD: "https://flexboard-api-prod-xxxxxxxxxx-as.a.run.app"
  _FIREBASE_API_KEY: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX"
  _FIREBASE_MESSAGING_SENDER_ID: "123456789012"
  _FIREBASE_APP_ID: "1:123456789012:web:xxxxxxxxxxxx"
```

#### Step 2: Deploy

```bash
# Deploy onprem frontend
gcloud builds submit \
  --config=onprem-frontend/cloudbuild-production.yaml

# Get the deployed URL
gcloud run services describe flexboard-onprem-prod \
  --region=asia-southeast1 \
  --format='value(status.url)'
```

---

## 🔐 Environment Variables

### Backend Environment Variables

| Variable              | Description         | Example            |
| --------------------- | ------------------- | ------------------ |
| `NODE_ENV`            | Environment mode    | `production`       |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `flexboard-466304` |
| `PORT`                | Server port         | `8080`             |

### Frontend Environment Variables

| Variable                                   | Description          | Example                     |
| ------------------------------------------ | -------------------- | --------------------------- |
| `NEXT_PUBLIC_BACKEND_URL`                  | Backend API URL      | `https://api.flexboard.com` |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Firebase API key     | `AIza...`                   |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Firebase auth domain | `flexboard.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Firebase project ID  | `flexboard-466304`          |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Storage bucket       | `flexboard.appspot.com`     |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID        | `123456789012`              |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Firebase app ID      | `1:123:web:xxx`             |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Google Cloud Run                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Backend    │  │   Frontend   │  │    OnPrem    │  │
│  │     API      │  │    Admin     │  │   Frontend   │  │
│  │              │  │              │  │              │  │
│  │  Port: 8080  │  │  Port: 3000  │  │  Port: 3000  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                  │                  │          │
│         └──────────────────┴──────────────────┘          │
│                            │                              │
│                    ┌───────▼────────┐                    │
│                    │   Firestore    │                    │
│                    │   Database     │                    │
│                    └────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Build Failures

#### Error: "Cannot find module"

```bash
# Make sure all dependencies are in package.json
cd backend  # or frontend/onprem-frontend
npm install
```

#### Error: "Secret not found"

```bash
# Verify secrets exist
gcloud secrets list

# Grant Cloud Build access to secrets
gcloud secrets add-iam-policy-binding FLEXBOARD_SECRET_KEY_PROD \
  --member=serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Deployment Failures

#### Error: "Service account does not have permission"

```bash
# Grant Cloud Run Admin role to Cloud Build service account
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
  --role=roles/run.admin

gcloud iam service-accounts add-iam-policy-binding \
  $PROJECT_NUMBER-compute@developer.gserviceaccount.com \
  --member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
  --role=roles/iam.serviceAccountUser
```

### Runtime Errors

#### Error: "CORS policy error"

Update backend CORS settings:

```typescript
// backend/src/index.ts
app.use(
  cors({
    origin: [
      "https://flexboard-admin-prod-xxxxxxxxxx-as.a.run.app",
      "https://flexboard-onprem-prod-xxxxxxxxxx-as.a.run.app",
    ],
    credentials: true,
  })
);
```

#### Error: "Firebase authentication failed"

Verify Firebase config in frontend:

```bash
# Check environment variables are set correctly
gcloud run services describe flexboard-admin-prod --region=asia-southeast1
```

---

## 📊 Monitoring

### View Logs

```bash
# Backend logs
gcloud run services logs read flexboard-api-prod --region=asia-southeast1

# Frontend logs
gcloud run services logs read flexboard-admin-prod --region=asia-southeast1

# OnPrem logs
gcloud run services logs read flexboard-onprem-prod --region=asia-southeast1
```

### View Metrics

```bash
# Open Cloud Console Monitoring
gcloud console monitoring --project=$PROJECT_ID
```

---

## 🔄 Rollback

### Rollback to Previous Revision

```bash
# List revisions
gcloud run revisions list --service=flexboard-api-prod --region=asia-southeast1

# Rollback to specific revision
gcloud run services update-traffic flexboard-api-prod \
  --region=asia-southeast1 \
  --to-revisions=flexboard-api-prod-00001-xxx=100
```

---

## 📝 CI/CD with GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches:
      - main # Production
      - staging # Staging

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - id: auth
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Deploy Backend
        run: |
          gcloud builds submit --config=backend/cloudbuild-production.yaml

      - name: Deploy Frontend
        run: |
          gcloud builds submit --config=frontend/cloudbuild-production.yaml

      - name: Deploy OnPrem
        run: |
          gcloud builds submit --config=onprem-frontend/cloudbuild-production.yaml
```

---

## 🎉 Success!

Your Flexboard V2 is now deployed! 🚀

- **Backend API**: https://flexboard-api-prod-xxxxxxxxxx-as.a.run.app
- **Admin Dashboard**: https://flexboard-admin-prod-xxxxxxxxxx-as.a.run.app
- **User Dashboard**: https://flexboard-onprem-prod-xxxxxxxxxx-as.a.run.app

---

## 📞 Support

If you encounter any issues:

1. Check the logs: `gcloud run services logs read SERVICE_NAME`
2. Verify environment variables
3. Check Firebase configuration
4. Review Cloud Build history: `gcloud builds list`

---

**Last Updated**: January 2025
