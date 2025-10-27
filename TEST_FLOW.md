# Flexboard - Complete Test Flow

## 🎯 Full System Test: Admin → Code → User Login

### Prerequisites

1. ✅ Backend running on `http://localhost:3001`
2. ✅ Frontend running on `http://localhost:3000`
3. ✅ OnPrem Frontend running on `http://localhost:3000` (or different port)
4. ✅ Firebase initialized with proper credentials

---

## Step 1️⃣: Admin Creates Dashboard

### Location: Frontend Dashboard Builder

**URL**: `http://localhost:3000/admin/dashboard-builder`

### Actions:

```
1. Enter Tenant ID: "test-tenant"
2. Create Dashboard:
   - Name: "Sales Dashboard"
   - Description: "Main sales metrics"
   - Click "Create"

3. Add Widgets:
   - Widget 1: "Revenue" (type: Card)
   - Widget 2: "Sales Trend" (type: Chart)
   - Widget 3: "Top Products" (type: Table)

4. Click "Save Config"
```

### Result:

✅ Configuration saved to backend Firestore at:

```
/tenants/test-tenant/config
```

### Expected Response:

```json
{
  "success": true,
  "message": "Configuration saved successfully",
  "tenantId": "test-tenant",
  "config": {
    "tenantId": "test-tenant",
    "name": "test-tenant",
    "dashboards": [
      {
        "id": "dashboard-1234567890",
        "title": "Sales Dashboard",
        "description": "Main sales metrics",
        "layout": "grid",
        "gridColumns": 3,
        "widgets": [
          {"id": "widget-...", "title": "Revenue", "type": "card", ...},
          {"id": "widget-...", "title": "Sales Trend", "type": "chart", ...},
          {"id": "widget-...", "title": "Top Products", "type": "table", ...}
        ]
      }
    ]
  }
}
```

---

## Step 2️⃣: Admin Generates Invite Code

### Location: Frontend Admin Panel

**URL**: `http://localhost:3000/admin/invite-codes`

### Actions:

```
1. Navigate to Invite Codes management
2. Select Tenant: "test-tenant"
3. Click "Generate Code"
4. Copy the code: "TEST_TENANT-XXXXX"
5. Share with user (email/QR code)
```

### Result:

✅ Invite code created in Firestore at:

```
/inviteCodes/TEST_TENANT-XXXXX
```

### Invite Code Structure:

```json
{
  "code": "TEST_TENANT-XXXXX",
  "tenantId": "test-tenant",
  "createdAt": "2025-10-27T...",
  "expiresAt": "2025-10-27T... (24 hours later)",
  "maxUses": 1,
  "usedCount": 0,
  "permissions": ["view", "export"]
}
```

---

## Step 3️⃣: User Logs In with Invite Code

### Location: OnPrem Frontend Login Page

**URL**: `http://onprem.test-tenant.local/` (or localhost:3001 in dev)

### Actions:

```
1. Open login page
2. See form for "Invite Code"
3. Enter code: "TEST_TENANT-XXXXX"
4. Click "Login"
```

### What Happens Behind Scenes:

#### 3a: OnPrem Frontend validates code

```
POST /api/invite-codes/TEST_TENANT-XXXXX
```

#### 3b: OnPrem backend proxies to backend

```
GET http://localhost:3001/api/invite-codes/TEST_TENANT-XXXXX
```

#### 3c: Backend validates and returns:

```json
{
  "code": "TEST_TENANT-XXXXX",
  "tenantId": "test-tenant",
  "valid": true,
  "expiresAt": "2025-10-27T..."
}
```

#### 3d: OnPrem Frontend stores in localStorage:

```javascript
localStorage.setItem("tenantId", "test-tenant");
localStorage.setItem("inviteCode", "TEST_TENANT-XXXXX");
```

#### 3e: OnPrem Frontend fetches config

```
GET /api/config?tenantId=test-tenant
```

Which proxies to:

```
GET http://localhost:3001/api/tenants/test-tenant/config
```

#### 3f: Backend returns full config:

```json
{
  "tenantId": "test-tenant",
  "name": "test-tenant",
  "dashboards": [
    {
      "id": "dashboard-1234567890",
      "title": "Sales Dashboard",
      "widgets": [...]
    }
  ]
}
```

#### 3g: OnPrem Frontend stores config

```javascript
localStorage.setItem("dashboardConfig", JSON.stringify(config));
```

#### 3h: User redirected to dashboard

```
Redirect to /dashboard
```

---

## Step 4️⃣: User Views Dashboard

### Location: OnPrem Frontend Dashboard

**URL**: `http://onprem.test-tenant.local/dashboard`

### What Happens:

```
1. useEffect loads from localStorage:
   - tenantId = "test-tenant"
   - dashboardConfig = {...full config...}

2. Dashboard renders:
   - Title: "test-tenant"
   - Dashboards: "Sales Dashboard"
   - Widgets: Revenue, Sales Trend, Top Products

3. User can:
   - View dashboard layout
   - See widget placeholders
   - See logout button
```

### Expected UI:

