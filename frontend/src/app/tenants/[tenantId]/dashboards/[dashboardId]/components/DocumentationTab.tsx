"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Code,
  Database,
  FileText,
  GitBranch,
  HelpCircle,
  Layers,
  Lightbulb,
  LineChart,
  Filter,
  Palette,
  Settings,
  Sparkles,
  Table,
  Copy,
  Check,
  Zap,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

// Changelog data
const changelog = [
  {
    version: "2.2.0",
    date: "December 17, 2025",
    type: "feature" as const,
    changes: [
      {
        title: "Table Widget Bulk Actions",
        description: "รองรับการทำงานกับหลาย rows พร้อมกัน",
        details: [
          "bulkActions array ใน dataConfig",
          "Checkbox selection + Select all/Deselect all",
          "Toolbar ปรากฏเมื่อเลือก rows",
          "Confirmation dialog ก่อนทำงาน",
          "Template variables: ${selectedRows}, {count}",
        ],
      },
      {
        title: "Table Widget Row Actions",
        description: "รองรับการทำงานกับแต่ละ row",
        details: [
          "rowActions array ใน dataConfig",
          "Dropdown menu (⋮) แต่ละ row",
          "Action types: navigate, api, custom",
          "Template variables: ${row.field}, ${dashboardId}, ${timestamp}",
        ],
      },
    ],
  },
  {
    version: "2.1.0",
    date: "November 27, 2025",
    type: "feature" as const,
    changes: [
      {
        title: "Multi-Line Chart Support",
        description: "สามารถแสดงกราฟเส้นหลายเส้นใน widget เดียว",
        details: [
          "`multiLine` + `lines[]` - กำหนด fields แบบ explicit",
          "`seriesField` - สร้างเส้นอัตโนมัติจาก unique values",
        ],
      },
      {
        title: "SeriesField Pivot",
        description: "ระบบ pivot ข้อมูลอัตโนมัติสำหรับ multi-line by category",
      },
      {
        title: "Enhanced Color Palette",
        description: "เพิ่ม color palette เป็น 10 สี",
      },
    ],
  },
  {
    version: "2.0.0",
    date: "November 26, 2025",
    type: "feature" as const,
    changes: [
      {
        title: "Global Filters",
        description: "ระบบกรองข้อมูลทั้ง dashboard",
        details: [
          "Date Range Filter - เลือกช่วงวันที่",
          "Dropdown Filter - เลือกค่าจาก options",
          "Text Filter - ค้นหา LIKE",
        ],
      },
      {
        title: "Filter Configuration in JSON",
        description: "กำหนด global filters ใน config ได้",
      },
    ],
  },
  {
    version: "1.5.0",
    date: "November 25, 2025",
    type: "feature" as const,
    changes: [
      {
        title: "AI Config Assistant",
        description: "ช่วยสร้าง/แก้ไข widget config ด้วย AI",
      },
      {
        title: "Diff Editor",
        description: "แสดง diff ก่อน apply changes จาก AI",
      },
      {
        title: "Version Management",
        description: "บันทึกและเปลี่ยน version ของ config",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "November 20, 2025",
    type: "release" as const,
    changes: [
      {
        title: "Initial Release",
        description: "เปิดตัว FlexBoard v2",
        details: [
          "Widget Types: bar, line, area, pie, doughnut, scatter, kpi, metric, progress, gauge, table",
          "Grid Layout System",
          "Basic Data Configuration",
          "Style Configuration",
        ],
      },
    ],
  },
];

// Widget types data with example codes
const widgetTypes = [
  {
    type: "bar",
    name: "Bar Chart",
    thai: "กราฟแท่ง",
    icon: "📊",
    description: "แสดงข้อมูลเปรียบเทียบเป็นแท่งกราฟ",
    exampleKey: "basicWidget",
  },
  {
    type: "line",
    name: "Line Chart",
    thai: "กราฟเส้น",
    icon: "📈",
    description: "แสดงแนวโน้มข้อมูลตามเวลา รองรับ multi-line",
    exampleKey: "multiLine",
    isNew: true,
    newFeature: "Multi-Line Support",
  },
  {
    type: "area",
    name: "Area Chart",
    thai: "กราฟพื้นที่",
    icon: "📉",
    description: "กราฟเส้นแบบเติมสี เหมาะกับแสดง volume",
    exampleKey: "areaWidget",
  },
  {
    type: "pie",
    name: "Pie Chart",
    thai: "กราฟวงกลม",
    icon: "🥧",
    description: "แสดงสัดส่วนข้อมูลเป็นวงกลม",
    exampleKey: "pieWidget",
  },
  {
    type: "doughnut",
    name: "Doughnut Chart",
    thai: "กราฟโดนัท",
    icon: "🍩",
    description: "กราฟวงกลมแบบมีรูตรงกลาง",
    exampleKey: "doughnutWidget",
  },
  {
    type: "scatter",
    name: "Scatter Plot",
    thai: "กราฟกระจาย",
    icon: "⚬",
    description: "แสดงความสัมพันธ์ระหว่าง 2 ตัวแปร",
    exampleKey: "scatterWidget",
  },
  {
    type: "kpi",
    name: "KPI Card",
    thai: "การ์ด KPI",
    icon: "🎯",
    description: "แสดงตัวเลข KPI พร้อม target",
    exampleKey: "metricWidget",
  },
  {
    type: "metric",
    name: "Metric Card",
    thai: "การ์ดแสดงตัวเลข",
    icon: "💳",
    description: "แสดงตัวเลขสำคัญพร้อม thresholds",
    exampleKey: "advancedMetric",
  },
  {
    type: "progress",
    name: "Progress Bar",
    thai: "แถบความคืบหน้า",
    icon: "📊",
    description: "แสดง progress เทียบกับเป้าหมาย",
    exampleKey: "progressWidget",
  },
  {
    type: "gauge",
    name: "Gauge",
    thai: "เกจวัด",
    icon: "⚡",
    description: "แสดงค่าในรูปแบบเกจพร้อม ranges",
    exampleKey: "gaugeWidget",
  },
  {
    type: "table",
    name: "Data Table",
    thai: "ตารางข้อมูล",
    icon: "📋",
    description: "แสดงข้อมูลในรูปแบบตาราง รองรับ bulk actions และ row actions",
    exampleKey: "tableWidget",
    isNew: true,
    newFeature: "Bulk & Row Actions",
  },
];

// Code examples
const codeExamples = {
  multiLine: `{
  "id": "widget_multiline_001",
  "title": "📈 Buy Price vs Average Cost",
  "type": "line",
  "dataConfig": {
    "table": "INVENTORY_VIEW",
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
}`,
  seriesField: `{
  "id": "widget_by_branch_001",
  "title": "🏢 Sales Trend by Branch",
  "type": "line",
  "dataConfig": {
    "table": "INVENTORY_VIEW",
    "xField": "docDate",
    "yField": "totalFromBuyPrice",
    "seriesField": "branch",
    "aggregation": "sum",
    "groupBy": ["docDate", "branch"],
    "orderBy": [{ "field": "docDate", "direction": "ASC" }]
  }
}`,
  globalFilters: `{
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
}`,
  basicWidget: `{
  "id": "widget_1",
  "title": "Total Sales",
  "type": "bar",
  "position": { "x": 0, "y": 0, "w": 6, "h": 4 },
  "dataConfig": {
    "table": "SALES_TABLE",
    "xField": "category",
    "yField": "amount",
    "aggregation": "sum",
    "groupBy": ["category"],
    "orderBy": [{ "field": "amount", "direction": "DESC" }],
    "limit": 10
  },
  "styleConfig": {
    "color": "#3b82f6",
    "showLegend": true,
    "showGrid": true
  }
}`,
  // Advanced Examples from DesignTab
  metricWidget: `{
  "id": "widget_metric_001",
  "title": "💰 Total Revenue",
  "type": "metric",
  "position": { "x": 0, "y": 0, "w": 3, "h": 2 },
  "dataConfig": {
    "table": "SALES_TABLE",
    "field": "revenue",
    "aggregation": "sum"
  },
  "styleConfig": {
    "prefix": "฿",
    "suffix": "",
    "decimals": 2,
    "color": "#10b981"
  }
}`,
  advancedMetric: `{
  "id": "widget_advanced_metric",
  "title": "📊 Monthly Target",
  "type": "metric",
  "dataConfig": {
    "table": "SALES_TABLE",
    "field": "amount",
    "aggregation": "sum"
  },
  "styleConfig": {
    "prefix": "฿",
    "decimals": 0,
    "target": 1000000,
    "thresholds": [
      { "value": 0.5, "color": "#ef4444" },
      { "value": 0.8, "color": "#f59e0b" },
      { "value": 1.0, "color": "#10b981" }
    ],
    "format": "compact",
    "icon": "💰",
    "description": "เป้าหมายยอดขายประจำเดือน"
  }
}`,
  progressWidget: `{
  "id": "widget_progress_001",
  "title": "📈 Sales Progress",
  "type": "progress",
  "dataConfig": {
    "table": "SALES_TABLE",
    "field": "achieved",
    "aggregation": "sum"
  },
  "styleConfig": {
    "maxValue": 100,
    "suffix": "%",
    "color": "#3b82f6"
  }
}`,
  multiProgress: `{
  "id": "widget_multi_progress",
  "title": "📊 Department Progress",
  "type": "multi-progress",
  "dataConfig": {
    "table": "DEPARTMENT_TARGETS",
    "metrics": [
      { "id": "sales", "label": "Sales", "field": "sales_achieved", "target": 100, "color": "#3b82f6" },
      { "id": "marketing", "label": "Marketing", "field": "marketing_achieved", "target": 80, "color": "#10b981" },
      { "id": "hr", "label": "HR", "field": "hr_achieved", "target": 60, "color": "#f59e0b" }
    ]
  }
}`,
  scatterWidget: `{
  "id": "widget_scatter_001",
  "title": "🔵 Price vs Quantity",
  "type": "scatter",
  "dataConfig": {
    "table": "PRODUCTS",
    "xField": "price",
    "yField": "quantity",
    "labelField": "productName"
  },
  "styleConfig": {
    "color": "#8884d8",
    "showLabels": true
  }
}`,
  pieWidget: `{
  "id": "widget_pie_001",
  "title": "🥧 Sales by Category",
  "type": "pie",
  "dataConfig": {
    "table": "SALES_TABLE",
    "labelField": "category",
    "valueField": "amount",
    "aggregation": "sum",
    "groupBy": ["category"]
  },
  "styleConfig": {
    "showLegend": true,
    "colors": ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00C49F"]
  }
}`,
  areaWidget: `{
  "id": "widget_area_001",
  "title": "📉 Revenue Over Time",
  "type": "area",
  "position": { "x": 0, "y": 0, "w": 6, "h": 4 },
  "dataConfig": {
    "table": "SALES_TABLE",
    "xField": "date",
    "yField": "revenue",
    "aggregation": "sum",
    "groupBy": ["date"],
    "orderBy": [{ "field": "date", "direction": "ASC" }]
  },
  "styleConfig": {
    "color": "#8884d8",
    "fillOpacity": 0.3,
    "showGrid": true
  }
}`,
  doughnutWidget: `{
  "id": "widget_doughnut_001",
  "title": "🍩 Budget Allocation",
  "type": "doughnut",
  "position": { "x": 0, "y": 0, "w": 4, "h": 4 },
  "dataConfig": {
    "table": "BUDGET_TABLE",
    "labelField": "department",
    "valueField": "amount",
    "aggregation": "sum",
    "groupBy": ["department"]
  },
  "styleConfig": {
    "showLegend": true,
    "colors": ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00C49F"],
    "innerRadius": 60
  }
}`,
  gaugeWidget: `{
  "id": "widget_gauge_001",
  "title": "⚡ Performance Score",
  "type": "gauge",
  "dataConfig": {
    "table": "PERFORMANCE",
    "field": "score",
    "aggregation": "avg"
  },
  "styleConfig": {
    "min": 0,
    "max": 100,
    "unit": "%",
    "ranges": [
      { "min": 0, "max": 40, "color": "#ef4444", "label": "Poor" },
      { "min": 40, "max": 70, "color": "#f59e0b", "label": "Average" },
      { "min": 70, "max": 100, "color": "#10b981", "label": "Excellent" }
    ]
  }
}`,
  tableWidget: `{
  "id": "widget_table_001",
  "title": "📋 Product List",
  "type": "table",
  "position": { "x": 0, "y": 0, "w": 12, "h": 6 },
  "dataConfig": {
    "table": "PRODUCTS",
    "columns": ["productId", "productName", "category", "price", "stock"],
    "orderBy": [{ "field": "productName", "direction": "ASC" }],
    "limit": 50,
    "bulkActions": [
      {
        "id": "export-selected",
        "label": "📥 Export Selected",
        "icon": "download",
        "type": "api",
        "endpoint": "/api/export/products",
        "method": "POST",
        "payload": {
          "products": "\${selectedRows}",
          "format": "csv",
          "timestamp": "\${timestamp}"
        },
        "successMessage": "Exported {count} products successfully",
        "confirmMessage": "Export {count} selected products?"
      },
      {
        "id": "delete-products",
        "label": "🗑️ Delete Selected",
        "icon": "trash",
        "type": "api",
        "endpoint": "/api/products/bulk-delete",
        "method": "DELETE",
        "payload": {
          "productIds": "\${selectedRows}",
          "dashboardId": "\${dashboardId}"
        },
        "successMessage": "Deleted {count} products",
        "confirmMessage": "Are you sure you want to delete {count} products? This action cannot be undone.",
        "requireConfirm": true
      }
    ],
    "rowActions": [
      {
        "id": "view-details",
        "label": "👁️ View Details",
        "icon": "eye",
        "type": "navigate",
        "url": "/products/\${row.productId}"
      },
      {
        "id": "edit-product",
        "label": "✏️ Edit",
        "icon": "edit",
        "type": "navigate",
        "url": "/products/\${row.productId}/edit"
      },
      {
        "id": "update-stock",
        "label": "📦 Update Stock",
        "icon": "package",
        "type": "api",
        "endpoint": "/api/products/\${row.productId}/stock",
        "method": "PUT",
        "payload": {
          "productId": "\${row.productId}",
          "currentStock": "\${row.stock}",
          "timestamp": "\${timestamp}"
        },
        "successMessage": "Stock updated for \${row.productName}"
      }
    ]
  },
  "styleConfig": {
    "striped": true,
    "hoverable": true,
    "compact": false
  }
}`,
  customQuery: `{
  "id": "widget_custom_001",
  "title": "📊 Custom Query Widget",
  "type": "bar",
  "dataConfig": {
    "query": "SELECT category, SUM(amount) as total FROM SALES WHERE status = 'completed' GROUP BY category ORDER BY total DESC LIMIT 5"
  }
}`,
  bulkActions: `"bulkActions": [
  {
    "id": "export-selected",
    "label": "📥 Export Selected",
    "icon": "download",
    "type": "api",
    "endpoint": "/api/export/data",
    "method": "POST",
    "payload": {
      "data": "\${selectedRows}",
      "format": "csv",
      "timestamp": "\${timestamp}"
    },
    "successMessage": "Exported {count} items successfully",
    "confirmMessage": "Export {count} selected items?",
    "requireConfirm": true
  },
  {
    "id": "bulk-delete",
    "label": "🗑️ Delete Selected",
    "icon": "trash",
    "type": "api",
    "endpoint": "/api/items/bulk-delete",
    "method": "DELETE",
    "payload": {
      "items": "\${selectedRows}",
      "dashboardId": "\${dashboardId}"
    },
    "successMessage": "Deleted {count} items",
    "confirmMessage": "Delete {count} items? This cannot be undone.",
    "requireConfirm": true
  }
]`,
  rowActions: `"rowActions": [
  {
    "id": "view-details",
    "label": "👁️ View Details",
    "icon": "eye",
    "type": "navigate",
    "url": "/items/\${row.id}"
  },
  {
    "id": "edit-item",
    "label": "✏️ Edit",
    "icon": "edit",
    "type": "navigate",
    "url": "/items/\${row.id}/edit"
  },
  {
    "id": "api-action",
    "label": "🔄 Process",
    "icon": "refresh",
    "type": "api",
    "endpoint": "/api/items/\${row.id}/process",
    "method": "POST",
    "payload": {
      "itemId": "\${row.id}",
      "itemName": "\${row.name}",
      "timestamp": "\${timestamp}",
      "dashboardId": "\${dashboardId}"
    },
    "successMessage": "Processed \${row.name} successfully",
    "confirmMessage": "Process item '\${row.name}'?",
    "requireConfirm": true
  }
]`,
  unlimitedData: `{
  "id": "widget_unlimited_001",
  "title": "📋 All Records",
  "type": "table",
  "dataConfig": {
    "table": "SALES_TABLE",
    "columns": ["*"],
    "unlimited": true
  }
}`,
  fullDashboard: `{
  "version": 1,
  "layout": {
    "theme": "light",
    "gridCols": 12,
    "gridRowHeight": 60
  },
  "globalFilters": [
    {
      "id": "date_filter",
      "type": "dateRange",
      "label": "📅 วันที่",
      "field": "docDate"
    }
  ],
  "widgets": [
    {
      "id": "widget_kpi_001",
      "title": "💰 Total Revenue",
      "type": "metric",
      "position": { "x": 0, "y": 0, "w": 3, "h": 2 },
      "dataConfig": {
        "table": "SALES",
        "field": "amount",
        "aggregation": "sum"
      },
      "styleConfig": {
        "prefix": "฿",
        "decimals": 2,
        "color": "#10b981"
      }
    },
    {
      "id": "widget_chart_001",
      "title": "📊 Sales by Category",
      "type": "bar",
      "position": { "x": 3, "y": 0, "w": 6, "h": 4 },
      "dataConfig": {
        "table": "SALES",
        "xField": "category",
        "yField": "amount",
        "aggregation": "sum",
        "groupBy": ["category"]
      }
    }
  ]
}`,
};

// Tips and Troubleshooting data
const troubleshootingItems = [
  {
    problem: 'Widget แสดง "No data"',
    solution:
      "ตรวจสอบชื่อ table/view และ field ว่าถูกต้อง, ลองใช้ query แทน table เพื่อ debug",
    category: "data",
  },
  {
    problem: "กราฟแท่งไม่มีข้อมูล",
    solution:
      "ตรวจสอบว่ามี xField, yField และ aggregation ครบ, ใส่ groupBy ตาม xField",
    category: "chart",
  },
  {
    problem: "Multi-line chart แสดงเส้นเดียว",
    solution:
      "ตรวจสอบ multiLine: true + lines[] หรือ seriesField ตั้งค่าถูกต้อง",
    category: "chart",
  },
  {
    problem: "Metric แสดง 0",
    solution: "ใช้ field แทน yField สำหรับ metric, ตรวจสอบ aggregation",
    category: "data",
  },
  {
    problem: "Pie chart ไม่แสดงข้อมูล",
    solution: "ใช้ labelField + valueField แทน xField + yField",
    category: "chart",
  },
  {
    problem: "Filter ไม่ทำงาน",
    solution: "ตรวจสอบว่า field ใน filter ตรงกับชื่อ column ใน database",
    category: "filter",
  },
  {
    problem: "ข้อมูลถูก limit ที่ 1000 rows",
    solution: "เพิ่ม unlimited: true ใน dataConfig (ระวังเรื่อง performance)",
    category: "data",
  },
  {
    problem: "Widget ช้ามาก",
    solution: "ลด limit, เพิ่ม filters, ใช้ View แทน JOIN หลายตาราง",
    category: "performance",
  },
  {
    problem: "Gauge ไม่แสดงสี",
    solution: "ตรวจสอบ ranges config ว่าครอบคลุมค่าที่แสดง",
    category: "chart",
  },
  {
    problem: "Date filter format ผิด",
    solution: "ใช้ format YYYY-MM-DD สำหรับ defaultValue.start/end",
    category: "filter",
  },
  {
    problem: "Bulk actions ไม่ทำงาน",
    solution:
      "ตรวจสอบ bulkActions array ใน dataConfig, ต้องมี id, label, type, endpoint (ถ้าเป็น api)",
    category: "table",
  },
  {
    problem: "Row actions ไม่แสดง",
    solution:
      "ตรวจสอบ rowActions array ครบถ้วน, ต้องมี id, label, type, และ url หรือ endpoint",
    category: "table",
  },
  {
    problem: "Template variable ไม่ทำงาน",
    solution:
      "ใช้ ${selectedRows}, ${row.fieldName}, ${timestamp}, ${dashboardId} หรือ {count} ให้ถูกต้อง, ใส่ \\ escape ใน JSON string",
    category: "table",
  },
  {
    problem: "Confirmation dialog ไม่ปรากฏ",
    solution: "ตรวจสอบว่ามี requireConfirm: true และ confirmMessage ใน action",
    category: "table",
  },
];

// Collapsible section component
function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-blue-600" />
          <span className="font-semibold">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="p-4 border-t">{children}</div>}
    </div>
  );
}

