# FlexBoard V2 - Widget Documentation

เอกสารรวมประเภท Widget ทั้งหมดที่รองรับใน FlexBoard V2 Dashboard System

## Widget Types Overview

FlexBoard V2 รองรับ **11 ประเภท Widget** สำหรับการแสดงผลข้อมูลแบบต่างๆ:

### 📊 Chart Widgets (4 types)

- **Bar Chart** - แสดงข้อมูลแบบแท่งกราฟ
- **Line Chart** - แสดงข้อมูลแบบเส้นกราฟ
- **Area Chart** - แสดงข้อมูลแบบ Area fill
- **Pie Chart** - แสดงข้อมูลแบบวงกลม/โดนัท

### 📈 Data Analysis Widgets (2 types)

- **Scatter Plot** - แสดงความสัมพันธ์ระหว่างตัวแปร 2 ตัว
- **Table** - แสดงข้อมูลแบบตาราง

### 📋 Metric Widgets (3 types)

- **KPI Widget** - แสดงตัวชี้วัดหลัก
- **Metric Card** - แสดงตัวเลขสำคัญพร้อม trend
- **Progress Bar** - แสดงความคืบหน้าเป็นเปอร์เซ็นต์

### ⚡ Indicator Widgets (2 types)

- **Gauge** - แสดงค่าแบบเกจวัด
- **Doughnut Chart** - แสดงสัดส่วนแบบโดนัท

---

## Widget Configuration

### Basic Widget Structure

```json
{
  "id": "widget-1",
  "type": "bar",
  "title": "Sales by Region",
  "dataConfig": {
    "table": "sales",
    "xField": "region",
    "yField": "amount",
    "aggregation": "sum"
  }
}
```

### Common DataConfig Properties

| Property      | Type   | Description                          | Required |
| ------------- | ------ | ------------------------------------ | -------- |
| `table`       | string | ชื่อตารางฐานข้อมูล                   | Yes\*    |
| `query`       | string | SQL Query ที่กำหนดเอง                | Yes\*    |
| `xField`      | string | ฟิลด์แกน X                           | Depends  |
| `yField`      | string | ฟิลด์แกน Y                           | Yes      |
| `aggregation` | string | ฟังก์ชัน (sum, avg, count, min, max) | No       |
| `groupBy`     | array  | ฟิลด์ที่ใช้จัดกลุ่ม                  | No       |
| `orderBy`     | array  | การเรียงลำดับ                        | No       |
| `limit`       | number | จำกัดจำนวนแถว                        | No       |

_หมายเหตุ: ต้องมี `table` หรือ `query` อย่างใดอย่างหนึ่ง_

---

## Widget Types Detail

### 1. Bar Chart (`"bar"`)

แสดงข้อมูลเป็นแท่งกราห แนวตั้งหรือแนวนอน

**Required Fields:** `xField`, `yField`

**Example:**

```json
{
  "type": "bar",
  "title": "Sales by Month",
  "dataConfig": {
    "table": "sales",
    "xField": "month",
    "yField": "revenue",
    "aggregation": "sum"
  }
}
```

### 2. Line Chart (`"line"`)

แสดงข้อมูลเป็นเส้นกราฟ เหมาะสำหรับแสดงแนวโน้มตามเวลา

**Required Fields:** `xField`, `yField`

**Example:**

```json
{
  "type": "line",
  "title": "Revenue Trend",
  "dataConfig": {
    "table": "monthly_sales",
    "xField": "date",
    "yField": "total_revenue"
  }
}
```

### 3. Area Chart (`"area"`)

แสดงข้อมูลเป็น Area fill เหมาะสำหรับแสดงแนวโน้มที่มีพื้นที่

**Required Fields:** `xField`, `yField`

**Example:**

```json
{
  "type": "area",
  "title": "Cumulative Sales",
  "dataConfig": {
    "table": "sales",
    "xField": "date",
    "yField": "cumulative_amount"
  }
}
```

### 4. Pie Chart (`"pie"`)

แสดงข้อมูลเป็นวงกลม เหมาะสำหรับแสดงสัดส่วน

**Required Fields:** `xField`, `yField`

**Example:**

```json
{
  "type": "pie",
  "title": "Market Share",
  "dataConfig": {
    "table": "products",
    "xField": "category",
    "yField": "sales_percentage"
  }
}
```

### 5. Doughnut Chart (`"doughnut"` หรือ `"donut"`)

แสดงข้อมูลเป็นโดนัท เหมาะสำหรับแสดงสัดส่วนแบบมีช่องกลาง

**Required Fields:** `xField`, `yField`

**Example:**

```json
{
  "type": "doughnut", // หรือ "donut"
  "title": "Budget Allocation",
  "dataConfig": {
    "table": "budget",
    "xField": "department",
    "yField": "allocated_amount"
  }
}
```

### 6. Scatter Plot (`"scatter"` หรือ `"scatterplot"`)

แสดงความสัมพันธ์ระหว่างตัวแปร 2 ตัว

**Required Fields:** `xField`, `yField`

**Example:**

```json
{
  "type": "scatter",
  "title": "Price vs Sales Correlation",
  "dataConfig": {
    "table": "products",
    "xField": "price",
    "yField": "units_sold"
  }
}
```

### 7. Table (`"table"`)

แสดงข้อมูลเป็นตาราง รองรับการเรียงลำดับและ pagination

**Required Fields:** ไม่จำเป็นต้องมี xField/yField

**Example:**

```json
{
  "type": "table",
  "title": "Recent Orders",
  "dataConfig": {
    "table": "orders",
    "orderBy": [{ "field": "created_at", "direction": "DESC" }],
    "limit": 10
  }
}
```

