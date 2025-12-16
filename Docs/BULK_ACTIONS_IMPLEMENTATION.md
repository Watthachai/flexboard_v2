# Bulk Actions & Row Actions Implementation Summary

## ✨ What Was Added

เพิ่ม features ให้ TableWidget สามารถ:

1. **เลือกหลายแถวด้วย checkbox** และแสดง toolbar สำหรับทำ bulk actions
2. **ส่งข้อมูลไป API ภายนอก** (เช่น CRM, Marketing Platform)
3. **ปุ่ม actions ในแต่ละแถว** สำหรับการทำงานกับข้อมูลทีละรายการ
4. **Confirmation dialogs** และ **toast notifications** สำหรับ UX ที่ดี

---

## 🎯 Use Case: Panacee Customer Follow-up

### Scenario

ทีม Sales ต้องการ follow-up ลูกค้าที่:

- Tier D (Low Value / At Risk)
- ไม่มาใช้บริการมากกว่า 180 วัน

### Workflow

1. **Filter**: เลือก Tier D + recency > 180 วัน
2. **Select**: เลือกลูกค้าที่ต้องการ follow-up (checkbox)
3. **Action**: กดปุ่ม "Create Follow-up Tasks"
4. **Confirm**: ยืนยันการสร้าง tasks
5. **API Call**: ระบบส่งข้อมูลไป CRM อัตโนมัติ
6. **Success**: แสดง toast notification "สร้าง 15 tasks สำเร็จแล้ว!"

---

## 📝 Config Structure

### Bulk Actions (ทำงานกับหลายแถวที่เลือก)

```json
{
  "styleConfig": {
    "selectable": true,
    "bulkActions": [
      {
        "id": "create-follow-up-tasks",
        "label": "Create Follow-up Tasks",
        "icon": "calendar-plus",
        "type": "api",
        "confirmMessage": "สร้าง follow-up tasks สำหรับลูกค้า {count} รายที่เลือก?",
        "apiConfig": {
          "url": "https://your-crm-api.com/tasks/bulk-create",
          "method": "POST",
          "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer ${API_TOKEN}"
          },
          "payloadTemplate": {
            "source": "flexboard_panacee",
            "task_type": "customer_follow_up",
            "priority": "high",
            "customers": "${selectedRows}",
            "metadata": {
              "dashboard_id": "${dashboardId}",
              "filters": "${appliedFilters}",
              "created_at": "${timestamp}"
            }
          }
        },
        "successMessage": "สร้าง {count} tasks สำเร็จแล้ว!",
        "errorMessage": "เกิดข้อผิดพลาดในการสร้าง tasks"
      }
    ]
  }
}
```

### Row Actions (ทำงานกับแถวเดียว)

```json
{
  "styleConfig": {
    "rowActions": [
      {
        "id": "view-customer-detail",
        "label": "View Details",
        "icon": "eye",
        "type": "navigation",
        "url": "/customers/${row.coorcode}"
      },
      {
        "id": "create-single-task",
        "label": "Create Task",
        "icon": "check-square",
        "type": "api",
        "apiConfig": {
          "url": "https://your-crm-api.com/tasks/create",
          "method": "POST",
          "payloadTemplate": {
            "customer_id": "${row.coorcode}",
            "customer_name": "${row.coorname}",
            "task_type": "follow_up",
            "notes": "Customer tier: ${row.customer_tier}, Last visit: ${row.last_visit_date}"
          }
        }
      }
    ]
  }
}
```

---

## 🔧 Template Variables

ระบบจะแทนที่ตัวแปรเหล่านี้อัตโนมัติ:

| Variable            | Description                                | Example                             |
| ------------------- | ------------------------------------------ | ----------------------------------- |
| `${selectedRows}`   | Array of selected row objects              | `[{coorcode: "09-0059", ...}, ...]` |
| `${row.fieldName}`  | Value from specific field                  | `${row.coorcode}` → "09-0059"       |
| `${appliedFilters}` | Current filter state                       | `{"tierFilter": ["D - Low Value"]}` |
| `${timestamp}`      | Current ISO timestamp                      | "2025-12-16T07:30:00.000Z"          |
| `${dashboardId}`    | Widget ID                                  | "customer-table"                    |
| `{count}`           | Number of selected rows (in messages only) | "สร้าง 15 tasks สำเร็จแล้ว!"        |

---

## 🎨 UI Components Added

### 1. Bulk Actions Toolbar

```
[✓] เลือกแล้ว 5 รายการ    [📅 Create Tasks] [📤 Export] [✉️ Send Campaign] [ยกเลิก]
```

- แสดงเมื่อมีแถวที่เลือก
- มีปุ่ม actions ตาม config
- ปุ่มยกเลิกเพื่อ clear selection

### 2. Checkbox Column

```
[☑️] Select All

[☑️] Customer 1
[☐] Customer 2
[☑️] Customer 3
```

### 3. Row Actions Menu

```
⋮ (ในแต่ละแถว)
├─ 👁️ View Details
├─ ✅ Create Task
└─ 📧 Send Email
```

### 4. Confirmation Dialog

