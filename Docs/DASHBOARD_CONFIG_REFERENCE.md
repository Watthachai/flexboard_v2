# Dashboard Configuration Reference

This document provides a comprehensive reference for all configuration options available when creating dashboards in Flexboard v2.

## Table of Contents

- [Dashboard Configuration](#dashboard-configuration)
- [Widget Configuration](#widget-configuration)
- [Data Configuration](#data-configuration)
- [Style Configuration](#style-configuration)
- [Tooltip Configuration](#tooltip-configuration)
- [Widget Types](#widget-types)
- [Examples](#examples)

---

## Dashboard Configuration

The top-level dashboard configuration object.

### Properties

| Property          | Type                                      | Required | Description                      | Default   |
| ----------------- | ----------------------------------------- | -------- | -------------------------------- | --------- |
| `layout`          | `"grid"` \| `"single-page"` \| `"custom"` | Yes      | Dashboard layout mode            | `"grid"`  |
| `theme`           | `"light"` \| `"dark"` \| `"auto"`         | No       | Color theme                      | `"light"` |
| `gridCols`        | `number` (1-24)                           | No       | Number of grid columns           | `12`      |
| `gridRowHeight`   | `number`                                  | No       | Height of each grid row (pixels) | `100`     |
| `widgets`         | `Widget[]`                                | Yes      | Array of widget configurations   | `[]`      |
| `autoRefresh`     | `boolean`                                 | No       | Enable auto-refresh              | `false`   |
| `refreshInterval` | `number`                                  | No       | Refresh interval (seconds)       | `0`       |

### Example

```json
{
  "layout": "grid",
  "theme": "light",
  "gridCols": 12,
  "gridRowHeight": 100,
  "widgets": [...],
  "autoRefresh": false,
  "refreshInterval": 0
}
```

---

## Widget Configuration

Configuration for individual widgets on the dashboard.

### Common Properties

| Property        | Type                                     | Required | Description                         |
| --------------- | ---------------------------------------- | -------- | ----------------------------------- |
| `id`            | `string`                                 | Yes      | Unique identifier for the widget    |
| `title`         | `string`                                 | Yes      | Display title                       |
| `type`          | [Widget Type](#widget-types)             | Yes      | Widget visualization type           |
| `position`      | `Position`                               | Yes      | Widget position and size            |
| `dataConfig`    | [Data Config](#data-configuration)       | Yes      | Data source and query configuration |
| `styleConfig`   | [Style Config](#style-configuration)     | No       | Visual styling options              |
| `tooltipConfig` | [Tooltip Config](#tooltip-configuration) | No       | Tooltip customization               |
| `visible`       | `boolean`                                | No       | Widget visibility                   |

### Position Object

| Property | Type     | Description                    |
| -------- | -------- | ------------------------------ |
| `x`      | `number` | Grid column position (0-based) |
| `y`      | `number` | Grid row position (0-based)    |
| `w`      | `number` | Width in grid columns          |
| `h`      | `number` | Height in grid rows            |

### Example

```json
{
  "id": "widget_1",
  "title": "Sales Overview",
  "type": "bar",
  "position": { "x": 0, "y": 0, "w": 6, "h": 4 },
  "dataConfig": {...},
  "styleConfig": {...},
  "visible": true
}
```

---

## Data Configuration

Defines how data is fetched and processed for the widget.

### Properties

| Property      | Type                                                  | Required | Description                   |
| ------------- | ----------------------------------------------------- | -------- | ----------------------------- |
| `table`       | `string`                                              | Yes\*    | Database table/view name      |
| `query`       | `string`                                              | Yes\*    | Custom SQL query              |
| `xField`      | `string`                                              | No       | Field for X-axis (categories) |
| `yField`      | `string`                                              | No       | Field for Y-axis (values)     |
| `aggregation` | `"sum"` \| `"avg"` \| `"count"` \| `"min"` \| `"max"` | No       | Aggregation function          |
| `groupBy`     | `string[]`                                            | No       | Fields to group by            |
| `orderBy`     | `OrderBy[]`                                           | No       | Sorting configuration         |
| `limit`       | `number`                                              | No       | Maximum number of records     |

\*Either `table` or `query` is required, but not both.

### OrderBy Object

| Property    | Type                | Description      |
| ----------- | ------------------- | ---------------- |
| `field`     | `string`            | Field to sort by |
| `direction` | `"ASC"` \| `"DESC"` | Sort direction   |

### Examples

**Using Table + Fields (Recommended)**

```json
{
  "dataConfig": {
    "table": "sales_data",
    "xField": "productName",
    "yField": "totalSales",
    "aggregation": "sum",
    "groupBy": ["productName"],
    "orderBy": [{ "field": "totalSales", "direction": "DESC" }],
    "limit": 10
  }
}
```

**Using Custom Query**

```json
{
  "dataConfig": {
    "query": "SELECT productName, SUM(totalSales) as totalSales FROM sales_data GROUP BY productName ORDER BY totalSales DESC LIMIT 10"
  }
}
```

### SQL Query Generation

When using `table` + `aggregation` + `groupBy`, the system automatically generates:

```sql
SELECT {xField}, {aggregation}({yField}) as {yField}
FROM {table}
GROUP BY {groupBy}
ORDER BY {orderBy}
LIMIT {limit}
```

**Example:**

```json
{
  "table": "inventory",
  "xField": "branch",
  "yField": "totalValue",
  "aggregation": "sum",
  "groupBy": ["branch"],
  "orderBy": [{ "field": "totalValue", "direction": "DESC" }]
}
```

Generates:

```sql
SELECT branch, SUM(totalValue) as totalValue
FROM inventory
GROUP BY branch
ORDER BY totalValue DESC
```

---

## Style Configuration

Visual styling options for widgets.

### Common Properties

| Property          | Type       | Description         | Applies To    |
| ----------------- | ---------- | ------------------- | ------------- |
| `color`           | `string`   | Primary color (hex) | All charts    |
| `colors`          | `string[]` | Color array (hex)   | Pie, Doughnut |
| `showGrid`        | `boolean`  | Show grid lines     | Bar, Line     |
| `showLegend`      | `boolean`  | Show legend         | All charts    |
| `showLabels`      | `boolean`  | Show data labels    | Pie, Doughnut |
| `prefix`          | `string`   | Value prefix        | KPI           |
| `suffix`          | `string`   | Value suffix        | KPI           |
| `backgroundColor` | `string`   | Background color    | KPI           |
| `min`             | `number`   | Minimum value       | Gauge         |
| `max`             | `number`   | Maximum value       | Gauge         |

### Examples

**Bar/Line Chart**

```json
{
  "styleConfig": {
    "color": "#3b82f6",
    "showGrid": true,
    "showLegend": true
  }
}
```

**Pie/Doughnut Chart**

```json
{
  "styleConfig": {
    "colors": ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"],
    "showLegend": true,
    "showLabels": true
  }
}
```

**KPI Widget**

```json
{
  "styleConfig": {
    "color": "#ef4444",
    "prefix": "฿",
    "suffix": " THB",
    "backgroundColor": "bg-gradient-to-br from-blue-50 to-blue-100"
  }
}
```

**Gauge Widget**

```json
{
  "styleConfig": {
    "color": "#10b981",
    "min": 0,
    "max": 100
  }
}
```

---

## Tooltip Configuration

Customize tooltip display when hovering over chart elements.

### Properties

| Property  | Type      | Required | Description                     |
| --------- | --------- | -------- | ------------------------------- |
| `enabled` | `boolean` | Yes      | Enable custom tooltip           |
| `format`  | `string`  | Yes      | Format string with placeholders |

### Format String

Use `{fieldName}` placeholders to insert data values. The system automatically:

- Formats numbers with thousand separators
- Converts ISO date strings (e.g., `2019-04-01T00:00:00.000Z`) to readable format (e.g., `1 เม.ย. 2019`)
- Handles null/undefined values

### Examples

**Basic Format**

```json
{
  "tooltipConfig": {
    "enabled": true,
    "format": "{productName}: ฿{totalSales}"
  }
}
```

**With Multiple Fields**

```json
{
  "tooltipConfig": {
    "enabled": true,
    "format": "Date: {orderDate} | Sales: ฿{totalSales} | Units: {quantity}"
  }
}
```

**Date Formatting**

```json
{
  "tooltipConfig": {
    "enabled": true,
    "format": "{docDate}: ฿{totalFromBuyPrice}"
  }
}
```

_Input: `2019-04-01T00:00:00.000Z`_  
_Output: `1 เม.ย. 2019: ฿1,234,567`_

---

## Widget Types

### Bar Chart (`bar`)

Display data as vertical bars.

**Best for:** Comparing categories, rankings, distributions

**Required Fields:**

- `xField`: Category field
- `yField`: Value field

**Example:**

```json
{
  "type": "bar",
  "dataConfig": {
    "table": "products",
    "xField": "productName",
    "yField": "sales",
    "aggregation": "sum",
    "groupBy": ["productName"],
    "limit": 10
  }
}
```

---

### Line Chart (`line`)

Display data as a line graph.

**Best for:** Trends over time, continuous data

**Required Fields:**

- `xField`: X-axis field (usually date/time)
- `yField`: Value field

**Example:**

```json
{
  "type": "line",
  "dataConfig": {
    "table": "sales_daily",
    "xField": "date",
    "yField": "revenue",
    "aggregation": "sum",
    "groupBy": ["date"],
    "orderBy": [{ "field": "date", "direction": "ASC" }]
  }
}
```

---

### Pie Chart (`pie`)

Display data as circular sectors.

**Best for:** Part-to-whole relationships, percentages

**Required Fields:**

- `xField`: Category field (labels)
- `yField`: Value field

**Example:**

```json
{
  "type": "pie",
  "dataConfig": {
    "table": "sales_by_region",
    "xField": "region",
    "yField": "sales",
    "aggregation": "sum",
    "groupBy": ["region"],
    "limit": 8
  },
  "styleConfig": {
    "colors": ["#3b82f6", "#8b5cf6", "#ec4899"]
  }
}
```

---

### Doughnut Chart (`doughnut`)

Similar to pie chart with a hollow center.

**Best for:** Part-to-whole with emphasis on center space

**Configuration:** Same as Pie Chart

---

### KPI Widget (`kpi`)

Display a single key performance indicator.

**Best for:** Single metrics, totals, averages

**Required Fields:**

- `yField`: Value field

**Features:**

- Automatic trend calculation (if multiple data points)
- Customizable prefix/suffix
- Background color gradients

**Example:**

```json
{
  "type": "kpi",
  "dataConfig": {
    "table": "sales",
    "yField": "totalSales",
    "aggregation": "sum"
  },
  "styleConfig": {
    "prefix": "฿",
    "suffix": "",
    "color": "#ef4444"
  }
}
```

---

### Table Widget (`table`)

Display data in a tabular format.

**Best for:** Detailed data, multiple columns

**Required Fields:**

- `table` or `query`

**Example:**

```json
{
  "type": "table",
  "dataConfig": {
    "table": "orders",
    "limit": 50
  }
}
```

---

### Gauge Widget (`gauge`)

Display a progress or performance metric.

**Best for:** Progress, capacity, performance metrics

**Required Fields:**

- `yField`: Current value

**Example:**

```json
{
  "type": "gauge",
  "dataConfig": {
    "table": "inventory",
    "yField": "stockLevel",
    "aggregation": "avg"
  },
  "styleConfig": {
    "min": 0,
    "max": 1000,
    "color": "#10b981"
  }
}
```

---

## Examples

### Complete Dashboard Example

```json
{
  "layout": "grid",
  "theme": "light",
  "gridCols": 12,
  "gridRowHeight": 100,
  "widgets": [
    {
      "id": "widget_1",
      "title": "Top 10 Products by Sales",
      "type": "bar",
      "position": { "x": 0, "y": 0, "w": 6, "h": 4 },
      "dataConfig": {
        "table": "sales_data",
        "xField": "productName",
        "yField": "totalSales",
        "aggregation": "sum",
        "groupBy": ["productName"],
        "orderBy": [{ "field": "totalSales", "direction": "DESC" }],
        "limit": 10
      },
      "styleConfig": {
        "color": "#3b82f6",
        "showGrid": true,
        "showLegend": true
      },
      "tooltipConfig": {
        "enabled": true,
        "format": "{productName}: ฿{totalSales}"
      },
      "visible": true
    },
    {
      "id": "widget_2",
      "title": "Sales Trend",
      "type": "line",
      "position": { "x": 6, "y": 0, "w": 6, "h": 4 },
      "dataConfig": {
        "table": "sales_data",
        "xField": "date",
        "yField": "totalSales",
        "aggregation": "sum",
        "groupBy": ["date"],
        "orderBy": [{ "field": "date", "direction": "ASC" }]
      },
      "styleConfig": {
        "color": "#10b981",
        "showGrid": true
      },
      "tooltipConfig": {
        "enabled": true,
        "format": "{date}: ฿{totalSales}"
      },
      "visible": true
    },
    {
      "id": "widget_3",
      "title": "Total Revenue",
      "type": "kpi",
      "position": { "x": 0, "y": 4, "w": 3, "h": 2 },
      "dataConfig": {
        "table": "sales_data",
        "yField": "totalSales",
        "aggregation": "sum"
      },
      "styleConfig": {
        "prefix": "฿",
        "suffix": "",
        "color": "#ef4444"
      },
      "visible": true
    }
  ],
  "autoRefresh": false,
  "refreshInterval": 0
}
```

---

## Best Practices

### 1. Use Aggregation with GROUP BY

Always use `aggregation` when you have `groupBy`:

```json
{
  "xField": "category",
  "yField": "sales",
  "aggregation": "sum",
  "groupBy": ["category"]
}
```

### 2. Limit Data for Performance

Use `limit` to prevent loading too much data:

```json
{
  "limit": 100
}
```

### 3. Order Data Appropriately

- For time series: `ORDER BY date ASC`
- For rankings: `ORDER BY value DESC`

### 4. Use Custom Tooltips

Provide context with formatted tooltips:

```json
{
  "tooltipConfig": {
    "enabled": true,
    "format": "Product: {name} | Sales: ฿{total} | Units: {qty}"
  }
}
```

### 5. Choose Appropriate Widget Types

- **Bar/Line**: Trends, comparisons
- **Pie/Doughnut**: Proportions (limit to 5-8 slices)
- **KPI**: Single important metrics
- **Table**: Detailed data
- **Gauge**: Progress/capacity metrics

---

## Troubleshooting

### Error: Column not in GROUP BY clause

**Problem:** Using fields without aggregation when GROUP BY is present

**Solution:** Add aggregation function:

```json
{
  "yField": "sales",
  "aggregation": "sum",
  "groupBy": ["category"]
}
```

### Error: No data available

**Problem:** Query returns empty result

**Solutions:**

- Check table/field names
- Verify data exists in database
- Check data source connection

### Dates showing as ISO strings

**Problem:** Dates display as `2019-04-01T00:00:00.000Z`

**Solution:** System now auto-formats dates in tooltips and axis labels

---

## Related Documentation

- [Dashboard Implementation Guide](./DASHBOARD_IMPLEMENTATION.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Test Flow](./TEST_FLOW.md)