### 8. KPI Widget (`"kpi"`)

แสดงตัวชี้วัดหลัก (Key Performance Indicator)

**Required Fields:** `yField`

**Example:**

```json
{
  "type": "kpi",
  "title": "Total Revenue",
  "dataConfig": {
    "table": "sales",
    "yField": "revenue",
    "aggregation": "sum"
  }
}
```

### 9. Metric Card (`"metric"` หรือ `"metriccard"`)

แสดงตัวเลขสำคัญพร้อมการแสดง trend และ formatting

**Required Fields:** `yField`

**Optional Config:**

- `unit` - หน่วยวัด (เช่น "$", "%", "units")
- `decimals` - จำนวนทศนิยม
- `description` - คำอธิบายเพิ่มเติม

**Example:**

```json
{
  "type": "metric",
  "title": "Monthly Revenue",
  "dataConfig": {
    "table": "monthly_sales",
    "yField": "total_amount",
    "unit": "$",
    "decimals": 2,
    "description": "Total revenue for current month"
  }
}
```

### 10. Progress Bar (`"progress"` หรือ `"progressbar"`)

แสดงความคืบหน้าเป็น progress bar

**Required Fields:** `yField`

**Optional Config:**

- `maxValue` - ค่าสูงสุด (default: 100)
- `unit` - หน่วยวัด
- `xField` - ป้ายกำกับ (label)

**Example:**

```json
{
  "type": "progress",
  "title": "Project Completion",
  "dataConfig": {
    "table": "projects",
    "xField": "project_name",
    "yField": "completion_percentage",
    "unit": "%"
  }
}
```

### 11. Gauge Widget (`"gauge"`)

แสดงค่าแบบเกจวัด มีเข็มชี้ค่า

**Required Fields:** `yField`

**Example:**

```json
{
  "type": "gauge",
  "title": "Server CPU Usage",
  "dataConfig": {
    "table": "server_metrics",
    "yField": "cpu_percentage"
  }
}
```

---

## Widget Type Aliases

เพื่อความสะดวก FlexBoard รองรับ aliases หลายชื่อสำหรับ widget บางประเภท:

| Primary Type  | Aliases    |
| ------------- | ---------- |
| `doughnut`    | `donut`    |
| `scatterplot` | `scatter`  |
| `metriccard`  | `metric`   |
| `progressbar` | `progress` |

---

## Data Query Options

### Option 1: Table-based (Recommended)

```json
{
  "dataConfig": {
    "table": "sales",
    "xField": "category",
    "yField": "amount",
    "aggregation": "sum",
    "groupBy": ["category"],
    "orderBy": [{ "field": "amount", "direction": "DESC" }],
    "limit": 10
  }
}
```

### Option 2: Custom Query

```json
{
  "dataConfig": {
    "query": "SELECT category, SUM(amount) as total FROM sales GROUP BY category ORDER BY total DESC LIMIT 10"
  }
}
```

---

## Best Practices

### 1. Chart Widgets

- ใช้ `xField` สำหรับป้ายกำกับหรือหมวดหมู่
- ใช้ `yField` สำหรับค่าตัวเลข
- เพิ่ม `aggregation` เมื่อต้องการรวมข้อมูล

### 2. Metric Widgets

- ใช้ `aggregation` เพื่อคำนวณค่ารวม (sum, avg, count)
- เพิ่ม `unit` และ `decimals` สำหรับ formatting
- เพิ่ม `description` เพื่ออธิบายความหมาย

### 3. Table Widget

- ใช้ `orderBy` เพื่อเรียงลำดับ
- ใช้ `limit` เพื่อจำกัดจำนวนแถว
- ไม่จำเป็นต้องระบุ `xField`/`yField`

### 4. Performance Tips

- ใช้ `limit` เพื่อจำกัดจำนวนข้อมูล
- ใช้ index ใน database สำหรับฟิลด์ที่ใช้ใน `orderBy`
- หลีกเลี่ยง `SELECT *` ในการ query ขนาดใหญ่

---

## Error Handling

### Common Issues

1. **"No data or missing configuration"**

   - ตรวจสอบว่ามี `table` หรือ `query`
   - ตรวจสอบว่า `yField` ถูกต้อง

2. **"Unsupported widget type"**

   - ตรวจสอบชื่อ `type` ให้ถูกต้อง
   - ใช้ aliases ที่รองรับ

3. **Chart dimension errors**
   - Widget จะมี `minHeight={200}` อัตโนมัติ
   - ใช้ `ResponsiveContainer` สำหรับ responsive design

---

## Migration Notes

จากเวอร์ชันเก่า (7 widgets) เป็นเวอร์ชันใหม่ (11 widgets):

### Widget เดิม ✅

- bar, line, pie, doughnut, table, kpi, gauge

### Widget ใหม่ 🆕

- **area** - Area chart สำหรับแสดงแนวโน้ม
- **scatter** - Scatter plot สำหรับ correlation
- **metric** - Metric card พร้อม trend indicator
- **progress** - Progress bar สำหรับ completion status

### Aliases ใหม่ 🔄

- `donut` → `doughnut`
- `scatterplot` → `scatter`
- `metriccard` → `metric`
- `progressbar` → `progress`

---

## Support

สำหรับข้อสงสัยเพิ่มเติมเกี่ยวกับ Widget configuration:

- ดู examples ใน dashboard wizard
- ทดสอบใน preview mode ก่อน deploy
- ใช้ AI Assistant เพื่อสร้าง configuration อัตโนมัติ