```
┌────────────────────────────────────┐
│ ยืนยันการดำเนินการ                  │
│                                    │
│ สร้าง follow-up tasks สำหรับ       │
│ ลูกค้า 5 รายที่เลือก?              │
│                                    │
│           [ยกเลิก]  [ยืนยัน]        │
└────────────────────────────────────┘
```

### 5. Toast Notifications

```
✅ สร้าง 5 tasks สำเร็จแล้ว!
❌ เกิดข้อผิดพลาดในการสร้าง tasks
```

---

## 📂 Files Modified

### `/frontend/src/components/widgets/TableWidget.tsx`

**Changes:**

1. Added imports:

   - `Checkbox` from ui/checkbox
   - `AlertDialog` components
   - `toast` from sonner
   - `* as LucideIcons` for dynamic icons
   - `MoreHorizontal` icon

2. Added props in styleConfig:

   - `selectable: boolean`
   - `bulkActions: array`
   - `rowActions: array`

3. New state:

   - `selectedRows: Set<number>`
   - `confirmAction: object | null`

4. New functions:

   - `toggleSelectAll()` - Select/deselect all rows
   - `toggleRowSelection(index)` - Toggle individual row
   - `getSelectedRowsData()` - Get data of selected rows
   - `replaceTemplateVars(template, row, allRows)` - Replace ${variables}
   - `executeBulkAction(action)` - Handle bulk action click
   - `executeRowAction(action, row)` - Handle row action click
   - `performApiCall(action, rows)` - Make API request
   - `getIcon(iconName)` - Get Lucide icon component

5. UI additions:
   - Bulk Actions Toolbar (after search bar)
   - Checkbox column in table header
   - Checkbox cells in each row
   - Row actions header column
   - Row actions menu cells
   - Confirmation AlertDialog

---

## 🚀 How to Test

### 1. Start Development Server

```bash
cd /Users/itswatthachai/flexboard_v2/frontend
npm run dev
```

### 2. Open Dashboard

Navigate to Panacee dashboard with customer table

### 3. Test Selection

- Click individual checkboxes
- Click "Select All" in header
- Verify toolbar appears with selected count

### 4. Test Bulk Action

- Filter for Tier D customers
- Select multiple rows
- Click "Create Follow-up Tasks"
- Confirm in dialog
- Check browser console/Network tab for API call
- Verify toast notification

### 5. Test Row Action

- Click ⋮ menu on any row
- Select "Create Task" or "View Details"
- Verify action executes

---

## 🐛 Troubleshooting

### Issue: Icons not showing

**Solution:** Check icon names use correct format:

- ✅ Correct: `"calendar-plus"` → `CalendarPlus`
- ❌ Wrong: `"CalendarPlus"` or `"calendar_plus"`

### Issue: API calls fail (CORS)

**Solution:**

1. Check API allows CORS from your origin
2. Or proxy requests through backend
3. For testing, use `http://localhost:3000/api/...`

### Issue: Variables not replaced

**Solution:** Check syntax:

- ✅ `"${row.coorcode}"` in JSON strings
- ✅ `"${selectedRows}"` for entire array
- ❌ `"$row.coorcode"` or `"{row.coorcode}"`

### Issue: Selection state persists after action

**Solution:** Should auto-clear after successful bulk action. Check:

- API returns success status (200-299)
- `performApiCall` completes without errors

---

## 🎉 Benefits

### For Users

- ✅ **ประหยัดเวลา**: สร้าง tasks หลายรายการพร้อมกัน
- ✅ **ลดข้อผิดพลาด**: ไม่ต้อง copy-paste ข้อมูลแต่ละราย
- ✅ **ยืดหยุ่น**: เลือกได้ว่าจะทำกับลูกค้ารายไหนบ้าง
- ✅ **โปร่งใส**: ยืนยันก่อนทำ + แจ้งเตือนผลลัพธ์

### For Developers

- ✅ **Config-driven**: แค่ปรับ JSON ไม่ต้องเขียนโค้ด
- ✅ **Reusable**: ใช้กับตารางอื่นๆ ได้ทันที
- ✅ **Extensible**: เพิ่ม actions ใหม่ได้ง่าย
- ✅ **Type-safe**: TypeScript support

---

## 📚 Resources

- Config file: `/scripts/config-for-panacee.json`
- Component: `/frontend/src/components/widgets/TableWidget.tsx`
- Test guide: `/scripts/test-bulk-actions.md`
- Lucide Icons: https://lucide.dev/icons/

---

## 🔮 Future Enhancements

Potential improvements:

1. **Keyboard shortcuts**: Ctrl+A to select all, Space to toggle
2. **Bulk edit inline**: แก้ไขหลายแถวพร้อมกัน
3. **Action history**: log การทำ bulk actions
4. **Undo/Redo**: ยกเลิกการทำ action
5. **Export templates**: export เฉพาะ columns ที่เลือก
6. **Scheduled actions**: ตั้งเวลาทำ bulk action
7. **Approval workflow**: bulk actions ต้อง approve ก่อน

---

**Status**: ✅ Ready for testing
**Next Step**: Test in development environment และปรับ config ตามจริง
