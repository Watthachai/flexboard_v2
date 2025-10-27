# Flexboard Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Admin Panel)                     │
│  - Login as admin/designer                                   │
│  - Design & configure dashboards for each tenant            │
│  - Create/edit widgets, charts, layouts                     │
│  - Manage invite codes for tenant users                     │
│  - Save config to backend                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓↑
                    Backend API
    - POST /api/tenants/config  (save config)
    - GET  /api/tenants         (list all tenants)
    - GET  /api/invite-codes    (manage codes)
                          ↓↑
┌─────────────────────────────────────────────────────────────┐
│                    Invite Code System                        │
│  - Code format: TENANT_UUID-XXXXX                           │
│  - Single use (one-time code)                              │
│  - Contains tenant ID & default permissions                │
└─────────────────────────────────────────────────────────────┘
                          ↓
                   User Flow:
        1. User receives invite code (email/QR)
        2. User opens onprem-frontend
        3. User enters invite code
        4. Backend validates & returns tenant config
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              OnPrem Frontend (User Dashboard)                │
│  - One instance per tenant                                  │
│  - User login via invite code                               │
│  - GET /api/config?tenantId=xxx                            │
│  - Render widgets & charts from config                     │
│  - Real-time data from backend APIs                        │
└─────────────────────────────────────────────────────────────┘
```

## Backend API Endpoints

### Config Management (Frontend Admin)

```
POST   /api/tenants/:tenantId/config     - Save dashboard config
GET    /api/tenants/:tenantId/config     - Get dashboard config
PUT    /api/tenants/:tenantId/config     - Update config
DELETE /api/tenants/:tenantId/config     - Delete config
```

### Tenant & Auth (OnPrem Frontend)

```
GET    /api/invite-codes/:code           - Validate invite code
POST   /api/tenants/:tenantId/auth/login - Login with code (returns JWT)
GET    /api/tenants/:tenantId/config     - Get config after login
```

### Data APIs (OnPrem Frontend Data)

```
GET    /api/tenants/:tenantId/data       - Get dashboard data
GET    /api/tenants/:tenantId/widgets    - Widget data
GET    /api/tenants/:tenantId/charts     - Chart data
```

## Data Structure

### Config (Frontend → Backend)

```json
{
  "tenantId": "uuid",
  "name": "Tenant Name",
  "dashboards": [
    {
      "id": "dashboard-1",
      "title": "Main Dashboard",
      "layout": "grid",
      "widgets": [
        {
          "id": "widget-1",
          "type": "chart",
          "chartType": "line",
          "dataSource": "api-endpoint",
          "config": { ... }
        }
      ]
    }
  ]
}
```

### Invite Code

```json
{
  "code": "TENANT_UUID-XXXXX",
  "tenantId": "uuid",
  "createdAt": "timestamp",
  "expiresAt": "timestamp",
  "maxUses": 1,
  "usedCount": 0,
  "permissions": ["view", "export"]
}
```

## Folder Structure

```
flexboard_v2/
├── backend/                    # API Server (Express + Firebase)
│   └── src/
│       ├── routes/
│       │   ├── config.ts       # NEW: Config management
│       │   ├── tenants.ts      # Tenant management
│       │   └── invite-codes.ts # Invite code logic
│       └── middleware/
│           └── auth.ts         # JWT validation
│
├── frontend/                   # Admin Panel (Next.js)
│   └── src/
│       ├── app/
│       │   ├── admin/
│       │   │   ├── dashboard/  # Design dashboard
│       │   │   ├── tenants/    # Manage tenants
│       │   │   └── invite-codes/
│       │   └── api/            # Proxy to backend
│       └── components/
│
└── onprem-frontend/            # User Dashboard (Next.js)
    └── src/
        ├── app/
        │   ├── auth/login      # Invite code login
        │   ├── dashboard/      # View dashboard
        │   └── api/            # Proxy to backend
        └── hooks/
            └── useApi.ts       # Fetch config & data
```

## Authentication Flow

### Frontend (Admin)

```
1. Admin logs in (email/password or OAuth)
2. Backend issues JWT token
3. Admin has full access to create/edit configs
```

### OnPrem Frontend (User)

```
1. User enters invite code
2. Frontend validates with backend: GET /api/invite-codes/:code
3. Backend returns tenantId + one-time token
4. Frontend calls: GET /api/tenants/:tenantId/config
5. User authenticated for that tenant only
6. Can view dashboard and interact with widgets
```

## Development Workflow

1. **Frontend Admin** designs and configures dashboard
2. **Frontend** sends config to Backend: `POST /api/tenants/:tenantId/config`
3. **Backend** stores config in Firestore
4. **Frontend Admin** generates invite code for tenant
5. **Tenant User** opens onprem-frontend URL with invite code
6. **OnPrem Frontend** fetches config from backend
7. **OnPrem Frontend** renders dashboard based on config

## Deployment Considerations

- **Frontend**: Multi-tenant admin panel (SaaS)
- **OnPrem Frontend**: Single-tenant instance (deployed per tenant)
- **Backend**: Centralized API serving all tenants
- **Database**: Firestore collections organized by tenant
