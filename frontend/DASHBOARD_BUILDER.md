# Frontend - Dashboard Builder

Admin interface for creating and configuring dashboards for each tenant.

## Features

- 🎨 **Dashboard Designer**: Create multiple dashboards per tenant
- 🧩 **Widget Management**: Add/remove widgets (Card, Chart, Table types)
- 🔧 **Configuration**: Save/load configurations from backend
- 📱 **Responsive UI**: Built with Radix UI and Tailwind CSS

## Directory Structure

```
src/app/admin/
├── dashboard-builder/
│   └── page.tsx         # Main dashboard builder interface
└── ...other admin pages
```

## Routes

| Route                      | Purpose                       |
| -------------------------- | ----------------------------- |
| `/admin/dashboard-builder` | Dashboard designer for admins |
| `/admin/users`             | User management               |
| `/admin/invite-codes`      | Invite code management        |

## Usage

### Create a Dashboard

1. Navigate to `/admin/dashboard-builder`
2. Enter **Tenant ID** (e.g., "acme-corp")
3. Fill in **Dashboard Name** and optional description
4. Click "Create" button
5. Select the created dashboard from the list

### Add Widgets

1. Select a dashboard from the sidebar
2. In "Add Widget" section:
   - Enter widget title (e.g., "Sales Chart")
   - Select widget type: Card, Chart, or Table
   - Click "Add"
3. Widget appears in the widgets grid

### Save Configuration

1. Click "Save Config" button
2. Configuration is sent to backend and stored in Firestore
3. Success message appears when saved

## Data Structure

### Configuration

```json
{
  "tenantId": "acme-corp",
  "name": "Acme Corp",
  "dashboards": [
    {
      "id": "dashboard-1",
      "title": "Sales Dashboard",
      "description": "Main sales metrics",
      "layout": "grid",
      "gridColumns": 3,
      "widgets": [
        {
          "id": "widget-1",
          "title": "Sales Chart",
          "type": "chart",
          "size": { "width": 1, "height": 1 },
          "config": {}
        }
      ]
    }
  ]
}
```

## API Endpoints

The frontend communicates with backend at `http://localhost:3001`:

- `POST /api/tenants/:tenantId/config` - Save configuration
- `GET /api/tenants/:tenantId/config` - Get configuration
- `PUT /api/tenants/:tenantId/config` - Update configuration
- `DELETE /api/tenants/:tenantId/config` - Delete configuration

## Environment Variables

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

## Next Steps

1. Add more widget types (Metric, Gauge, etc.)
2. Implement widget configuration editor
3. Add drag-and-drop for widget reordering
4. Add color/theme customization
5. Add template gallery

## Development

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000/admin/dashboard-builder in browser.
