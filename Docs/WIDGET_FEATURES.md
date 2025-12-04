['# 📊 FlexBoard v2 - Widget Features Documentation

> **Last Updated:** November 27, 2025  
> **Version:** 2.1.0  
> **Branch:** feat_global_filter

---

## 📋 Table of Contents

1. [Changelog](#-changelog)
2. [Widget Types](#-widget-types)
3. [Data Configuration](#-data-configuration)
4. [Global Filters](#-global-filters)
5. [Multi-Line Charts](#-multi-line-charts)
6. [Style Configuration](#-style-configuration)
7. [Examples](#-examples)

---

## 📝 Changelog

### v2.1.0 (November 27, 2025)

#### ✨ New Features

- **Multi-Line Chart Support** - สามารถแสดงกราฟเส้นหลายเส้นใน widget เดียว
  - `multiLine` + `lines[]` - กำหนด fields แบบ explicit
  - `seriesField` - สร้างเส้นอัตโนมัติจาก unique values ใน field
- **SeriesField Pivot** - ระบบ pivot ข้อมูลอัตโนมัติสำหรับ multi-line by category

#### 🔧 Improvements

- เพิ่ม color palette เป็น 10 สี
- Tooltip รองรับ multi-line และ seriesField
- WidgetRenderer สร้าง SQL query สำหรับ seriesField ได้ถูกต้อง

### v2.0.0 (November 26, 2025)

#### ✨ New Features

- **Global Filters** - ระบบกรองข้อมูลทั้ง dashboard
  - Date Range Filter (เลือกช่วงวันที่)
  - Dropdown Filter (เลือกค่าจาก options)
  - Text Filter (ค้นหา LIKE)
- **Filter Configuration in JSON** - กำหนด global filters ใน config

#### 🔧 Improvements

- Date filters ใช้ `CAST(field AS DATE)` สำหรับ SQL Server compatibility
- Global filters รวมกับ widget filters ใน WHERE clause

### v1.5.0 (November 25, 2025)

#### ✨ New Features

- **AI Config Assistant** - ช่วยสร้าง/แก้ไข widget config
- **Diff Editor** - แสดง diff ก่อน apply changes จาก AI
- **Version Management** - บันทึกและเปลี่ยน version ของ config

### v1.0.0 (Initial Release)

- Widget Types: bar, line, area, pie, doughnut, scatter, kpi, metric, progress, gauge, table
- Grid Layout System
- Basic Data Configuration
- Style Configuration

---

## 🎨 Widget Types

| Type       | Description    | Thai            |
| ---------- | -------------- | --------------- |
| `bar`      | Bar Chart      | กราฟแท่ง        |
| `line`     | Line Chart     | กราฟเส้น        |
| `area`     | Area Chart     | กราฟพื้นที่     |
| `pie`      | Pie Chart      | กราฟวงกลม       |
| `doughnut` | Doughnut Chart | กราฟโดนัท       |
| `scatter`  | Scatter Plot   | กราฟกระจาย      |
| `kpi`      | KPI Card       | การ์ด KPI       |
| `metric`   | Metric Card    | การ์ดแสดงตัวเลข |
| `progress` | Progress Bar   | แถบความคืบหน้า  |
| `gauge`    | Gauge          | เกจวัด          |
| `table`    | Data Table     | ตารางข้อมูล     |

---

## 📊 Data Configuration

### Basic Structure

```json
{
  "dataConfig": {
    "table": "TABLE_NAME",
    "xField": "column_for_x_axis",
    "yField": "column_for_y_axis",
    "aggregation": "sum",
    "groupBy": ["field1", "field2"],
    "orderBy": [{ "field": "column", "direction": "DESC" }],
    "filters": [{ "field": "status", "operator": "=", "value": "active" }],
    "limit": 100
  }
}
```

### Field Options

| Property      | Type     | Description                                           |
| ------------- | -------- | ----------------------------------------------------- |
| `table`       | string   | ชื่อ table/view                                       |
| `query`       | string   | Custom SQL query (แทน table)                          |
| `xField`      | string   | Column สำหรับแกน X                                    |
| `yField`      | string   | Column สำหรับแกน Y                                    |
| `labelField`  | string   | สำหรับ pie/doughnut (แทน xField)                      |
| `valueField`  | string   | สำหรับ pie/doughnut (แทน yField)                      |
| `field`       | string   | สำหรับ KPI/metric (single field)                      |
| `aggregation` | string   | `sum`, `avg`, `count`, `count_distinct`, `min`, `max` |
| `groupBy`     | string[] | Fields สำหรับ GROUP BY                                |
| `orderBy`     | object[] | `[{ field, direction }]`                              |
| `filters`     | object[] | Widget-level filters                                  |
| `having`      | object   | `{ field, operator, value }`                          |
| `limit`       | number   | จำนวน rows สูงสุด                                     |
| `unlimited`   | boolean  | ถ้า true จะไม่มี limit                                |

### Aggregation Options

| Value            | SQL Function      | Description    |
| ---------------- | ----------------- | -------------- |
| `sum`            | `SUM()`           | ผลรวม          |
| `avg`            | `AVG()`           | ค่าเฉลี่ย      |
| `count`          | `COUNT()`         | จำนวนนับ       |
| `count_distinct` | `COUNT(DISTINCT)` | จำนวนนับไม่ซ้ำ |
| `min`            | `MIN()`           | ค่าต่ำสุด      |
| `max`            | `MAX()`           | ค่าสูงสุด      |

---

## 🔍 Global Filters

### Configuration in Dashboard Config

```json
{
  "globalFilters": [
    {
      "id": "date_range",
      "type": "dateRange",
      "label": "📅 ช่วงวันที่",
      "field": "docDate",
      "defaultValue": {
        "start": "2025-01-01",
        "end": "2025-12-31"
      }
    },
    {
      "id": "branch_filter",
      "type": "dropdown",
      "label": "🏢 สาขา",
      "field": "branch",
      "options": ["HQ", "สาขา 1", "สาขา 2"],
      "defaultValue": ""
    },
    {
      "id": "search_product",
      "type": "text",
      "label": "🔍 ค้นหาสินค้า",
      "field": "prodName",
      "placeholder": "พิมพ์ชื่อสินค้า..."
    }
  ]
}
```

### Filter Types

| Type        | Description       | Operator         |
| ----------- | ----------------- | ---------------- |
| `dateRange` | เลือกช่วงวันที่   | `>=` และ `<=`    |
| `dropdown`  | เลือกจาก dropdown | `=`              |
| `text`      | พิมพ์ค้นหา        | `LIKE '%value%'` |

### How It Works

1. User เปลี่ยนค่า filter ใน UI
2. ระบบสร้าง `GlobalFilterCondition[]`
3. WidgetRenderer รวม global filters กับ widget filters
4. สร้าง SQL query พร้อม WHERE clause ที่รวมทุก conditions

---

## 📈 Multi-Line Charts

### Option 1: Explicit Lines (multiLine + lines)

ใช้เมื่อต้องการเปรียบเทียบ **หลาย fields** ใน chart เดียว

```json
{
  "id": "widget_multiline_comparison_001",
  "title": "📈 Buy Price vs Average Cost Comparison",
  "type": "line",
  "dataConfig": {
    "table": "VVPVSG_INVENTORY_001_VIEW_001",
    "xField": "docDate",
    "multiLine": true,
    "lines": [
      {
        "id": "buyPrice",
        "yField": "totalFromBuyPrice",
        "aggregation": "sum",
        "label": "มูลค่าราคาซื้อ",
        "color": "#8884d8"
      },
      {
        "id": "avgCost",
        "yField": "totalFromAverageCost",
        "aggregation": "sum",
        "label": "มูลค่าต้นทุนเฉลี่ย",
        "color": "#82ca9d"
      }
    ],
    "groupBy": ["docDate"],
    "orderBy": [{ "field": "docDate", "direction": "ASC" }]
  }
}
```

**SQL Generated:**

```sql
SELECT docDate,
       SUM(totalFromBuyPrice) as totalFromBuyPrice,
       SUM(totalFromAverageCost) as totalFromAverageCost
FROM VVPVSG_INVENTORY_001_VIEW_001
GROUP BY docDate
ORDER BY docDate ASC
```

### Option 2: SeriesField (Dynamic Lines by Category)

ใช้เมื่อต้องการสร้างเส้นหลายเส้นจาก **unique values** ใน field

```json
{
  "id": "widget_multiline_by_branch_001",
  "title": "🏢 Sales Trend by Branch",
  "type": "line",
  "dataConfig": {
    "table": "VVPVSG_INVENTORY_001_VIEW_001",
    "xField": "docDate",
    "yField": "totalFromBuyPrice",
    "seriesField": "branch",
    "aggregation": "sum",
    "groupBy": ["docDate", "branch"],
    "orderBy": [{ "field": "docDate", "direction": "ASC" }]
  }
}
```

**SQL Generated:**

```sql
SELECT docDate, branch, SUM(totalFromBuyPrice) as totalFromBuyPrice
FROM VVPVSG_INVENTORY_001_VIEW_001
GROUP BY docDate, branch
ORDER BY docDate ASC
```

**Data Transformation (Pivot):**

Raw data:

```
| docDate    | branch   | totalFromBuyPrice |
|------------|----------|-------------------|
| 2025-01-01 | HQ       | 10000             |
| 2025-01-01 | สาขา 1   | 8000              |
| 2025-01-02 | HQ       | 12000             |
| 2025-01-02 | สาขา 1   | 9000              |
```

Pivoted for chart:

```
| docDate    | HQ    | สาขา 1 |
|------------|-------|--------|
| 2025-01-01 | 10000 | 8000   |
| 2025-01-02 | 12000 | 9000   |
```

### Line Config Options

| Property        | Type    | Description                 |
| --------------- | ------- | --------------------------- |
| `id`            | string  | Unique identifier           |
| `yField`        | string  | Column name for Y value     |
| `aggregation`   | string  | Override widget aggregation |
| `label`         | string  | Legend label                |
| `color`         | string  | Line color (hex)            |
| `strokeWidth`   | number  | Line thickness              |
| `showDot`       | boolean | Show data points            |
| `dotSize`       | number  | Data point size             |
| `activeDotSize` | number  | Hover point size            |

### Default Color Palette

```javascript
const defaultColors = [
  "#8884d8", // Purple
  "#82ca9d", // Green
  "#ffc658", // Yellow
  "#ff7300", // Orange
  "#00C49F", // Teal
  "#FFBB28", // Gold
  "#FF8042", // Coral
  "#0088FE", // Blue
  "#3b82f6", // Light Blue
  "#10b981", // Emerald
];
```

---

## 🎨 Style Configuration

### Common Style Properties

```json
{
  "styleConfig": {
    "color": "#3b82f6",
    "colors": ["#8884d8", "#82ca9d", "#ffc658"],
    "showLegend": true,
    "showGrid": true,
    "showLabels": true,
    "lineWidth": 2,
    "pointSize": 4,
    "pointHoverSize": 8,
    "lineType": "monotone"
  }
}
```

### Line Types

| Value        | Description            |
| ------------ | ---------------------- |
| `monotone`   | Smooth curve (default) |
| `linear`     | Straight lines         |
| `step`       | Step function          |
| `stepBefore` | Step before point      |
| `stepAfter`  | Step after point       |

### Chart-Specific Styles

#### Bar/Line/Area Charts

```json
{
  "styleConfig": {
    "color": "#3b82f6",
    "showLegend": true,
    "showGrid": true,
    "showLabels": true
  }
}
```

#### Pie/Doughnut Charts

```json
{
  "styleConfig": {
    "colors": ["#8884d8", "#82ca9d", "#ffc658"],
    "showLegend": true,
    "showLabels": true,
    "innerRadius": 60 // Doughnut only
  }
}
```

#### KPI/Metric Cards

```json
{
  "styleConfig": {
    "color": "#10b981",
    "prefix": "฿",
    "suffix": "",
    "decimals": 2,
    "trend": {
      "enabled": true,
      "compareField": "previous_value"
    }
  }
}
```

---

## 📖 Examples

### Complete Dashboard Config with Global Filters

```json
{
  "layout": "grid",
  "theme": "light",
  "gridCols": 12,
  "gridRowHeight": 100,
  "globalFilters": [
    {
      "id": "date_range",
      "type": "dateRange",
      "label": "📅 ช่วงวันที่",
      "field": "docDate",
      "defaultValue": {
        "start": "2025-01-01",
        "end": "2025-12-31"
      }
    },
    {
      "id": "branch_filter",
      "type": "dropdown",
      "label": "🏢 สาขา",
      "field": "branch",
      "options": ["HQ", "สาขา 1", "สาขา 2"],
      "defaultValue": ""
    }
  ],
  "widgets": [
    {
      "id": "kpi_total_value",
      "title": "💰 มูลค่ารวม",
      "type": "kpi",
      "position": { "x": 0, "y": 0, "w": 3, "h": 2 },
      "dataConfig": {
        "table": "VVPVSG_INVENTORY_001_VIEW_001",
        "field": "totalFromBuyPrice",
        "aggregation": "sum"
      },
      "styleConfig": {
        "color": "#10b981",
        "prefix": "฿"
      }
    },
    {
      "id": "chart_comparison",
      "title": "📈 เปรียบเทียบราคาซื้อ vs ต้นทุนเฉลี่ย",
      "type": "line",
      "position": { "x": 0, "y": 2, "w": 6, "h": 4 },
      "dataConfig": {
        "table": "VVPVSG_INVENTORY_001_VIEW_001",
        "xField": "docDate",
        "multiLine": true,
        "lines": [
          {
            "id": "buyPrice",
            "yField": "totalFromBuyPrice",
            "aggregation": "sum",
            "label": "ราคาซื้อ",
            "color": "#8884d8"
          },
          {
            "id": "avgCost",
            "yField": "totalFromAverageCost",
            "aggregation": "sum",
            "label": "ต้นทุนเฉลี่ย",
            "color": "#82ca9d"
          }
        ],
        "groupBy": ["docDate"],
        "orderBy": [{ "field": "docDate", "direction": "ASC" }]
      }
    },
    {
      "id": "chart_by_branch",
      "title": "🏢 แนวโน้มตามสาขา",
      "type": "line",
      "position": { "x": 6, "y": 2, "w": 6, "h": 4 },
      "dataConfig": {
        "table": "VVPVSG_INVENTORY_001_VIEW_001",
        "xField": "docDate",
        "yField": "totalFromBuyPrice",
        "seriesField": "branch",
        "aggregation": "sum",
        "groupBy": ["docDate", "branch"],
        "orderBy": [{ "field": "docDate", "direction": "ASC" }]
      }
    }
  ],
  "autoRefresh": false,
  "refreshInterval": 0
}
```

---

## 🔧 Technical Notes

### Files Modified for Multi-Line Support

| File                                                         | Changes                                                                          |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `frontend/src/components/widgets/LineChartWidget.tsx`        | Added useMemo for data processing, seriesField pivot logic, multi-line rendering |
| `frontend/src/components/widgets/WidgetRenderer.tsx`         | Added seriesField support in SQL query builder                                   |
| `onprem-frontend/src/components/widgets/LineChartWidget.tsx` | Same as frontend                                                                 |
| `onprem-frontend/src/components/widgets/WidgetRenderer.tsx`  | Same as frontend                                                                 |

### SQL Query Generation Logic

1. **Standard Charts**: SELECT xField, aggregation(yField) FROM table GROUP BY xField
2. **MultiLine Charts**: SELECT xField, agg(yField1), agg(yField2), ... GROUP BY xField
3. **SeriesField Charts**: SELECT xField, seriesField, agg(yField) GROUP BY xField, seriesField

### Data Transformation for SeriesField

1. Query returns rows with: `{ xField, seriesField, yField }`
2. LineChartWidget extracts unique seriesField values
3. Creates pivoted data: `{ xField, series1Value, series2Value, ... }`
4. Renders one Line component per unique series value

---

## 📞 Support

For questions or issues:

- Check existing documentation in `/Docs/`
- Review example configs in `/scripts/`
- Use AI Assistant in Design tab for help

---

_This documentation is maintained as part of FlexBoard v2 development._
