# FlexBoard OnPrem - Complete Deployment Guide

> ⚠️ **เอกสารนี้ถูกรวมเข้ากับไฟล์หลักแล้ว**
>
> 📚 **กรุณาดูที่:** [FLEXBOARD_ONPREM_GUIDE.md](./FLEXBOARD_ONPREM_GUIDE.md)

---

## (Legacy Content Below - For Reference Only)

คู่มือฉบับสมบูรณ์สำหรับการ Deploy FlexBoard OnPrem ไปยังเครื่องลูกค้า

---

## 📋 สารบัญ

1. [Overview & Architecture](#1-overview--architecture)
2. [Prerequisites](#2-prerequisites)
3. [Development Setup](#3-development-setup)
4. [Building Customer Package](#4-building-customer-package)
5. [Registry Deployment](#5-registry-deployment)
6. [Customer Installation Guide](#6-customer-installation-guide)
7. [Admin Configuration](#7-admin-configuration)
8. [Troubleshooting](#8-troubleshooting)
9. [Version Management](#9-version-management)
10. [Scripts Reference](#10-scripts-reference)

---

## 1. Overview & Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       เครื่องลูกค้า (On-Premise)                    │
│                                                                 │
│  ┌──────────────────┐      ┌──────────────────┐                 │
│  │   SQL Proxy      │      │    Frontend      │                 │
│  │  (Port 5001)     │◄────►│   (Port 3000)    │                 │
│  │                  │      │                  │                 │
│  │  - Query SQL     │      │  - Dashboard UI  │                 │
│  │  - Remap hosts   │      │  - API Key Auth  │                 │
│  └────────┬─────────┘      └────────┬─────────┘                 │
│           │                         │                           │
│           ▼                         │                           │
│  ┌──────────────────┐               │                           │
│  │   SQL Server     │               │                           │
│  │  (ลูกค้ามีอยู่แล้ว)    │               │                           │
│  │  192.168.x.x     │               │                           │
│  │  หรือ Docker      │               │                           │
│  └──────────────────┘               │                           │
└─────────────────────────────────────┼───────────────────────────┘
                                      │ HTTPS (Internet)
                                      ▼
                    ┌──────────────────────────────────────────────┐
                    │           Cloud Backend (GCP)                │
                    │                                              │
                    │   Production: api.fittflexb.com              │
                    │   Staging:    api-staging.fittflexb.com      │
                    │                                              │
                    │   • Authentication (API Key)                 │
                    │   • Dashboard Configurations                 │
                    │   • DataSource Connection Configs            │
                    └──────────────────────────────────────────────┘
```

### Components

| Component            | Description     | Port                        | Technology      |
| -------------------- | --------------- | --------------------------- | --------------- |
| `onprem-frontend`    | Dashboard UI    | 3000 (prod), 3001 (staging) | Next.js         |
| `onprem-proxy`       | SQL Query Proxy | 5001 (prod), 5002 (staging) | Node.js/Express |
| `demo-db` (optional) | Demo SQL Server | 1433                        | MSSQL 2022      |

### Key Features

- ✅ **ไม่ต้องส่ง credentials** - Connection configs ถูกจัดการจาก Cloud
- ✅ **ข้อมูลไม่ออกจากเครื่องลูกค้า** - SQL queries รันที่ local
- ✅ **ติดตั้งง่าย** - Docker containers พร้อมใช้งาน
- ✅ **Localhost Remapping** - แปลง `localhost` → `host.docker.internal` อัตโนมัติ
- ✅ **Multi-environment** - รองรับทั้ง Production และ Staging

---

## 2. Prerequisites

### For Development

- Docker Desktop
- Node.js 20+ (for local development)
- Git

### For Customer

- Docker Desktop (Windows/Mac) หรือ Docker Engine (Linux)
- Internet connection (สำหรับ authentication)
- API Key จาก Admin

### Environment Variables (Development)

```bash
# Cloud Backend URLs
CLOUD_BACKEND_URL=https://api.fittflexb.com          # Production
CLOUD_BACKEND_URL=https://api-staging.fittflexb.com  # Staging

# For Registry Push
GITHUB_TOKEN=ghp_xxxxx                                # GitHub PAT
DOCKERHUB_TOKEN=dckr_xxxxx                           # Docker Hub token
GCP_PROJECT_ID=flexboard-466304                      # GCP Project
```

---

## 3. Development Setup

### 3.1 Running Locally (Both Environments)

```bash
# Start both Production and Staging
docker-compose -f docker-compose.onprem.both.yml up -d --build

# Check status
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}" | grep flexboard
```

**URLs:**

- Production: http://localhost:3000 (Proxy: 5001)
- Staging: http://localhost:3001 (Proxy: 5002)

### 3.2 Running Single Environment

```bash
# Production only
docker-compose -f docker-compose.onprem.yml up -d --build

# Staging only
CLOUD_BACKEND_URL=https://api-staging.fittflexb.com \
docker-compose -f docker-compose.onprem.yml up -d --build
```

### 3.3 Docker Compose Files

| File                             | Purpose                                              |
| -------------------------------- | ---------------------------------------------------- |
| `docker-compose.yml`             | Full stack development (Backend + Frontend + OnPrem) |
| `docker-compose.onprem.yml`      | OnPrem only (single environment)                     |
| `docker-compose.onprem.both.yml` | OnPrem with both Prod & Staging                      |

### 3.4 Localhost Remapping

เมื่อ Proxy รันใน Docker มันจะแปลง `localhost` เป็น `host.docker.internal` อัตโนมัติ:

```typescript
// onprem-proxy/src/index.ts
function remapHost(host: string): string {
  if (!IS_DOCKER) return host;

  const localhostPatterns = ["localhost", "127.0.0.1", "0.0.0.0"];
  if (localhostPatterns.includes(host.toLowerCase())) {
    return "host.docker.internal";
  }
  return host;
}
```

ทำให้ DataSource ใน Admin UI สามารถใส่ `localhost:1433` ได้ และจะทำงานได้ทั้ง:

- Backend รัน local → ใช้ `localhost` ตรงๆ
- Proxy รันใน Docker → แปลงเป็น `host.docker.internal`

---

## 4. Building Customer Package

### 4.1 Full Package (with .tar.gz images)

เหมาะสำหรับลูกค้าที่ไม่สามารถ pull จาก registry ได้

```bash
# Production only
./scripts/build-customer-package.sh v1.0.0 prod

# Staging only
./scripts/build-customer-package.sh v1.0.0 staging

# Both environments
./scripts/build-customer-package.sh v1.0.0 both

# With Demo Database (SQL Server + Sample Data)
./scripts/build-customer-package.sh v1.0.0 both --with-demo-db
```

**Output:**

```
dist/flexboard-onprem-v1.0.0/
├── flexboard-frontend-prod-v1.0.0.tar.gz    # ~73MB
├── flexboard-frontend-staging-v1.0.0.tar.gz # ~73MB
├── flexboard-proxy-v1.0.0.tar.gz            # ~71MB
├── mssql-server-2022.tar.gz                 # ~530MB (if --with-demo-db)
├── demo-db/
│   ├── sample_data.sql
│   └── init-db.sh
├── docker-compose.yml
├── install.sh / install.bat
├── start.sh / start.bat
├── stop.sh / stop.bat
├── logs.sh
└── README.md

+ dist/flexboard-onprem-v1.0.0.zip           # ~741MB (ready to send)
```

### 4.2 Package Options

| Option           | Description                      |
| ---------------- | -------------------------------- |
| `v1.0.0`         | Version tag                      |
| `prod`           | Production environment only      |
| `staging`        | Staging environment only         |
| `both`           | Both Production & Staging        |
| `--with-demo-db` | Include SQL Server + sample data |

---

## 5. Registry Deployment

### 5.1 Push to Registry

เหมาะสำหรับลูกค้าที่สามารถ pull จาก internet ได้ (ไฟล์เล็กกว่ามาก)

```bash
# GitHub Container Registry (แนะนำ)
export GITHUB_TOKEN=ghp_xxxxx
./scripts/push-to-registry.sh v1.0.0 both ghcr

# Docker Hub
export DOCKERHUB_TOKEN=dckr_xxxxx
./scripts/push-to-registry.sh v1.0.0 both dockerhub

# Google Container Registry
./scripts/push-to-registry.sh v1.0.0 both gcr
```

### 5.2 Create Lite Package

หลังจาก push แล้ว สร้าง lite package สำหรับลูกค้า:

```bash
# Basic
./scripts/create-customer-compose.sh v1.0.0 both ghcr

# With Demo Database
./scripts/create-customer-compose.sh v1.0.0 both ghcr --with-demo-db
```

**Output:**

```
dist/flexboard-onprem-v1.0.0-lite/
├── docker-compose.yml    # Points to registry
├── start.sh / start.bat  # Auto-pull + start
├── stop.sh / stop.bat
├── upgrade.sh / upgrade.bat
└── README.md

+ dist/flexboard-onprem-v1.0.0-lite.zip  # ~10KB only!
```

### 5.3 Comparison

| Type         | Size   | Internet Required | Update Method  |
| ------------ | ------ | ----------------- | -------------- |
| Full Package | ~741MB | Install only      | Send new zip   |
| Lite Package | ~10KB  | Always            | `./upgrade.sh` |

---

## 6. Customer Installation Guide

### 6.1 Full Package Installation

**Windows:**

1. แตก `flexboard-onprem-v1.0.0.zip`
2. ดับเบิลคลิก `install.bat`
3. ดับเบิลคลิก `start.bat`
4. เปิด http://localhost:3000

**macOS/Linux:**

```bash
unzip flexboard-onprem-v1.0.0.zip
cd flexboard-onprem-v1.0.0
chmod +x *.sh
./install.sh
./start.sh
```

### 6.2 Lite Package Installation

**Windows:**

1. แตก `flexboard-onprem-v1.0.0-lite.zip`
2. ดับเบิลคลิก `start.bat` (จะ pull อัตโนมัติ)
3. เปิด http://localhost:3000

**macOS/Linux:**

```bash
unzip flexboard-onprem-v1.0.0-lite.zip
cd flexboard-onprem-v1.0.0-lite
chmod +x *.sh
./start.sh
```

### 6.3 Upgrading (Lite Package)

```bash
./upgrade.sh
```

หรือ Windows: ดับเบิลคลิก `upgrade.bat`

### 6.4 Commands Reference

| Action    | Windows                  | macOS/Linux    |
| --------- | ------------------------ | -------------- |
| Start     | `start.bat`              | `./start.sh`   |
| Stop      | `stop.bat`               | `./stop.sh`    |
| Upgrade   | `upgrade.bat`            | `./upgrade.sh` |
| View Logs | `docker-compose logs -f` | `./logs.sh`    |

---

## 7. Admin Configuration

### 7.1 Before Sending to Customer

1. **สร้าง Tenant** ใน Admin UI
2. **สร้าง DataSource**
   - Type: `mssql`
   - Host: IP ของ SQL Server ลูกค้า (หรือ `localhost` ถ้าใช้ Demo DB)
   - Port: `1433`
   - Database: ชื่อ database
   - Username/Password: credentials
3. **สร้าง Dashboard** ตามความต้องการ
4. **Generate API Key** สำหรับลูกค้า

### 7.2 DataSource Host Configuration

| SQL Server Location        | Host to Use                             |
| -------------------------- | --------------------------------------- |
| Same machine as Docker     | `localhost` หรือ `host.docker.internal` |
| Another machine in network | `192.168.x.x` (IP จริง)                 |
| Cloud SQL                  | `xxx.database.windows.net`              |
| Demo Database (Docker)     | `demo-db` หรือ `localhost`              |

### 7.3 API Keys

ต้องสร้าง API Key แยกสำหรับแต่ละ environment:

| Environment | Backend URL               | API Key               |
| ----------- | ------------------------- | --------------------- |
| Production  | api.fittflexb.com         | (generate from admin) |
| Staging     | api-staging.fittflexb.com | (generate from admin) |

---

## 8. Troubleshooting

### 8.1 Connection Errors

**ปัญหา:** `Failed to connect to localhost:1433`

**สาเหตุ:** Proxy รันใน Docker แต่ SQL Server อยู่นอก container

**แก้ไข:**

1. ตรวจสอบว่า `IS_DOCKER=true` ใน docker-compose
2. ถ้า SQL Server อยู่ที่ host machine ใช้ `host.docker.internal`
3. ถ้า SQL Server อยู่เครื่องอื่น ใช้ IP จริง

### 8.2 CORS Errors

**ปัญหา:** CORS error ใน browser console

**แก้ไข:** ตรวจสอบว่า backend CORS config รองรับ:

- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:5001`
- `http://localhost:5002`

### 8.3 Port Already in Use

**แก้ไข:** แก้ port ใน `docker-compose.yml`:

```yaml
ports:
  - "3002:3000" # เปลี่ยนจาก 3000 เป็น 3002
```

### 8.4 Authentication Failed

1. ตรวจสอบว่าเชื่อมต่อ Internet ได้
2. ตรวจสอบ API Key ถูก environment หรือไม่
3. ตรวจสอบว่า API Key ยังไม่หมดอายุ

### 8.5 Demo Database Issues

**ปัญหา:** Demo DB ไม่ start

**แก้ไข:**

```bash
# ดู logs
docker-compose logs demo-db

# รอ 30 วินาทีให้ SQL Server เริ่มต้น
# แล้วรัน init script manually
docker exec -it flexboard-demo-db /docker-entrypoint-initdb.d/init-db.sh
```

---

## 9. Version Management

### 9.1 Release Workflow

```bash
# 1. Build และทดสอบ local
docker-compose -f docker-compose.onprem.both.yml up -d --build

# 2. ทดสอบ functional
# - เปิด localhost:3000, localhost:3001
# - ทดสอบ login, dashboard, queries

# 3. Push to registry
export GITHUB_TOKEN=ghp_xxxxx
./scripts/push-to-registry.sh v1.1.0 both ghcr

# 4. สร้าง customer packages
./scripts/build-customer-package.sh v1.1.0 both --with-demo-db  # Full
./scripts/create-customer-compose.sh v1.1.0 both ghcr           # Lite

# 5. Tag git release
git tag v1.1.0
git push origin v1.1.0
```

### 9.2 Version Naming

```
v{MAJOR}.{MINOR}.{PATCH}

MAJOR - Breaking changes
MINOR - New features (backward compatible)
PATCH - Bug fixes
```

### 9.3 Customer Upgrade Path

**Full Package:**

- ส่ง zip ใหม่
- ลูกค้า stop → แตกไฟล์ทับ → install → start

**Lite Package:**

- ลูกค้าแค่รัน `./upgrade.sh`
- Images จะถูก pull อัตโนมัติ

---

## 10. Scripts Reference

### 10.1 Available Scripts

| Script                       | Purpose                         |
| ---------------------------- | ------------------------------- |
| `build-customer-package.sh`  | Build full package with .tar.gz |
| `push-to-registry.sh`        | Push images to Docker registry  |
| `create-customer-compose.sh` | Create lite package             |
| `start-onprem.sh`            | Start local development         |

### 10.2 build-customer-package.sh

```bash
./scripts/build-customer-package.sh [version] [environment] [options]

# Arguments:
#   version      - Version tag (default: v1.0.0)
#   environment  - prod, staging, or both (default: both)

# Options:
#   --with-demo-db  - Include SQL Server + sample data

# Examples:
./scripts/build-customer-package.sh v1.0.0 both
./scripts/build-customer-package.sh v1.0.0 both --with-demo-db
./scripts/build-customer-package.sh v1.2.0 prod
```

### 10.3 push-to-registry.sh

```bash
./scripts/push-to-registry.sh [version] [environment] [registry]

# Arguments:
#   version      - Version tag (default: v1.0.0)
#   environment  - prod, staging, or both (default: both)
#   registry     - ghcr, dockerhub, or gcr (default: ghcr)

# Required Environment Variables:
#   GITHUB_TOKEN     - For ghcr
#   DOCKERHUB_TOKEN  - For dockerhub
#   GCP_PROJECT_ID   - For gcr

# Examples:
export GITHUB_TOKEN=ghp_xxxxx
./scripts/push-to-registry.sh v1.0.0 both ghcr
```

### 10.4 create-customer-compose.sh

```bash
./scripts/create-customer-compose.sh [version] [environment] [registry] [options]

# Arguments:
#   version      - Version tag (default: v1.0.0)
#   environment  - prod, staging, or both (default: both)
#   registry     - ghcr, dockerhub, or gcr (default: ghcr)

# Options:
#   --with-demo-db  - Include SQL Server demo database

# Examples:
./scripts/create-customer-compose.sh v1.0.0 both ghcr
./scripts/create-customer-compose.sh v1.0.0 both ghcr --with-demo-db
```

---

## 📁 Project Structure

```
flexboard_v2/
├── onprem-frontend/          # Next.js Dashboard
│   ├── Dockerfile
│   ├── src/
│   └── ...
├── onprem-proxy/             # SQL Proxy
│   ├── Dockerfile
│   ├── src/index.ts
│   └── ...
├── scripts/
│   ├── build-customer-package.sh
│   ├── push-to-registry.sh
│   ├── create-customer-compose.sh
│   ├── sample_data.sql
│   └── ...
├── docker-compose.yml                 # Full stack dev
├── docker-compose.onprem.yml          # OnPrem single env
├── docker-compose.onprem.both.yml     # OnPrem both envs
├── .env.onprem.prod
├── .env.onprem.staging
└── Docs/
    ├── ONPREM_COMPLETE_GUIDE.md       # This file
    ├── ONPREM_INSTALLATION.md
    └── DOCKER_DEPLOYMENT_GUIDE.md
```

---

## 📞 Support

- 📧 Email: support@fittflexb.com
- 📚 Docs: `/Docs` folder in repository

---

## 📝 Changelog

| Version | Date       | Changes                                   |
| ------- | ---------- | ----------------------------------------- |
| v1.0.0  | 2025-12-02 | Initial release with full & lite packages |
