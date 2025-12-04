# 📋 FlexBoard OnPrem - Changelog

> 📚 **ดู Full Documentation ที่:** [FLEXBOARD_ONPREM_GUIDE.md](./FLEXBOARD_ONPREM_GUIDE.md)

บันทึกการเปลี่ยนแปลงทุก version ของ FlexBoard OnPrem

---

## [v1.0.0] - 2025-12-02

### 🎉 Initial Release

**Features:**

- ✅ Dashboard UI สำหรับแสดงข้อมูลจาก SQL Server
- ✅ SQL Proxy สำหรับเชื่อมต่อ database ลูกค้า
- ✅ รองรับทั้ง Production และ Staging environments
- ✅ Demo SQL Server database พร้อม sample data
- ✅ Docker-based deployment

**Docker Images:**
| Image | Registry | Size |
|-------|----------|------|
| `flexboard-frontend-prod` | `ghcr.io/watthachai/flexboard-frontend-prod:v1.0.0` | ~180MB |
| `flexboard-frontend-staging` | `ghcr.io/watthachai/flexboard-frontend-staging:v1.0.0` | ~180MB |
| `flexboard-proxy` | `ghcr.io/watthachai/flexboard-proxy:v1.0.0` | ~150MB |

**Packages:**

- Full Package: `flexboard-onprem-v1.0.0.zip` (741MB) - รวม Docker images
- Lite Package: `flexboard-onprem-v1.0.0-lite.zip` (10KB) - ดึง images จาก Registry

**Technical Details:**

- Node.js: 25.2.1-alpine
- Next.js: 15.x (onprem-frontend)
- SQL Server: 2022-latest (demo)
- Docker Compose: 3.8

**API Keys (สำหรับทดสอบ):**

- Production: `NSq08sibprZOXasMNy0vXxCJHLRI5QTB`
- Staging: `QgKTenfPwUmTiANf2eJYOBwm5h_Wy3q9`

**Ports:**
| Service | Port |
|---------|------|
| Production Dashboard | 3000 |
| Staging Dashboard | 3001 |
| Production Proxy | 5001 |
| Staging Proxy | 5002 |
| Demo SQL Server | 1433 |

**Known Issues:**

- ไม่มี

---

## Version Naming Convention

- **Major (x.0.0)**: Breaking changes, major features
- **Minor (0.x.0)**: New features, backward compatible
- **Patch (0.0.x)**: Bug fixes, security patches

---

## Upgrade Guide

### จาก v0.x.x ไป v1.0.0

```bash
# 1. หยุด version เก่า
docker-compose down

# 2. Pull images ใหม่
docker-compose pull

# 3. Start ใหม่
docker-compose up -d
```

---

## Support

- 📧 Email: support@fittflexb.com
- 👤 Contact: @Watthachai