```
┌─────────────────────────────────────────┐
│ test-tenant                    [Logout] │
├─────────────────────────────────────────┤
│ Sales Dashboard                          │
├─────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────────┐  │
│ │ Revenue      │ │ Sales Trend      │  │
│ │ (Card)       │ │ (Chart)          │  │
│ └──────────────┘ └──────────────────┘  │
│ ┌─────────────────────────────────────┐ │
│ │ Top Products (Table)                 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

### Backend Tests

- [ ] `GET /api/tenants/test-tenant/config` returns config
- [ ] `POST /api/tenants/test-tenant/config` saves config
- [ ] `GET /api/invite-codes/TEST_TENANT-XXXXX` validates code
- [ ] Firestore collections created correctly
- [ ] CORS headers allow frontend requests

### Frontend Tests

- [ ] Dashboard builder saves config successfully
- [ ] Success toast appears after save
- [ ] Widgets added to dashboard

### OnPrem Frontend Tests

- [ ] Login page renders correctly
- [ ] Invite code validation works
- [ ] Dashboard loads with correct config
- [ ] Widgets render in dashboard
- [ ] Logout clears localStorage
- [ ] Redirect to login if not authenticated

### Integration Tests

- [ ] Full flow: create config → generate code → user login → view dashboard
- [ ] Multi-dashboard support (multiple dashboards per tenant)
- [ ] Multi-tenant isolation (different tenants see different configs)

---

## 📊 API Request/Response Flow Diagram

```
┌──────────────┐
│   Admin      │
│  (Frontend)  │
└──────┬───────┘
       │ POST /admin/dashboard-builder (save config)
       ↓
┌──────────────────┐
│ Backend          │
│ Firestore        │
└──────┬───────────┘
       │ Save: /tenants/test-tenant/config
       │
       ├─ Respond with saved config
       │
┌──────▼───────┐
│ Admin        │ Generate Invite Code
│ (Frontend)   │
└──────┬───────┘
       │ POST /admin/invite-codes (generate code)
       ↓
┌──────────────────┐
│ Backend          │
│ Firestore        │
└──────┬───────────┘
       │ Save: /inviteCodes/TEST_TENANT-XXXXX
       │
       ├─ Respond with code
       │
┌──────▼─────────────────┐
│ User                    │
│ (OnPrem Frontend)       │
└──────┬─────────────────┘
       │ POST /api/invite-codes/TEST_TENANT-XXXXX (validate)
       ↓
┌──────────────────┐
│ OnPrem Backend   │
│ (Proxy)          │
└──────┬───────────┘
       │ GET http://localhost:3001/api/invite-codes/TEST_TENANT-XXXXX
       ↓
┌──────────────────┐
│ Main Backend     │
└──────┬───────────┘
       │ Check Firestore
       │ Return: {tenantId, valid: true}
       │
┌──────▼──────────┐
│ OnPrem Frontend  │
│ Fetch Config     │
└──────┬───────────┘
       │ GET /api/config?tenantId=test-tenant
       ↓
┌──────────────────┐
│ OnPrem Backend   │
│ (Proxy)          │
└──────┬───────────┘
       │ GET http://localhost:3001/api/tenants/test-tenant/config
       ↓
┌──────────────────┐
│ Main Backend     │
│ Firestore        │
└──────┬───────────┘
       │ Get: /tenants/test-tenant/config
       │ Return: full config
       │
┌──────▼──────────┐
│ OnPrem Frontend  │
│ Dashboard        │
│ Render           │
└──────────────────┘
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module" errors in backend

**Solution**: Run `npm install` in backend folder

### Issue: "Invalid invite code" error

**Solution**: Check if code exists in Firestore, verify tenantId matches

### Issue: Dashboard not loading

**Solution**: Check if config was saved, verify tenantId is correct

### Issue: CORS errors

**Solution**: Check backend CORS configuration allows frontend URLs

### Issue: Empty dashboard

**Solution**: Make sure widgets were added before saving config

---

## 📝 Example curl Commands

### Save Config (Backend Direct)

```bash
curl -X POST http://localhost:3001/api/tenants/test-tenant/config \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-tenant",
    "name": "Test Tenant",
    "dashboards": [
      {
        "id": "dashboard-1",
        "title": "Sales",
        "widgets": []
      }
    ]
  }'
```

### Get Config (Backend Direct)

```bash
curl http://localhost:3001/api/tenants/test-tenant/config
```

### Validate Invite Code (Backend Direct)

```bash
curl http://localhost:3001/api/invite-codes/TEST_TENANT-XXXXX
```

---

## ✅ Success Criteria

After completing full flow:

- ✅ Admin can create dashboard in frontend
- ✅ Admin can generate invite code
- ✅ User can login with invite code in onprem-frontend
- ✅ User sees correct dashboard
- ✅ User can logout
- ✅ Config persists in Firestore
- ✅ Multi-tenant isolation works
- ✅ No CORS errors
- ✅ No database errors

Once all tests pass, system is ready for development of:

- Real-time data endpoints
- Widget data loading
- Advanced dashboard features
