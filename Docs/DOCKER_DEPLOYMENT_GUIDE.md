# FlexBoard OnPrem - Docker Deployment Guide

> ⚠️ **เอกสารนี้ถูกรวมเข้ากับไฟล์หลักแล้ว**
>
> 📚 **กรุณาดูที่:** [FLEXBOARD_ONPREM_GUIDE.md](./FLEXBOARD_ONPREM_GUIDE.md)
>
> โดยเฉพาะ:
>
> - Section 4: Building Customer Package
> - Section 5: Registry Deployment
> - Section 9: Scripts Reference

---

## Quick Links

- [Building Customer Package](./FLEXBOARD_ONPREM_GUIDE.md#4-building-customer-package)
- [Registry Deployment](./FLEXBOARD_ONPREM_GUIDE.md#5-registry-deployment)
- [Scripts Reference](./FLEXBOARD_ONPREM_GUIDE.md#9-scripts-reference)

---

## (Legacy Content Below - For Reference Only)

## 📋 สารบัญ

1. [Overview](#overview)
2. [วิธีที่ 1: Export Docker Images (แนะนำ)](#วิธีที่-1-export-docker-images-แนะนำ)
3. [วิธีที่ 2: Push ไป Docker Registry](#วิธีที่-2-push-ไป-docker-registry)
4. [วิธีที่ 3: ส่ง Source Code](#วิธีที่-3-ส่ง-source-code)
5. [การตั้งค่า Cloud Backend](#การตั้งค่า-cloud-backend)
6. [ไฟล์สำหรับลูกค้า](#ไฟล์สำหรับลูกค้า)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    เครื่องลูกค้า (On-Premise)                    │
│                                                                 │
│  ┌──────────────────┐      ┌──────────────────┐                 │
│  │   SQL Proxy      │      │    Frontend      │                 │
│  │  (Port 5001)     │◄────►│   (Port 3000)    │                 │
│  └────────┬─────────┘      └──────────────────┘                 │
│           │                         │                           │
│           ▼                         │                           │
│  ┌──────────────────┐               │                           │
│  │   SQL Server     │               │                           │
│  │   (ลูกค้ามีอยู่แล้ว) │               │                           │
│  └──────────────────┘               │                           │
└─────────────────────────────────────┼───────────────────────────┘
                                      │ HTTPS (Internet)
                                      ▼
                    ┌─────────────────────────────────────────────┐
                    │           Cloud Backend                      │
                    │  • Authentication (API Key)                 │
                    │  • Dashboard Configurations                 │
                    │  • DataSource Connection Configs            │
                    └─────────────────────────────────────────────┘
```

### Components

| Component            | Description                     | Port |
| -------------------- | ------------------------------- | ---- |
| `flexboard-frontend` | Next.js Dashboard UI            | 3000 |
| `flexboard-proxy`    | SQL Proxy สำหรับ query database | 5001 |

---

## วิธีที่ 1: Export Docker Images (แนะนำ)

วิธีนี้เหมาะสำหรับลูกค้าที่ไม่สามารถเข้าถึง Internet หรือ Docker Registry ได้

### Step 1: Build Images

```bash
# ที่เครื่อง Development
cd /path/to/flexboard_v2

# Build images
docker-compose -f docker-compose.onprem.yml build
```

### Step 2: Tag Images

```bash
# Tag ด้วย version number
docker tag flexboard_v2-frontend:latest flexboard-frontend:v1.0.0
docker tag flexboard_v2-proxy:latest flexboard-proxy:v1.0.0
```

### Step 3: Export เป็นไฟล์ .tar

```bash
# สร้างโฟลเดอร์สำหรับ export
mkdir -p dist/customer-package

# Export images
docker save flexboard-frontend:v1.0.0 -o dist/customer-package/flexboard-frontend-v1.0.0.tar
docker save flexboard-proxy:v1.0.0 -o dist/customer-package/flexboard-proxy-v1.0.0.tar

# ตรวจสอบขนาดไฟล์
ls -lh dist/customer-package/
```

### Step 4: สร้างไฟล์ docker-compose สำหรับลูกค้า

สร้างไฟล์ `dist/customer-package/docker-compose.yml`:

```yaml
version: "3.8"

services:
  proxy:
    image: flexboard-proxy:v1.0.0
    container_name: flexboard-proxy
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

  frontend:
    image: flexboard-frontend:v1.0.0
    container_name: flexboard-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_CLOUD_BACKEND_URL=https://api.fittflexb.com
      - NEXT_PUBLIC_LOCAL_PROXY_URL=http://localhost:5001
    depends_on:
      proxy:
        condition: service_healthy
    restart: unless-stopped
```

### Step 5: สร้าง Script สำหรับลูกค้า

**`dist/customer-package/install.sh`** (macOS/Linux):

```bash
#!/bin/bash
echo "🚀 FlexBoard OnPrem Installation"
echo "================================"

# Load images
echo "📦 Loading Docker images..."
docker load -i flexboard-frontend-v1.0.0.tar
docker load -i flexboard-proxy-v1.0.0.tar

echo "✅ Images loaded successfully!"
echo ""
echo "📋 Available images:"
docker images | grep flexboard

echo ""
echo "🎉 Installation complete!"
echo "Run 'docker-compose up -d' to start"
```

**`dist/customer-package/install.bat`** (Windows):

```batch
@echo off
echo 🚀 FlexBoard OnPrem Installation
echo ================================

echo 📦 Loading Docker images...
docker load -i flexboard-frontend-v1.0.0.tar
docker load -i flexboard-proxy-v1.0.0.tar

echo ✅ Images loaded successfully!
echo.
echo 📋 Available images:
docker images | findstr flexboard

echo.
echo 🎉 Installation complete!
echo Run 'docker-compose up -d' to start
pause
```

**`dist/customer-package/start.sh`** (macOS/Linux):

```bash
#!/bin/bash
echo "🚀 Starting FlexBoard OnPrem..."
docker-compose up -d
echo ""
echo "✅ FlexBoard is running!"
echo "📍 Open: http://localhost:3000"
```

**`dist/customer-package/start.bat`** (Windows):

```batch
@echo off
echo 🚀 Starting FlexBoard OnPrem...
docker-compose up -d
echo.
echo ✅ FlexBoard is running!
echo 📍 Open: http://localhost:3000
pause
```

**`dist/customer-package/stop.sh`** (macOS/Linux):

```bash
#!/bin/bash
echo "🛑 Stopping FlexBoard OnPrem..."
docker-compose down
echo "✅ Stopped"
```

### Step 6: สร้าง Package สำหรับส่งลูกค้า

```bash
# สร้าง zip file
cd dist
zip -r flexboard-onprem-v1.0.0.zip customer-package/

# หรือใช้ tar.gz สำหรับ Linux
tar -czvf flexboard-onprem-v1.0.0.tar.gz customer-package/
```

### ไฟล์ที่จะส่งให้ลูกค้า

```
customer-package/
├── flexboard-frontend-v1.0.0.tar   # Docker image (~500MB)
├── flexboard-proxy-v1.0.0.tar      # Docker image (~200MB)
├── docker-compose.yml              # Compose file
├── install.sh                      # Install script (Linux/Mac)
├── install.bat                     # Install script (Windows)
├── start.sh                        # Start script
├── start.bat                       # Start script
├── stop.sh                         # Stop script
├── stop.bat                        # Stop script
└── README.md                       # คู่มือการติดตั้ง
```

### คำสั่งสำหรับลูกค้า

```bash
# 1. แตก zip
unzip flexboard-onprem-v1.0.0.zip
cd customer-package

# 2. Install (ครั้งแรกเท่านั้น)
chmod +x *.sh
./install.sh

# 3. Start
./start.sh

# 4. เปิด http://localhost:3000 แล้วใส่ API Key
```

---

## วิธีที่ 2: Push ไป Docker Registry

วิธีนี้เหมาะสำหรับลูกค้าที่สามารถเข้าถึง Internet ได้

### Option A: Docker Hub (Public/Private)

```bash
# Login
docker login

# Tag
docker tag flexboard_v2-frontend:latest yourusername/flexboard-frontend:v1.0.0
docker tag flexboard_v2-proxy:latest yourusername/flexboard-proxy:v1.0.0

# Push
docker push yourusername/flexboard-frontend:v1.0.0
docker push yourusername/flexboard-proxy:v1.0.0
```

### Option B: Google Artifact Registry

```bash
# Configure Docker for GCP
gcloud auth configure-docker asia-southeast1-docker.pkg.dev

# Tag
docker tag flexboard_v2-frontend:latest asia-southeast1-docker.pkg.dev/YOUR_PROJECT/flexboard/frontend:v1.0.0
docker tag flexboard_v2-proxy:latest asia-southeast1-docker.pkg.dev/YOUR_PROJECT/flexboard/proxy:v1.0.0

# Push
docker push asia-southeast1-docker.pkg.dev/YOUR_PROJECT/flexboard/frontend:v1.0.0
docker push asia-southeast1-docker.pkg.dev/YOUR_PROJECT/flexboard/proxy:v1.0.0
```

### Option C: GitHub Container Registry (ghcr.io)

```bash
# Login with GitHub PAT
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Tag
docker tag flexboard_v2-frontend:latest ghcr.io/watthachai/flexboard-frontend:v1.0.0
docker tag flexboard_v2-proxy:latest ghcr.io/watthachai/flexboard-proxy:v1.0.0

# Push
docker push ghcr.io/watthachai/flexboard-frontend:v1.0.0
docker push ghcr.io/watthachai/flexboard-proxy:v1.0.0
```

### docker-compose.yml สำหรับลูกค้า (Registry)

```yaml
version: "3.8"

services:
  proxy:
    image: ghcr.io/watthachai/flexboard-proxy:v1.0.0
    container_name: flexboard-proxy
    ports:
      - "5001:5001"
    environment:
      - PORT=5001
      - CLOUD_BACKEND_URL=https://api.fittflexb.com
      - IS_DOCKER=true
    restart: unless-stopped

  frontend:
    image: ghcr.io/watthachai/flexboard-frontend:v1.0.0
    container_name: flexboard-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_CLOUD_BACKEND_URL=https://api.fittflexb.com
      - NEXT_PUBLIC_LOCAL_PROXY_URL=http://localhost:5001
    depends_on:
      - proxy
    restart: unless-stopped
```

---

## วิธีที่ 3: ส่ง Source Code

วิธีนี้ให้ลูกค้า build เองที่เครื่อง

### ไฟล์ที่ต้องส่ง

```
flexboard-onprem/
├── onprem-frontend/        # Frontend source
├── onprem-proxy/           # Proxy source
├── docker-compose.onprem.yml
├── start-onprem.sh
├── start-onprem.bat
└── README.md
```

### คำสั่งสำหรับลูกค้า

```bash
docker-compose -f docker-compose.onprem.yml up -d --build
```

> ⚠️ **ข้อเสีย:** ใช้เวลา build นาน และต้องมี npm dependencies

---

## การตั้งค่า Cloud Backend

### สำหรับ Admin (ก่อนส่งให้ลูกค้า)

1. **สร้าง Tenant** ใน Admin UI
2. **สร้าง DataSource**
   - Type: `mssql`
   - Host: IP ของ SQL Server ลูกค้า (ถามลูกค้า)
   - Port: `1433`
   - Database: ชื่อ database
   - Username/Password: credentials ของลูกค้า
3. **สร้าง Dashboard**

   - เลือก DataSource ที่สร้าง
   - ตั้งค่า widgets

4. **สร้าง API Key**
   - ไปที่ Tenant Settings
   - Generate API Key
   - ส่งให้ลูกค้า

### Host Configuration

สำหรับ DataSource host:

| ลูกค้ารัน SQL Server ที่ | ใส่ Host เป็น              |
| ------------------------ | -------------------------- |
| เครื่องเดียวกับ Docker   | `host.docker.internal`     |
| เครื่องอื่นใน Network    | `192.168.x.x` (IP จริง)    |
| Cloud SQL                | `xxx.database.windows.net` |

> **Note:** Proxy จะแปลง `localhost` → `host.docker.internal` อัตโนมัติเมื่อรันใน Docker

---

## ไฟล์สำหรับลูกค้า

### README.md (สำหรับลูกค้า)

````markdown
# FlexBoard Dashboard - คู่มือติดตั้ง

## ความต้องการ

- Docker Desktop (Windows/Mac) หรือ Docker Engine (Linux)
- Internet connection (สำหรับ authentication)
- API Key (ติดต่อ Admin)

## การติดตั้ง

### Windows

1. ดับเบิลคลิก `install.bat`
2. รอจนเสร็จ

### macOS / Linux

```bash
chmod +x *.sh
./install.sh
```
````

## การใช้งาน

### เริ่มต้น

- Windows: ดับเบิลคลิก `start.bat`
- Mac/Linux: `./start.sh`

### หยุด

- Windows: ดับเบิลคลิก `stop.bat`
- Mac/Linux: `./stop.sh`

### เข้าใช้งาน

1. เปิด http://localhost:3000
2. กรอก API Key
3. เริ่มใช้งาน!

## Troubleshooting

### ไม่สามารถเปิดหน้าเว็บได้

```bash
docker-compose logs -f
```

### Port ถูกใช้งานอยู่

แก้ไข port ใน `docker-compose.yml`:

```yaml
ports:
  - "3001:3000" # เปลี่ยนจาก 3000 เป็น 3001
```

## Support

📧 support@fittflexb.com

````

---

## Automation Script

สร้าง script สำหรับ build package อัตโนมัติ:

**`scripts/build-customer-package.sh`**:

```bash
#!/bin/bash
set -e

VERSION=${1:-"v1.0.0"}
DIST_DIR="dist/flexboard-onprem-$VERSION"

echo "🚀 Building FlexBoard OnPrem Package $VERSION"
echo "============================================="

# Clean
rm -rf dist/
mkdir -p "$DIST_DIR"

# Build images
echo "📦 Building Docker images..."
docker-compose -f docker-compose.onprem.yml build

# Tag
echo "🏷️ Tagging images..."
docker tag flexboard_v2-frontend:latest flexboard-frontend:$VERSION
docker tag flexboard_v2-proxy:latest flexboard-proxy:$VERSION

# Export
echo "💾 Exporting images..."
docker save flexboard-frontend:$VERSION -o "$DIST_DIR/flexboard-frontend-$VERSION.tar"
docker save flexboard-proxy:$VERSION -o "$DIST_DIR/flexboard-proxy-$VERSION.tar"

# Copy files
echo "📋 Creating package files..."

# docker-compose.yml
cat > "$DIST_DIR/docker-compose.yml" << 'EOF'
version: "3.8"

services:
  proxy:
    image: flexboard-proxy:VERSION_PLACEHOLDER
    container_name: flexboard-proxy
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

  frontend:
    image: flexboard-frontend:VERSION_PLACEHOLDER
    container_name: flexboard-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_CLOUD_BACKEND_URL=https://api.fittflexb.com
      - NEXT_PUBLIC_LOCAL_PROXY_URL=http://localhost:5001
    depends_on:
      proxy:
        condition: service_healthy
    restart: unless-stopped
EOF

# Replace version
sed -i '' "s/VERSION_PLACEHOLDER/$VERSION/g" "$DIST_DIR/docker-compose.yml"

# install.sh
cat > "$DIST_DIR/install.sh" << EOF
#!/bin/bash
echo "🚀 FlexBoard OnPrem Installation $VERSION"
echo "=========================================="
docker load -i flexboard-frontend-$VERSION.tar
docker load -i flexboard-proxy-$VERSION.tar
echo "✅ Installation complete!"
EOF
chmod +x "$DIST_DIR/install.sh"

# start.sh
cat > "$DIST_DIR/start.sh" << 'EOF'
#!/bin/bash
docker-compose up -d
echo "✅ FlexBoard is running at http://localhost:3000"
EOF
chmod +x "$DIST_DIR/start.sh"

# stop.sh
cat > "$DIST_DIR/stop.sh" << 'EOF'
#!/bin/bash
docker-compose down
echo "✅ Stopped"
EOF
chmod +x "$DIST_DIR/stop.sh"

# Create zip
echo "📦 Creating zip package..."
cd dist
zip -r "flexboard-onprem-$VERSION.zip" "flexboard-onprem-$VERSION/"
cd ..

echo ""
echo "✅ Package created: dist/flexboard-onprem-$VERSION.zip"
echo ""
ls -lh "dist/flexboard-onprem-$VERSION.zip"
````

### ใช้งาน

```bash
chmod +x scripts/build-customer-package.sh
./scripts/build-customer-package.sh v1.0.0
```

---

## Troubleshooting

### Image ใหญ่เกินไป

```bash
# ลดขนาด image ด้วย multi-stage build (ตรวจสอบ Dockerfile)

# Compress tar files
gzip dist/customer-package/*.tar
```

### ลูกค้าไม่สามารถ load image ได้

```bash
# ตรวจสอบ Docker version
docker version

# ลอง load ด้วย verbose
docker load -i flexboard-frontend-v1.0.0.tar --quiet=false
```

### Permission denied บน Linux

```bash
sudo chmod +x *.sh
sudo ./install.sh
```

---

## Version History

| Version | Date       | Changes         |
| ------- | ---------- | --------------- |
| v1.0.0  | 2024-12-01 | Initial release |
