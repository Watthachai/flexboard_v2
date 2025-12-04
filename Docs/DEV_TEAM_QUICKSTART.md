# 🚀 FlexBoard OnPrem - Quick Start for Dev Team

> ⚠️ **เอกสารนี้ถูกรวมเข้ากับไฟล์หลักแล้ว**
>
> 📚 **กรุณาดูที่:** [FLEXBOARD_ONPREM_GUIDE.md](./FLEXBOARD_ONPREM_GUIDE.md)
>
> โดยเฉพาะ **Section 1: Quick Start (Dev Team)**

---

## (Legacy Content Below - For Reference Only)

## วิธีทดสอบ FlexBoard OnPrem

### Option 1: ใช้ Lite Package (แนะนำ)

```bash
# 1. Download และแตก lite package
# (รับไฟล์จาก @Watthachai หรือ download จาก shared drive)

# 2. แตก zip
unzip flexboard-onprem-v1.0.0-lite.zip
cd flexboard-onprem-v1.0.0-lite

# 3. Start (จะ pull images อัตโนมัติ)
chmod +x *.sh
./start.sh

# 4. เปิดเบราว์เซอร์
# Production: http://localhost:3000
# Staging:    http://localhost:3001
```

---

### Option 2: Pull ตรงจาก Registry

```bash
# 1. Login GitHub Container Registry
echo "YOUR_GITHUB_PAT_TOKEN" | docker login ghcr.io -u watthachai --password-stdin

# 2. สร้างโฟลเดอร์
mkdir flexboard-test && cd flexboard-test

# 3. สร้าง docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: "3.8"

services:
  # Demo Database
  demo-db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: flexboard-demo-db
    ports:
      - "1433:1433"
    environment:
      - ACCEPT_EULA=Y
      - MSSQL_SA_PASSWORD=Test1234
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

# 4. Start
docker-compose up -d

# 5. เปิดเบราว์เซอร์
# Production: http://localhost:3000
# Staging:    http://localhost:3001
```

---

## 🔑 API Keys สำหรับทดสอบ

| Environment | URL                   | API Key                            |
| ----------- | --------------------- | ---------------------------------- |
| Production  | http://localhost:3000 | `NSq08sibprZOXasMNy0vXxCJHLRI5QTB` |
| Staging     | http://localhost:3001 | `QgKTenfPwUmTiANf2eJYOBwm5h_Wy3q9` |

---

## 📊 Ports ที่ใช้

| Service              | Port |
| -------------------- | ---- |
| Production Dashboard | 3000 |
| Staging Dashboard    | 3001 |
| Production Proxy     | 5001 |
| Staging Proxy        | 5002 |
| Demo SQL Server      | 1433 |

---

## 🛑 หยุดระบบ

```bash
docker-compose down
```

---

## 🔄 อัพเดท Version ใหม่

```bash
docker-compose pull
docker-compose up -d --force-recreate
```

---

## ❓ มีปัญหา?

1. ดู logs: `docker-compose logs -f`
2. ติดต่อ @Watthachai
