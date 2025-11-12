# 🚀 Cloud Build Triggers Configuration Guide

## วิธีสร้าง Triggers ผ่าน Console UI (แนะนำ)

### 1. ไปที่ Cloud Build Triggers

https://console.cloud.google.com/cloud-build/triggers?region=asia-southeast1&project=flexboard-466304

---

## 📦 Backend Production

1. Click **Create Trigger**
2. ตั้งค่าดังนี้:

```
Name: flexb-backend-production
Description: Deploy backend to production (Cloud Run)

Event: Push to a branch

Source:
  Repository (2nd gen): Select "Watthachai/flexboard_v2"
  Branch: ^main$

Included files filter (glob): backend/**

Configuration:
  Type: Cloud Build configuration file (yaml or json)
  Location: Repository
  Cloud Build configuration file location: backend/cloudbuild-production.yaml

Substitution variables:
  _FIREBASE_PROJECT_ID: flexboard-466304
```

3. Click **Create**

---

## 📦 Backend Staging

```
Name: flexb-backend-staging
Branch: ^(dev|staging)$
Included files filter: backend/**
Configuration: backend/cloudbuild-staging.yaml
Substitution: _FIREBASE_PROJECT_ID: flexboard-466304
```

---

## 🎨 Frontend Production

```
Name: flexb-frontend-production
Branch: ^main$
Included files filter: frontend/**
Configuration: frontend/cloudbuild-production.yaml

Substitution variables:
  _FIREBASE_PROJECT_ID: flexboard-466304
  _FIREBASE_API_KEY: AIzaSyDyxRWXb8P27zHInw2T0uzLciiTeyBMhVE
  _FIREBASE_AUTH_DOMAIN: flexboard-466304.firebaseapp.com
  _FIREBASE_STORAGE_BUCKET: flexboard-466304.firebasestorage.app
  _FIREBASE_MESSAGING_SENDER_ID: 138502326076
  _FIREBASE_APP_ID: 1:138502326076:web:40a190a04af690157b8039
```

---

## 🎨 Frontend Staging

```
Name: flexb-frontend-staging
Branch: ^(dev|staging)$
Included files filter: frontend/**
Configuration: frontend/cloudbuild-staging.yaml

(ใช้ substitution variables เหมือน production)
```

---

## 🏢 OnPrem Production

```
Name: flexb-onprem-production
Branch: ^main$
Included files filter: onprem-frontend/**
Configuration: onprem-frontend/cloudbuild-production.yaml

(ใช้ substitution variables เหมือน frontend)
```

---

## 🏢 OnPrem Staging

```
Name: flexb-onprem-staging
Branch: ^(dev|staging)$
Included files filter: onprem-frontend/**
Configuration: onprem-frontend/cloudbuild-staging.yaml

(ใช้ substitution variables เหมือน frontend)
```

---

## ✅ Checklist

สร้างครบทั้ง 6 triggers:

- [ ] flexb-backend-production
- [ ] flexb-backend-staging
- [ ] flexb-frontend-production
- [ ] flexb-frontend-staging
- [ ] flexb-onprem-production
- [ ] flexb-onprem-staging

---

## 🔐 หลังจากสร้าง Triggers แล้ว

รัน script สร้าง secrets:

```bash
chmod +x setup-secrets.sh
./setup-secrets.sh
```

---

## 🚀 ทดสอบ Deployment

```bash
# Staging
git push origin dev

# Production
git checkout main
git merge dev
git push origin main
```

---

## 📊 ดู Build Status

https://console.cloud.google.com/cloud-build/builds?project=flexboard-466304