// Code block component with copy button
function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 hover:bg-gray-700 text-white"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

// Widget type definition
type WidgetType = {
  type: string;
  name: string;
  thai: string;
  icon: string;
  description: string;
  exampleKey: string;
  isNew?: boolean;
  newFeature?: string;
};

export function DocumentationTab() {
  const [selectedWidget, setSelectedWidget] = useState<WidgetType | null>(null);

  return (
    <div className="h-[calc(100vh-280px)] overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            📊 FlexBoard v2 Documentation
          </h1>
          <p className="text-gray-600">Widget Features & Configuration Guide</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Last Updated: December 17, 2025
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              Version: 2.2.0
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="changelog" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="changelog" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Changelog
            </TabsTrigger>
            <TabsTrigger value="widgets" className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              Widgets
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              Data Config
            </TabsTrigger>
            <TabsTrigger value="filters" className="flex items-center gap-1">
              <Filter className="h-4 w-4" />
              Filters
            </TabsTrigger>
            <TabsTrigger value="examples" className="flex items-center gap-1">
              <Code className="h-4 w-4" />
              Examples
            </TabsTrigger>
            <TabsTrigger value="tips" className="flex items-center gap-1">
              <Lightbulb className="h-4 w-4" />
              Tips
            </TabsTrigger>
          </TabsList>

          {/* Changelog Tab */}
          <TabsContent value="changelog" className="mt-6">
            <div className="space-y-6">
              {changelog.map((release) => (
                <Card key={release.version}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Badge
                          variant={
                            release.type === "feature" ? "default" : "secondary"
                          }
                          className={
                            release.type === "feature"
                              ? "bg-green-500"
                              : "bg-blue-500"
                          }
                        >
                          v{release.version}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {release.date}
                        </span>
                      </CardTitle>
                      <Badge variant="outline">
                        {release.type === "feature"
                          ? "✨ Feature Update"
                          : "🚀 Release"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {release.changes.map((change, idx) => (
                        <div
                          key={idx}
                          className="border-l-2 border-blue-200 pl-4"
                        >
                          <h4 className="font-semibold text-gray-900">
                            {change.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {change.description}
                          </p>
                          {change.details && (
                            <ul className="mt-2 space-y-1">
                              {change.details.map((detail, i) => (
                                <li
                                  key={i}
                                  className="text-sm text-gray-500 flex items-start gap-2"
                                >
                                  <span className="text-blue-500">•</span>
                                  <code className="bg-gray-100 px-1 rounded text-xs">
                                    {detail}
                                  </code>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Widgets Tab */}
          <TabsContent value="widgets" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Available Widget Types
                  <Badge variant="outline" className="ml-2">
                    Click to view example
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {widgetTypes.map((widget) => (
                    <div
                      key={widget.type}
                      onClick={() => setSelectedWidget(widget)}
                      className="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer group relative"
                    >
                      {widget.isNew && (
                        <Badge className="absolute top-2 right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] px-1.5 py-0.5">
                          NEW
                        </Badge>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="text-2xl group-hover:scale-110 transition-transform">
                          {widget.icon}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold group-hover:text-blue-600">
                              {widget.name}
                            </p>
                          </div>
                          <p className="text-sm text-gray-500">{widget.thai}</p>
                          <code className="text-xs bg-gray-100 px-1 rounded mt-1 inline-block">
                            type: &quot;{widget.type}&quot;
                          </code>
                          {widget.isNew && widget.newFeature && (
                            <p className="text-[10px] text-green-600 font-semibold mt-1">
                              ✨ {widget.newFeature}
                            </p>
                          )}
                        </div>
                        <Eye className="h-4 w-4 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {widget.description && (
                        <p className="text-xs text-gray-400 mt-2">
                          {widget.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Widget Example Dialog */}
            <Dialog
              open={!!selectedWidget}
              onOpenChange={() => setSelectedWidget(null)}
            >
              <DialogContent
                className="overflow-y-auto"
                style={{
                  maxWidth: "95vw",
                  width: "1200px",
                  maxHeight: "90vh",
                }}
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <span className="text-2xl">{selectedWidget?.icon}</span>
                    {selectedWidget?.name} Example
                    <Badge variant="outline" className="ml-2">
                      {selectedWidget?.thai}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  {selectedWidget?.description && (
                    <p className="text-gray-600 mb-4">
                      {selectedWidget.description}
                    </p>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-gray-700">
                        Configuration Example:
                      </h4>
                      <code className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        type: &quot;{selectedWidget?.type}&quot;
                      </code>
                    </div>
                    {selectedWidget?.exampleKey &&
                      codeExamples[
                        selectedWidget.exampleKey as keyof typeof codeExamples
                      ] && (
                        <CodeBlock
                          code={
                            codeExamples[
                              selectedWidget.exampleKey as keyof typeof codeExamples
                            ]
                          }
                        />
                      )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Data Config Tab */}
          <TabsContent value="data" className="mt-6 space-y-4">
            <CollapsibleSection
              title="Basic Data Config"
              icon={Settings}
              defaultOpen
            >
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-purple-600 font-semibold">table</code>
                    <p className="text-gray-600 mt-1">ชื่อ table/view</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-purple-600 font-semibold">query</code>
                    <p className="text-gray-600 mt-1">
                      Custom SQL query (แทน table)
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-purple-600 font-semibold">
                      xField
                    </code>
                    <p className="text-gray-600 mt-1">Column สำหรับแกน X</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-purple-600 font-semibold">
                      yField
                    </code>
                    <p className="text-gray-600 mt-1">Column สำหรับแกน Y</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-purple-600 font-semibold">
                      aggregation
                    </code>
                    <p className="text-gray-600 mt-1">
                      sum, avg, count, min, max
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-purple-600 font-semibold">
                      groupBy
                    </code>
                    <p className="text-gray-600 mt-1">
                      Array of fields for GROUP BY
                    </p>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Multi-Line Charts" icon={LineChart}>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Option 1: Explicit Lines
                  </h4>
                  <p className="text-sm text-blue-600 mb-3">
                    ใช้{" "}
                    <code className="bg-blue-100 px-1 rounded">
                      multiLine: true
                    </code>{" "}
                    + <code className="bg-blue-100 px-1 rounded">lines[]</code>{" "}
                    เมื่อต้องการเปรียบเทียบหลาย fields
                  </p>
                  <CodeBlock code={codeExamples.multiLine} />
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">
                    Option 2: SeriesField (Dynamic)
                  </h4>
                  <p className="text-sm text-green-600 mb-3">
                    ใช้{" "}
                    <code className="bg-green-100 px-1 rounded">
                      seriesField
                    </code>{" "}
                    เมื่อต้องการสร้างเส้นจาก unique values
                  </p>
                  <CodeBlock code={codeExamples.seriesField} />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Style Configuration" icon={Palette}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-pink-600 font-semibold">color</code>
                    <p className="text-gray-600 mt-1">Main color (hex)</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-pink-600 font-semibold">colors</code>
                    <p className="text-gray-600 mt-1">
                      Array of colors for multiple series
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-pink-600 font-semibold">
                      showLegend
                    </code>
                    <p className="text-gray-600 mt-1">
                      Show/hide legend (boolean)
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-pink-600 font-semibold">
                      showGrid
                    </code>
                    <p className="text-gray-600 mt-1">
                      Show/hide grid lines (boolean)
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-pink-600 font-semibold">
                      lineType
                    </code>
                    <p className="text-gray-600 mt-1">monotone, linear, step</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-pink-600 font-semibold">
                      lineWidth
                    </code>
                    <p className="text-gray-600 mt-1">
                      Line thickness (number)
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-pink-600 font-semibold">prefix</code>
                    <p className="text-gray-600 mt-1">
                      Text before value (e.g., ฿)
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-pink-600 font-semibold">suffix</code>
                    <p className="text-gray-600 mt-1">
                      Text after value (e.g., %)
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-pink-600 font-semibold">
                      decimals
                    </code>
                    <p className="text-gray-600 mt-1">
                      Number of decimal places
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-pink-600 font-semibold">unit</code>
                    <p className="text-gray-600 mt-1">Unit label for gauge</p>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Default Color Palette</h4>
                  <div className="flex gap-2">
                    {[
                      "#8884d8",
                      "#82ca9d",
                      "#ffc658",
                      "#ff7300",
                      "#00C49F",
                      "#FFBB28",
                      "#FF8042",
                      "#0088FE",
                      "#3b82f6",
                      "#10b981",
                    ].map((color) => (
                      <div
                        key={color}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                        onClick={() => {
                          navigator.clipboard.writeText(color);
                          toast.success(`Copied: ${color}`);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Advanced Data Config" icon={Zap}>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Properties สำหรับ advanced widgets เช่น metric with targets,
                  gauge ranges, และ multi-progress
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <code className="text-amber-700 font-semibold">target</code>
                    <p className="text-gray-600 mt-1">
                      เป้าหมายสำหรับ metric (number)
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <code className="text-amber-700 font-semibold">
                      thresholds
                    </code>
                    <p className="text-gray-600 mt-1">
                      Array of {`{value, color}`} for conditional colors
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <code className="text-amber-700 font-semibold">format</code>
                    <p className="text-gray-600 mt-1">
                      &quot;compact&quot; = ย่อตัวเลข (1.5K, 2.3M)
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <code className="text-amber-700 font-semibold">icon</code>
                    <p className="text-gray-600 mt-1">
                      Emoji icon สำหรับ metric
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <code className="text-amber-700 font-semibold">
                      description
                    </code>
                    <p className="text-gray-600 mt-1">
                      คำอธิบายเพิ่มเติมใต้ metric
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <code className="text-amber-700 font-semibold">
                      maxValue
                    </code>
                    <p className="text-gray-600 mt-1">
                      ค่า max สำหรับ progress bar
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <code className="text-amber-700 font-semibold">ranges</code>
                    <p className="text-gray-600 mt-1">
                      Array of {`{min, max, color, label}`} for gauge
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <code className="text-amber-700 font-semibold">
                      metrics
                    </code>
                    <p className="text-gray-600 mt-1">
                      Array for multi-progress indicators
                    </p>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Query Options" icon={Database}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-purple-600 font-semibold">
                      filters
                    </code>
                    <p className="text-gray-600 mt-1">
                      Array of filter conditions for WHERE clause
                      <br />
                      <code className="text-xs">{`[{field, operator, value}]`}</code>
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-purple-600 font-semibold">
                      having
                    </code>
                    <p className="text-gray-600 mt-1">
                      Conditions for HAVING clause
                      <br />
                      <code className="text-xs">{`[{field, operator, value}]`}</code>
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-purple-600 font-semibold">
                      orderBy
                    </code>
                    <p className="text-gray-600 mt-1">
                      Sorting
                      <br />
                      <code className="text-xs">{`[{field, direction: "ASC"|"DESC"}]`}</code>
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-purple-600 font-semibold">limit</code>
                    <p className="text-gray-600 mt-1">
                      Max rows (default: 1000)
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-purple-600 font-semibold">
                      unlimited
                    </code>
                    <p className="text-gray-600 mt-1">
                      boolean - ดึงข้อมูลทั้งหมด (ใช้ระวัง!)
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <code className="text-purple-600 font-semibold">
                      columns
                    </code>
                    <p className="text-gray-600 mt-1">
                      Array of column names for table widget
                    </p>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </TabsContent>

          {/* Filters Tab */}
          <TabsContent value="filters" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Global Filters Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Global filters ช่วยให้ผู้ใช้กรองข้อมูลทั้ง dashboard
                  ได้จากที่เดียว
                </p>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <span className="font-semibold">dateRange</span>
                    </div>
                    <p className="text-sm text-gray-600">เลือกช่วงวันที่</p>
                    <code className="text-xs bg-gray-100 px-1 rounded mt-2 block">
                      Operators: &gt;= and &lt;=
                    </code>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <ChevronDown className="h-5 w-5 text-green-500" />
                      <span className="font-semibold">dropdown</span>
                    </div>
                    <p className="text-sm text-gray-600">เลือกจาก dropdown</p>
                    <code className="text-xs bg-gray-100 px-1 rounded mt-2 block">
                      Operator: =
                    </code>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <span className="font-semibold">text</span>
                    </div>
                    <p className="text-sm text-gray-600">พิมพ์ค้นหา</p>
                    <code className="text-xs bg-gray-100 px-1 rounded mt-2 block">
                      Operator: LIKE &apos;%value%&apos;
                    </code>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Example Configuration</h4>
                  <CodeBlock code={codeExamples.globalFilters} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Examples Tab */}
          <TabsContent value="examples" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Complete Widget Examples
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <CollapsibleSection
                  title="📊 Chart Widgets"
                  icon={LineChart}
                  defaultOpen
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Bar Chart Widget</h4>
                      <CodeBlock code={codeExamples.basicWidget} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">
                        Multi-Line Comparison Chart
                      </h4>
                      <CodeBlock code={codeExamples.multiLine} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">
                        Dynamic Lines by Category (seriesField)
                      </h4>
                      <CodeBlock code={codeExamples.seriesField} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Scatter Plot</h4>
                      <CodeBlock code={codeExamples.scatterWidget} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Pie Chart</h4>
                      <CodeBlock code={codeExamples.pieWidget} />
                    </div>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="💰 Metric & KPI Widgets" icon={Zap}>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">
                        Basic Metric Widget
                      </h4>
                      <CodeBlock code={codeExamples.metricWidget} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">
                        Advanced Metric with Target & Thresholds
                      </h4>
                      <CodeBlock code={codeExamples.advancedMetric} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Progress Bar</h4>
                      <CodeBlock code={codeExamples.progressWidget} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">
                        Multi-Progress (Multiple Indicators)
                      </h4>
                      <CodeBlock code={codeExamples.multiProgress} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Gauge with Ranges</h4>
                      <CodeBlock code={codeExamples.gaugeWidget} />
                    </div>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  title="📋 Table & Data Widgets"
                  icon={Table}
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Data Table</h4>
                      <CodeBlock code={codeExamples.tableWidget} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Custom SQL Query</h4>
                      <CodeBlock code={codeExamples.customQuery} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">
                        Unlimited Data (No Row Limit)
                      </h4>
                      <CodeBlock code={codeExamples.unlimitedData} />
                    </div>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  title="🎯 Full Dashboard Config"
                  icon={Settings}
                >
                  <div>
                    <h4 className="font-semibold mb-2">
                      Complete Dashboard Example
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      ตัวอย่าง config เต็มรูปแบบที่รวม layout, globalFilters,
                      และ widgets
                    </p>
                    <CodeBlock code={codeExamples.fullDashboard} />
                  </div>
                </CollapsibleSection>
              </CardContent>
            </Card>

            {/* Quick Reference Card */}
            <Card>
              <CardHeader>
                <CardTitle>⚡ Quick Reference</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">
                      Aggregation Functions
                    </h4>
                    <table className="w-full">
                      <tbody>
                        <tr className="border-b">
                          <td className="py-1">
                            <code>sum</code>
                          </td>
                          <td className="text-gray-500">ผลรวม</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-1">
                            <code>avg</code>
                          </td>
                          <td className="text-gray-500">ค่าเฉลี่ย</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-1">
                            <code>count</code>
                          </td>
                          <td className="text-gray-500">นับจำนวน</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-1">
                            <code>count_distinct</code>
                          </td>
                          <td className="text-gray-500">นับไม่ซ้ำ</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-1">
                            <code>min</code>
                          </td>
                          <td className="text-gray-500">ค่าต่ำสุด</td>
                        </tr>
                        <tr>
                          <td className="py-1">
                            <code>max</code>
                          </td>
                          <td className="text-gray-500">ค่าสูงสุด</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Position Properties</h4>
                    <table className="w-full">
                      <tbody>
                        <tr className="border-b">
                          <td className="py-1">
                            <code>x</code>
                          </td>
                          <td className="text-gray-500">
                            Column position (0-11)
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-1">
                            <code>y</code>
                          </td>
                          <td className="text-gray-500">Row position (0+)</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-1">
                            <code>w</code>
                          </td>
                          <td className="text-gray-500">Width (1-12)</td>
                        </tr>
                        <tr>
                          <td className="py-1">
                            <code>h</code>
                          </td>
                          <td className="text-gray-500">Height (1+)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tips & Troubleshooting Tab */}
          <TabsContent value="tips" className="mt-6 space-y-4">
            {/* Best Practices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">✅ DO</h4>
                    <ul className="space-y-2 text-sm text-green-700">
                      <li>• ใช้ unique widget IDs</li>
                      <li>• ระบุ groupBy เมื่อใช้ aggregation</li>
                      <li>• ใช้ View สำหรับ complex joins</li>
                      <li>• ตั้ง limit เพื่อ performance</li>
                      <li>
                        • ใช้ theme: &quot;light&quot; หรือ &quot;dark&quot;
                      </li>
                      <li>• ใช้ prefix/suffix สำหรับ metrics</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-semibold text-red-800 mb-2">
                      ❌ DON&apos;T
                    </h4>
                    <ul className="space-y-2 text-sm text-red-700">
                      <li>• อย่าใช้ aggregation โดยไม่มี groupBy</li>
                      <li>• อย่า mix query และ table ใน config เดียว</li>
                      <li>• อย่าใช้ unlimited: true โดยไม่จำเป็น</li>
                      <li>• อย่าลืม orderBy สำหรับ time series</li>
                      <li>• อย่าใช้ yField กับ metric (ใช้ field)</li>
                      <li>
                        • อย่าใช้ xField/yField กับ pie (ใช้
                        labelField/valueField)
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Troubleshooting */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Troubleshooting Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {troubleshootingItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-start gap-3">
                        <Badge
                          variant="outline"
                          className={`shrink-0 ${
                            item.category === "data"
                              ? "bg-purple-50 text-purple-700"
                              : item.category === "chart"
                              ? "bg-blue-50 text-blue-700"
                              : item.category === "filter"
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {item.category}
                        </Badge>
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.problem}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {item.solution}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SQL Query Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-blue-500" />
                  SQL Query Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  FlexBoard แปลง dataConfig เป็น SQL Query
                  อัตโนมัติตามโครงสร้างนี้:
                </p>
                <div className="p-4 bg-gray-900 rounded-lg text-sm">
                  <code className="text-gray-100">
                    <span className="text-blue-400">SELECT</span>{" "}
                    <span className="text-green-400">
                      [groupBy fields], [aggregation]([yField/field])
                    </span>
                    <br />
                    <span className="text-blue-400">FROM</span>{" "}
                    <span className="text-yellow-400">[table]</span>
                    <br />
                    <span className="text-blue-400">WHERE</span>{" "}
                    <span className="text-purple-400">
                      [filters + globalFilters]
                    </span>
                    <br />
                    <span className="text-blue-400">GROUP BY</span>{" "}
                    <span className="text-green-400">[groupBy]</span>
                    <br />
                    <span className="text-blue-400">HAVING</span>{" "}
                    <span className="text-purple-400">[having conditions]</span>
                    <br />
                    <span className="text-blue-400">ORDER BY</span>{" "}
                    <span className="text-orange-400">[orderBy]</span>
                    <br />
                    <span className="text-blue-400">LIMIT</span>{" "}
                    <span className="text-red-400">[limit]</span>
                  </code>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    ⚠️ Important Notes
                  </h4>
                  <ul className="space-y-1 text-sm text-blue-700">
                    <li>
                      •{" "}
                      <code className="bg-blue-100 px-1 rounded">
                        aggregation
                      </code>{" "}
                      ต้องใช้คู่กับ{" "}
                      <code className="bg-blue-100 px-1 rounded">groupBy</code>
                    </li>
                    <li>
                      • Global filters จะถูกเพิ่มใน WHERE clause อัตโนมัติ
                    </li>
                    <li>• Default limit คือ 1000 rows</li>
                    <li>
                      • ใช้{" "}
                      <code className="bg-blue-100 px-1 rounded">query</code>{" "}
                      สำหรับ SQL ที่ซับซ้อน
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-6 border-t">
          <p>FlexBoard v2 Documentation • Built with ❤️</p>
          <p className="mt-1">
            For more details, see{" "}
            <code className="bg-gray-100 px-1 rounded">
              /Docs/WIDGET_FEATURES.md
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
