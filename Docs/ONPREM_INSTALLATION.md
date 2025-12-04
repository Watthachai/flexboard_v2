# FlexBoard OnPrem Installation

> ⚠️ **เอกสารนี้ถูกรวมเข้ากับไฟล์หลักแล้ว**
>
> 📚 **กรุณาดูที่:** [FLEXBOARD_ONPREM_GUIDE.md](./FLEXBOARD_ONPREM_GUIDE.md)
>
> โดยเฉพาะ:
>
> - Section 1: Quick Start (Dev Team)
> - Section 6: Customer Installation

---

## Quick Links

- [Quick Start for Dev Team](./FLEXBOARD_ONPREM_GUIDE.md#1-quick-start-dev-team)
- [Customer Installation](./FLEXBOARD_ONPREM_GUIDE.md#6-customer-installation)
- [Troubleshooting](./FLEXBOARD_ONPREM_GUIDE.md#8-troubleshooting)

---

## (Legacy Content Below - For Reference Only)

## สถาปัตยกรรม (Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                    เครื่องลูกค้า (On-Premise)                      │
│                                                                 │
│  ┌──────────────────┐      ┌──────────────────┐                 │
│  │   SQL Proxy      │      │    Frontend      │                 │
│  │  (Port 5001)     │◄────►│   (Port 3000)    │                 │
│  │                  │      │                  │                 │
│  │  ดึง connection  │      │  Dashboard UI    │                 │
│  │  จาก Cloud       │      │                  │                 │
│  └────────┬─────────┘      └────────┬─────────┘                 │
│           │                         │                           │
│           ▼                         │                           │
│  ┌──────────────────┐               │                           │
│  │   SQL Server     │               │                           │
│  │   (ลูกค้ามีอยู่แล้ว) │               │                           │
│  │   192.168.x.x    │               │                           │
│  └──────────────────┘               │                           │
└─────────────────────────────────────┼───────────────────────────┘
                                      │
                                      ▼ (Internet)
                    ┌─────────────────────────────────────────────┐
                    │           Cloud Backend (GCP)                │
                    │                                              │
                    │  • Authentication (API Key)                 │
                    │  • Dashboard Configurations                 │
                    │  • DataSource Connection Configs            │
                    │                                              │
                    │  https://api.fittflexb.com                   │
                    └─────────────────────────────────────────────┘
```

**ข้อดี:**

- ✅ ไม่ต้องส่ง Firebase credentials หรือ database password ให้ลูกค้า
- ✅ Dashboard และ Connection configs ถูกจัดการจาก Admin UI
- ✅ ข้อมูล SQL ไม่ออกจากเครื่องลูกค้า
- ✅ ติดตั้งง่าย - แค่รัน Docker (2 containers เท่านั้น!)
- ✅ รองรับหลาย Database - แต่ละ Dashboard ใช้ DataSource ของตัวเอง

## Prerequisites

ก่อนเริ่มติดตั้ง ต้องมี:

### 1. Docker Desktop

- **Windows/Mac**: ดาวน์โหลดจาก [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux**: ติดตั้ง Docker Engine และ Docker Compose

### 2. API Key

- ติดต่อ Admin เพื่อขอ API Key สำหรับเข้าใช้งาน Dashboard

### 3. SQL Server (ลูกค้ามีอยู่แล้ว)

- ต้องมี SQL Server ที่รันอยู่ในเครือข่าย
- Admin จะตั้งค่า connection ใน Cloud ให้

## ขั้นตอนการติดตั้ง

### Step 1: แตกไฟล์

แตกไฟล์ที่ได้รับและเปิด Terminal/Command Prompt ไปยังโฟลเดอร์นั้น

### Step 2: รันคำสั่ง

**macOS / Linux:**

```bash
chmod +x start-onprem.sh
./start-onprem.sh
```

**Windows:**

```cmd
start-onprem.bat
```

หรือใช้คำสั่ง Docker โดยตรง:

```bash
docker-compose -f docker-compose.onprem.yml up -d --build
```

### Step 3: รอให้ระบบพร้อม

รอประมาณ 30 วินาที ให้ services เริ่มทำงาน

### Step 4: เปิดใช้งาน

1. เปิดเบราว์เซอร์ไปที่ **http://localhost:3000**
2. กรอก **API Key** ที่ได้รับจาก Admin
3. เริ่มใช้งาน Dashboard!

## Ports ที่ใช้งาน

| Service   | Port | Description                         |
| --------- | ---- | ----------------------------------- |
| Frontend  | 3000 | Dashboard UI                        |
| SQL Proxy | 5001 | ตัวกลางเชื่อมต่อ Database ของลูกค้า |

> **หมายเหตุ:** ไม่มี SQL Server ใน Docker - ใช้ SQL Server ที่ลูกค้ามีอยู่แล้ว

## คำสั่งที่ใช้บ่อย

### ดู logs

```bash
# ดู logs ทั้งหมด
docker-compose -f docker-compose.onprem.yml logs -f

# ดู logs เฉพาะ service
docker-compose -f docker-compose.onprem.yml logs -f frontend
docker-compose -f docker-compose.onprem.yml logs -f proxy
```

### หยุดระบบ

```bash
docker-compose -f docker-compose.onprem.yml down
```

### รีสตาร์ท

```bash
docker-compose -f docker-compose.onprem.yml restart
```

### ดูสถานะ

```bash
docker-compose -f docker-compose.onprem.yml ps
```

## การตั้งค่า Database Connection

**สำคัญ:** Connection ถูกตั้งค่าจาก Admin UI ไม่ใช่ที่เครื่องลูกค้า!

### สำหรับ Admin:

1. ไปที่ Admin UI (https://admin.fittflexb.com)
2. สร้าง DataSource ใหม่:
   - **Type**: MSSQL
   - **Host**: IP ของ SQL Server ลูกค้า (เช่น 192.168.1.100)
   - **Port**: 1433
   - **Database**: ชื่อ database
   - **Username/Password**: credentials ของลูกค้า
3. สร้าง Dashboard และเลือก DataSource ที่สร้าง
4. สร้าง API Key สำหรับลูกค้า

### สำหรับลูกค้า:

- ไม่ต้องตั้งค่าอะไร แค่รัน Docker และใส่ API Key!

## Troubleshooting

### ปัญหา: Cannot connect to localhost:3000

**สาเหตุ**: Frontend ยังไม่พร้อม

**แก้ไข**:

```bash
# ดู logs
docker-compose -f docker-compose.onprem.yml logs -f frontend

# รอสักครู่แล้วลองใหม่
```

### ปัญหา: Query ไม่ทำงาน / Connection Error

**สาเหตุที่เป็นไปได้**:

1. SQL Server ไม่ได้รัน
2. Firewall บล็อก port 1433
3. Connection config ใน Cloud ไม่ถูกต้อง

**แก้ไข**:

```bash
# ดู logs ของ proxy
docker-compose -f docker-compose.onprem.yml logs proxy

# ตรวจสอบว่า SQL Server เข้าถึงได้
telnet 192.168.1.100 1433
```

แจ้ง Admin เพื่อตรวจสอบ DataSource config

### ปัญหา: Authentication failed

**สาเหตุ**: API Key ไม่ถูกต้องหรือหมดอายุ

**แก้ไข**:

- ติดต่อ Admin เพื่อขอ API Key ใหม่
- ตรวจสอบว่าเครื่องเชื่อมต่อ Internet ได้

### ปัญหา: Port 3000 หรือ 5001 ถูกใช้งานอยู่

**แก้ไข**: แก้ไข port ใน `docker-compose.onprem.yml`:

```yaml
frontend:
  ports:
    - "3001:3000" # เปลี่ยนเป็น port อื่น

proxy:
  ports:
    - "5002:5001" # เปลี่ยนเป็น port อื่น
```

แล้วแก้ `NEXT_PUBLIC_LOCAL_PROXY_URL` ให้ตรงกับ port ใหม่

## การอัพเดท

เมื่อได้รับไฟล์ใหม่จาก Admin:

```bash
# หยุด version เก่า
docker-compose -f docker-compose.onprem.yml down

# แตกไฟล์ใหม่ทับ

# Build และรันใหม่
docker-compose -f docker-compose.onprem.yml up -d --build
```

## Support

หากพบปัญหา กรุณาติดต่อ:

- 📧 Email: support@fittflexb.com
- 📱 Line: @flexboard
