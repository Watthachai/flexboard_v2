# FlexBoard OnPrem - Complete Guide

> 📚 **คู่มือฉบับสมบูรณ์** - รวมทุกอย่างไว้ในไฟล์เดียว
>
> 📅 **Last Updated:** 2025-12-04  
> 📦 **Docker Version:** v1.0.0  
> 📦 **Node.js Traditional Package:** v1.0.1

---

## 📋 สารบัญ

1. [Quick Start (Dev Team)](#1-quick-start-dev-team)
2. [Overview & Architecture](#2-overview--architecture)
3. [Development Setup](#3-development-setup)
4. [Building Customer Package (Docker)](#4-building-customer-package)
5. [Node.js Traditional Package (No Docker)](#5-nodejs-traditional-package-no-docker)
6. [Registry Deployment](#6-registry-deployment)
7. [Customer Installation](#7-customer-installation)
8. [Admin Configuration](#8-admin-configuration)
9. [Troubleshooting](#9-troubleshooting)
10. [Scripts Reference](#10-scripts-reference)
11. [Changelog](#11-changelog)

---

## 1. Quick Start (Dev Team)

### 🚀 วิธีที่ 1: ใช้ Lite Package (แนะนำ)

```bash
# 1. รับไฟล์ flexboard-onprem-v1.0.0-lite.zip จาก @Watthachai

# 2. แตก zip และ start
unzip flexboard-onprem-v1.0.0-lite.zip
cd flexboard-onprem-v1.0.0-lite
chmod +x *.sh
./start.sh

# 3. เปิดเบราว์เซอร์
# Production: http://localhost:3000
# Staging:    http://localhost:3001
```

### 🚀 วิธีที่ 2: Pull ตรงจาก Registry

```bash
# 1. Login GitHub Container Registry
echo "YOUR_GITHUB_PAT_TOKEN" | docker login ghcr.io -u watthachai --password-stdin

# 2. สร้างโฟลเดอร์และ docker-compose.yml
mkdir flexboard-test && cd flexboard-test

cat > docker-compose.yml << 'EOF'
# FlexBoard OnPrem - Production & Staging (with Demo Database)

services:
  # Demo Database
  demo-db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: flexboard-demo-db
    ports:
      - "1433:1433"
    environment:
      - ACCEPT_EULA=Y
      - MSSQL_SA_PASSWORD=Test@1234!
      - MSSQL_PID=Express
    restart: unless-stopped

  # Production Proxy
  proxy-prod:
    image: ghcr.io/watthachai/flexboard-proxy:v1.0.0
    container_name: flexboard-proxy-prod
    ports:
      - "5001:5001"
    environment:
      - PORT=5001
      - CLOUD_BACKEND_URL=https://api.fittflexb.com
      - IS_DOCKER=true
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:5001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Production Frontend
  frontend-prod:
    image: ghcr.io/watthachai/flexboard-frontend-prod:v1.0.0
    container_name: flexboard-frontend-prod
    ports:
      - "3000:3000"
    depends_on:
      proxy-prod:
        condition: service_healthy
    restart: unless-stopped

  # Staging Proxy
  proxy-staging:
    image: ghcr.io/watthachai/flexboard-proxy:v1.0.0
    container_name: flexboard-proxy-staging
    ports:
      - "5002:5001"
    environment:
      - PORT=5001
      - CLOUD_BACKEND_URL=https://api-staging.fittflexb.com
      - IS_DOCKER=true
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:5001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Staging Frontend
  frontend-staging:
    image: ghcr.io/watthachai/flexboard-frontend-staging:v1.0.0
    container_name: flexboard-frontend-staging
    ports:
      - "3001:3000"
    depends_on:
      proxy-staging:
        condition: service_healthy
    restart: unless-stopped
EOF

# 3. Start
docker-compose up -d

# 4. เปิดเบราว์เซอร์
# Production: http://localhost:3000
# Staging:    http://localhost:3001
```

### 🔑 API Keys สำหรับทดสอบ

| Environment | URL                   | API Key                            |
| ----------- | --------------------- | ---------------------------------- |
| Production  | http://localhost:3000 | `NSq08sibprZOXasMNy0vXxCJHLRI5QTB` |
| Staging     | http://localhost:3001 | `QgKTenfPwUmTiANf2eJYOBwm5h_Wy3q9` |

### 📊 Ports ที่ใช้

| Service              | Port |
| -------------------- | ---- |
| Production Dashboard | 3000 |
| Staging Dashboard    | 3001 |
| Production Proxy     | 5001 |
| Staging Proxy        | 5002 |
| Demo SQL Server      | 1433 |

### 🛑 คำสั่งที่ใช้บ่อย

```bash
# หยุดระบบ
docker-compose down

# ดู logs
docker-compose logs -f

# อัพเดท version ใหม่
docker-compose pull
docker-compose up -d --force-recreate
```

---

## 2. Overview & Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     เครื่องลูกค้า (On-Premise)                     │
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
│  │  (ลูกค้ามีอยู่แล้ว)   │               │                           │
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

## 3. Development Setup

### 3.1 Prerequisites

**For Development:**

- Docker Desktop
- Node.js 20+ (for local development)
- Git

**For Customer:**

- Docker Desktop (Windows/Mac) หรือ Docker Engine (Linux)
- Internet connection (สำหรับ authentication)
- API Key จาก Admin

### 3.2 Environment Variables

```bash
# Cloud Backend URLs
CLOUD_BACKEND_URL=https://api.fittflexb.com          # Production
CLOUD_BACKEND_URL=https://api-staging.fittflexb.com  # Staging

# For Registry Push
GITHUB_TOKEN=ghp_xxxxx                                # GitHub PAT
DOCKERHUB_TOKEN=dckr_xxxxx                           # Docker Hub token
GCP_PROJECT_ID=flexboard-466304                      # GCP Project
```

### 3.3 Running Locally

```bash
# Start both Production and Staging
docker-compose -f docker-compose.onprem.both.yml up -d --build

# Check status
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}" | grep flexboard
```

**URLs:**

- Production: http://localhost:3000 (Proxy: 5001)
- Staging: http://localhost:3001 (Proxy: 5002)

### 3.4 Docker Compose Files

| File                             | Purpose                                              |
| -------------------------------- | ---------------------------------------------------- |
| `docker-compose.yml`             | Full stack development (Backend + Frontend + OnPrem) |
| `docker-compose.onprem.yml`      | OnPrem only (single environment)                     |
| `docker-compose.onprem.both.yml` | OnPrem with both Prod & Staging                      |

### 3.5 Localhost Remapping

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

## 5. Node.js Traditional Package (No Docker)

> 🚀 **สำหรับลูกค้าที่ไม่ต้องการใช้ Docker** - รันด้วย Node.js โดยตรง

### 5.1 Requirements

- **Node.js 18+** (แนะนำ Node.js 20 หรือ 22)
- **Windows 10/11**, **Windows Server 2016+**, **macOS**, หรือ **Linux**
- **Internet connection** (สำหรับ authentication กับ Cloud Backend)

### 5.2 Building Traditional Package

```bash
# Build package
./scripts/build-traditional-package.sh 1.0.1

# Output:
# dist/traditional/flexboard-onprem-v1.0.1-traditional.zip (~13MB)
```

**Package Structure:**

```
flexboard-onprem-v1.0.1-traditional/
├── frontend/               # Next.js Standalone Build
│   ├── server.js          # Entry point
│   ├── .next/             # Build output (includes BUILD_ID, server/, static/)
│   ├── node_modules/      # Minimal dependencies
│   ├── public/            # Static files
│   └── package.json
├── proxy/                  # SQL Proxy
│   ├── dist/              # Compiled TypeScript
│   ├── node_modules/
│   └── package.json
├── logs/                   # Service logs (created on start)
├── .env                    # Configuration
├── .env.example           # Configuration template
├── install.sh / install.bat
├── start.sh / start.bat
├── stop.sh / stop.bat
├── status.sh / status.bat
├── upgrade.sh
├── README.md
└── VERSION
```

### 5.3 Installation (Customer Side)

**Windows:**

1. แตก `flexboard-onprem-v1.0.1-traditional.zip`
2. ดับเบิลคลิก `install.bat`
3. ดับเบิลคลิก `start.bat`
4. เปิด http://localhost:3000

**macOS/Linux:**

```bash
unzip flexboard-onprem-v1.0.1-traditional.zip
cd flexboard-onprem-v1.0.1-traditional
chmod +x *.sh
./install.sh
./start.sh
```

### 5.4 Configuration

แก้ไขไฟล์ `.env`:

```bash
# FlexBoard OnPrem Configuration
FLEXBOARD_VERSION=1.0.1

# Proxy Settings
PROXY_PORT=5001
CLOUD_BACKEND_URL=https://api.fittflexb.com

# Frontend Settings
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=https://api.fittflexb.com
NEXT_PUBLIC_ONPREM_PROXY_URL=http://localhost:5001
```

### 5.5 Commands Reference

| Action  | Windows       | macOS/Linux    |
| ------- | ------------- | -------------- |
| Install | `install.bat` | `./install.sh` |
| Start   | `start.bat`   | `./start.sh`   |
| Stop    | `stop.bat`    | `./stop.sh`    |
| Status  | `status.bat`  | `./status.sh`  |

### 5.6 Viewing Logs

```bash
# Proxy logs
cat logs/proxy.log

# Frontend logs
cat logs/frontend.log
```

### 5.7 Comparison: Docker vs Traditional

| Feature           | Docker Package               | Traditional Package    |
| ----------------- | ---------------------------- | ---------------------- |
| Size              | ~741MB (full) / ~10KB (lite) | ~13MB                  |
| Requirements      | Docker Desktop               | Node.js 18+            |
| Isolation         | Container isolated           | Runs on host           |
| Port conflicts    | Easy to manage               | May conflict           |
| Updates           | `docker pull`                | Replace files          |
| Multi-environment | Easy (separate containers)   | Need different folders |
| Recommended for   | Production servers           | Development / Testing  |

---

## 6. Registry Deployment

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

### 5.3 Comparison: Full vs Lite Package

| Type         | Size   | Internet Required | Update Method  |
| ------------ | ------ | ----------------- | -------------- |
| Full Package | ~741MB | Install only      | Send new zip   |
| Lite Package | ~10KB  | Always            | `./upgrade.sh` |

### 5.4 Current Registry Images

```
ghcr.io/watthachai/flexboard-frontend-prod:v1.0.0
ghcr.io/watthachai/flexboard-frontend-staging:v1.0.0
ghcr.io/watthachai/flexboard-proxy:v1.0.0
```

---

## 7. Customer Installation

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

### 6.3 Commands Reference

| Action    | Windows                  | macOS/Linux    |
| --------- | ------------------------ | -------------- |
| Start     | `start.bat`              | `./start.sh`   |
| Stop      | `stop.bat`               | `./stop.sh`    |
| Upgrade   | `upgrade.bat`            | `./upgrade.sh` |
| View Logs | `docker-compose logs -f` | `./logs.sh`    |

---

## 8. Admin Configuration

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

## 9. Troubleshooting

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

## 10. Scripts Reference

### 9.1 Available Scripts

| Script                       | Purpose                         |
| ---------------------------- | ------------------------------- |
| `build-customer-package.sh`  | Build full package with .tar.gz |
| `push-to-registry.sh`        | Push images to Docker registry  |
| `create-customer-compose.sh` | Create lite package             |
| `start-onprem.sh`            | Start local development         |

### 9.2 build-customer-package.sh

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

### 9.3 push-to-registry.sh

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

### 9.4 create-customer-compose.sh

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

## 11. Changelog

### v1.0.0 (2025-12-02)

**🎉 Initial Release**

**Features:**

- ✅ OnPrem Frontend (Next.js) - Production & Staging builds
- ✅ OnPrem Proxy (Node.js) - SQL query proxy with localhost remapping
- ✅ Docker packaging scripts
- ✅ GitHub Container Registry support
- ✅ Demo database with sample data
- ✅ Full package (~741MB) and Lite package (~10KB) options

**Docker Images:**

- `ghcr.io/watthachai/flexboard-frontend-prod:v1.0.0`
- `ghcr.io/watthachai/flexboard-frontend-staging:v1.0.0`
- `ghcr.io/watthachai/flexboard-proxy:v1.0.0`

**Scripts Added:**

- `scripts/build-customer-package.sh`
- `scripts/push-to-registry.sh`
- `scripts/create-customer-compose.sh`

**Technical Details:**

- Base image: `node:25.2.1-alpine`
- SQL Server: `mssql/server:2022-latest`
- IS_DOCKER environment variable for localhost remapping

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
    └── FLEXBOARD_ONPREM_GUIDE.md      # This file (all-in-one)
```

---

## 📞 Support

- 📧 Email: support@fittflexb.com
- 👤 Contact: @Watthachai
- 📚 Repository: https://github.com/Watthachai/flexboard_v2
