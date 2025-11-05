"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Database,
  Sparkles,
  Save,
  Copy,
  RotateCcw,
  BookOpen,
  Table,
  Plus,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DashboardConfig } from "@/types/dashboard";
import { toast } from "sonner";
import { getDataSourceColumns, createDashboardVersion } from "@/lib/api";
import { getAuth } from "firebase/auth";

// Dynamically import Monaco Editor (client-side only)
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-gray-500">
      Loading editor...
    </div>
  ),
});

interface Dashboard {
  id: string;
  selectedTable?: string;
  dataSourceId?: string;
  config?: DashboardConfig;
}

interface DesignTabProps {
  dashboard: Dashboard;
  tenantId: string;
}

interface TableColumn {
  name: string;
  type: string;
}

interface TablePreviewData {
  columns: string[];
  rows: any[];
}

export function DesignTab({ dashboard, tenantId }: DesignTabProps) {
  const [configText, setConfigText] = useState<string>("");
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Table preview states
  const [previewData, setPreviewData] = useState<TablePreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Default template
  const defaultConfig: DashboardConfig = {
    layout: "grid",
    theme: "light",
    gridCols: 12,
    gridRowHeight: 100,
    widgets: [
      {
        id: "widget_1",
        title: "Example Chart",
        type: "bar",
        position: { x: 0, y: 0, w: 6, h: 4 },
        dataConfig: {
          table: dashboard.selectedTable || "",
          xField: "",
          yField: "",
          aggregation: "sum",
          limit: 100,
        },
        styleConfig: {
          color: "#3b82f6",
          showLegend: true,
          showGrid: true,
          showLabels: true,
        },
        visible: true,
      },
    ],
    autoRefresh: false,
    refreshInterval: 0,
  };

  useEffect(() => {
    // Check if dashboard has a valid config with widgets array
    if (
      dashboard.config &&
      dashboard.config.widgets &&
      dashboard.config.widgets.length > 0
    ) {
      setConfigText(JSON.stringify(dashboard.config, null, 2));
    } else {
      // Use default config if no widgets or config is empty
      setConfigText(JSON.stringify(defaultConfig, null, 2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard.config, dashboard.selectedTable]);

  useEffect(() => {
    if (dashboard?.selectedTable && dashboard?.dataSourceId) {
      loadTableColumns();
      loadTablePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard?.selectedTable, dashboard?.dataSourceId]);

  const loadTableColumns = async () => {
    if (!dashboard.dataSourceId || !dashboard.selectedTable) return;

    try {
      setLoadingColumns(true);
      console.log("Loading columns for:", {
        tenantId,
        dataSourceId: dashboard.dataSourceId,
        table: dashboard.selectedTable,
      });

      const data = await getDataSourceColumns(
        tenantId,
        dashboard.dataSourceId,
        dashboard.selectedTable
      );

      console.log("Columns data received:", data);

      if (data.columns && Array.isArray(data.columns)) {
        setColumns(data.columns);
      } else {
        console.warn("No columns returned from API");
        setColumns([]);
      }
    } catch (err: any) {
      console.error("Error loading columns:", err);
      toast.error(err.message || "Failed to load table columns");
      setColumns([]);
    } finally {
      setLoadingColumns(false);
    }
  };

  const loadTablePreview = async () => {
    if (!dashboard.dataSourceId || !dashboard.selectedTable) return;

    try {
      setLoadingPreview(true);

      // Get auth token
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Not authenticated");
      }
      const token = await user.getIdToken(true);

      const response = await fetch(
        `http://localhost:5001/api/tenants/${tenantId}/datasources/${
          dashboard.dataSourceId
        }/preview?table=${encodeURIComponent(
          dashboard.selectedTable
        )}&limit=10`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch preview");
      }

      const result = await response.json();

      setPreviewData({
        columns: result.columns || [],
        rows: result.data || [],
      });
    } catch (err: any) {
      console.error("Error loading preview:", err);
      toast.error(err.message || "Failed to load table preview");
      setPreviewData(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfigChange = (value: string) => {
    setConfigText(value);
    try {
      JSON.parse(value);
      setIsValid(true);
    } catch {
      setIsValid(false);
    }
  };

  const handleSave = async () => {
    if (!isValid) {
      toast.error("Invalid JSON format. Please fix the errors first.");
      return;
    }

    try {
      setIsSaving(true);
      const config = JSON.parse(configText);

      // Save config by creating a new version
      const result = await createDashboardVersion(tenantId, dashboard.id, {
        config,
        changeLog: "Configuration updated from Design Tab",
      });

      console.log("Configuration saved:", result);
      toast.success("Configuration saved successfully!");
    } catch (err: any) {
      console.error("Error saving config:", err);
      if (err.message.includes("Unexpected token")) {
        toast.error("Invalid JSON format. Please fix the errors.");
      } else {
        toast.error(err.message || "Failed to save configuration");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfigText(JSON.stringify(defaultConfig, null, 2));
    setIsValid(true);
    toast.info("Configuration reset to default");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(configText);
    toast.success("Configuration copied to clipboard!");
  };

  const generateWidgetTemplate = (type: string) => {
    const widgetId = `widget_${Date.now()}`;

    const templates: Record<string, any> = {
      bar: {
        id: widgetId,
        title: "Bar Chart",
        type: "bar",
        position: { x: 0, y: 0, w: 6, h: 4 },
        dataConfig: {
          table: dashboard.selectedTable || "",
          xField: "",
          yField: "",
          aggregation: "sum",
          limit: 100,
        },
        styleConfig: {
          color: "#3b82f6",
          showLegend: true,
          showGrid: true,
          showLabels: true,
        },
        visible: true,
      },
      line: {
        id: widgetId,
        title: "Line Chart",
        type: "line",
        position: { x: 6, y: 0, w: 6, h: 4 },
        dataConfig: {
          table: dashboard.selectedTable || "",
          xField: "",
          yField: "",
          aggregation: "sum",
          limit: 100,
        },
        styleConfig: {
          color: "#10b981",
          showLegend: true,
          showGrid: true,
          showLabels: true,
        },
        visible: true,
      },
      pie: {
        id: widgetId,
        title: "Pie Chart",
        type: "pie",
        position: { x: 0, y: 4, w: 4, h: 4 },
        dataConfig: {
          table: dashboard.selectedTable || "",
          xField: "",
          yField: "",
          aggregation: "sum",
          limit: 10,
        },
        styleConfig: {
          showLegend: true,
          showLabels: true,
        },
        visible: true,
      },
      kpi: {
        id: widgetId,
        title: "KPI Card",
        type: "kpi",
        position: { x: 4, y: 4, w: 2, h: 2 },
        dataConfig: {
          table: dashboard.selectedTable || "",
          yField: "",
          aggregation: "sum",
        },
        styleConfig: {
          color: "#f59e0b",
          prefix: "",
          suffix: "",
        },
        visible: true,
      },
      table: {
        id: widgetId,
        title: "Data Table",
        type: "table",
        position: { x: 0, y: 8, w: 12, h: 6 },
        dataConfig: {
          table: dashboard.selectedTable || "",
          limit: 50,
        },
        styleConfig: {
          showPagination: true,
          pageSize: 10,
        },
        visible: true,
      },
    };

    return templates[type] || templates.bar;
  };

  const handleAddWidget = (type: string) => {
    try {
      const config = JSON.parse(configText);
      const newWidget = generateWidgetTemplate(type);

      // Add new widget to widgets array
      config.widgets = [...(config.widgets || []), newWidget];

      // Update config text
      const updatedConfig = JSON.stringify(config, null, 2);
      setConfigText(updatedConfig);
      setIsValid(true);

      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} chart added!`
      );
    } catch (err) {
      toast.error("Invalid JSON. Please fix errors first.");
    }
  };

  // Check if we have required data to show config editor
  if (!dashboard?.selectedTable || !dashboard?.dataSourceId) {
    return (
      <Card>
        <CardContent className="py-20">
          <div className="text-center text-gray-500">
            <Database className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2">No Table Selected</h3>
            <p className="text-sm mb-6 max-w-md mx-auto">
              Before you can design your dashboard, you need to:
            </p>
            <div className="text-left max-w-md mx-auto mb-6 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">1.</span>
                <p className="text-sm">
                  Go to <strong>Settings</strong> tab
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">2.</span>
                <p className="text-sm">
                  Select or create a <strong>Data Source</strong>
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">3.</span>
                <p className="text-sm">
                  Test the connection and choose a <strong>Table</strong>
                </p>
              </div>
            </div>
            <Button className="mt-4">
              <Sparkles className="mr-2 h-4 w-4" />
              Go to Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-280px)]">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            Table: {dashboard.selectedTable}
          </Badge>
          <Badge variant={isValid ? "default" : "destructive"}>
            {isValid ? "Valid JSON" : "Invalid JSON"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Config"}
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Left - JSON Editor */}
        <div className="flex-1 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Configuration Editor</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Widget
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleAddWidget("bar")}>
                    📊 Bar Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddWidget("line")}>
                    📈 Line Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddWidget("pie")}>
                    🥧 Pie Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddWidget("kpi")}>
                    🎯 KPI Card
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddWidget("table")}>
                    📋 Data Table
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="flex-1 p-0 min-h-0 overflow-hidden">
              <MonacoEditor
                height="100%"
                language="json"
                value={configText}
                onChange={(value) => handleConfigChange(value || "")}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  formatOnPaste: true,
                  formatOnType: true,
                  quickSuggestions: true,
                  suggest: {
                    showWords: true,
                    showSnippets: true,
                  },
                  folding: true,
                  bracketPairColorization: {
                    enabled: true,
                  },
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right - Documentation */}
        <div className="w-1/3 min-h-0 flex flex-col">
          <Tabs
            defaultValue="columns"
            className="w-full flex-1 flex flex-col min-h-0"
          >
            <TabsList className="grid w-full grid-cols-3 shrink-0">
              <TabsTrigger value="columns">Columns</TabsTrigger>
              <TabsTrigger value="preview">
                <Table className="h-4 w-4 mr-1" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="docs">
                <BookOpen className="h-4 w-4 mr-1" />
                Docs
              </TabsTrigger>
            </TabsList>

            {/* Available Columns */}
            <TabsContent value="columns" className="flex-1 overflow-hidden">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3 shrink-0">
                  <CardTitle className="text-sm">Available Columns</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  {loadingColumns ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                  ) : columns.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      No columns available
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {columns.map((col) => (
                        <div
                          key={col.name}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded text-xs cursor-pointer"
                          onClick={() => {
                            navigator.clipboard.writeText(col.name);
                            toast.success(`Copied: ${col.name}`);
                          }}
                        >
                          <span className="font-mono font-semibold">
                            {col.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {col.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Table Preview */}
            <TabsContent value="preview" className="flex-1 overflow-hidden">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3 shrink-0">
                  <CardTitle className="text-sm">Table Preview</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  {loadingPreview ? (
                    <div className="text-sm text-gray-500">
                      Loading preview...
                    </div>
                  ) : !previewData ? (
                    <div className="text-sm text-gray-500">
                      Failed to load preview
                    </div>
                  ) : (
                    <div className="overflow-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100 border-b border-gray-200">
                            {previewData.columns.map((col) => (
                              <th
                                key={col}
                                className="px-3 py-2 text-left font-semibold text-gray-800"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.rows.map((row, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              {previewData.columns.map((col) => (
                                <td
                                  key={col}
                                  className="px-3 py-2 text-gray-700 max-w-[200px] truncate"
                                >
                                  {row[col] !== null && row[col] !== undefined
                                    ? String(row[col])
                                    : "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documentation */}
            <TabsContent value="docs" className="flex-1 overflow-auto">
              <div className="space-y-4">
                <ConfigDocumentation />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Documentation Component
function ConfigDocumentation() {
  return (
    <div className="space-y-4">
      {/* Dashboard Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Dashboard Config</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div>
            <code className="bg-gray-100 px-1 rounded">layout</code>
            <p className="text-gray-600 mt-1">
              &quot;grid&quot; | &quot;single-page&quot; | &quot;custom&quot;
            </p>
          </div>
          <div>
            <code className="bg-gray-100 px-1 rounded">theme</code>
            <p className="text-gray-600 mt-1">
              &quot;light&quot; | &quot;dark&quot; | &quot;auto&quot;
            </p>
          </div>
          <div>
            <code className="bg-gray-100 px-1 rounded">gridCols</code>
            <p className="text-gray-600 mt-1">Number (1-24)</p>
          </div>
          <div>
            <code className="bg-gray-100 px-1 rounded">gridRowHeight</code>
            <p className="text-gray-600 mt-1">Number (pixels)</p>
          </div>
        </CardContent>
      </Card>

      {/* Widget Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Widget Properties</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-3">
          <div>
            <code className="bg-blue-100 px-1 rounded font-semibold">id</code>
            <p className="text-gray-600 mt-1">Unique identifier (string)</p>
          </div>
          <div>
            <code className="bg-blue-100 px-1 rounded font-semibold">
              title
            </code>
            <p className="text-gray-600 mt-1">Widget title (string)</p>
          </div>
          <div>
            <code className="bg-blue-100 px-1 rounded font-semibold">type</code>
            <p className="text-gray-600 mt-1">
              &quot;bar&quot; | &quot;line&quot; | &quot;pie&quot; |
              &quot;doughnut&quot; | &quot;area&quot; | &quot;kpi&quot; |
              &quot;table&quot; | &quot;gauge&quot;
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Position */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Position</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div>
            <code className="bg-green-100 px-1 rounded">x</code>
            <span className="text-gray-600 ml-2">Column position (0-11)</span>
          </div>
          <div>
            <code className="bg-green-100 px-1 rounded">y</code>
            <span className="text-gray-600 ml-2">Row position (0+)</span>
          </div>
          <div>
            <code className="bg-green-100 px-1 rounded">w</code>
            <span className="text-gray-600 ml-2">Width (1-12)</span>
          </div>
          <div>
            <code className="bg-green-100 px-1 rounded">h</code>
            <span className="text-gray-600 ml-2">Height (1+)</span>
          </div>
        </CardContent>
      </Card>

      {/* Data Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Data Config</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div>
            <code className="bg-purple-100 px-1 rounded">table</code>
            <p className="text-gray-600 mt-1">Table name (string)</p>
          </div>
          <div>
            <code className="bg-purple-100 px-1 rounded">xField</code>
            <p className="text-gray-600 mt-1">X-axis column name</p>
          </div>
          <div>
            <code className="bg-purple-100 px-1 rounded">yField</code>
            <p className="text-gray-600 mt-1">Y-axis column name</p>
          </div>
          <div>
            <code className="bg-purple-100 px-1 rounded">aggregation</code>
            <p className="text-gray-600 mt-1">
              &quot;sum&quot; | &quot;avg&quot; | &quot;count&quot; |
              &quot;min&quot; | &quot;max&quot; | &quot;none&quot;
            </p>
          </div>
          <div>
            <code className="bg-purple-100 px-1 rounded">limit</code>
            <p className="text-gray-600 mt-1">Max rows (number)</p>
          </div>
        </CardContent>
      </Card>

      {/* Style Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Style Config</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div>
            <code className="bg-orange-100 px-1 rounded">color</code>
            <p className="text-gray-600 mt-1">Hex color (#3b82f6)</p>
          </div>
          <div>
            <code className="bg-orange-100 px-1 rounded">showLegend</code>
            <p className="text-gray-600 mt-1">Boolean</p>
          </div>
          <div>
            <code className="bg-orange-100 px-1 rounded">showGrid</code>
            <p className="text-gray-600 mt-1">Boolean</p>
          </div>
          <div>
            <code className="bg-orange-100 px-1 rounded">showLabels</code>
            <p className="text-gray-600 mt-1">Boolean</p>
          </div>
          <div>
            <code className="bg-orange-100 px-1 rounded">prefix</code>
            <p className="text-gray-600 mt-1">Text before value ($, ฿)</p>
          </div>
          <div>
            <code className="bg-orange-100 px-1 rounded">suffix</code>
            <p className="text-gray-600 mt-1">Text after value (%, kg)</p>
          </div>
        </CardContent>
      </Card>

      {/* Example */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Example Widget</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
            {`{
  "id": "widget_1",
  "title": "Sales Chart",
  "type": "bar",
  "position": {
    "x": 0,
    "y": 0,
    "w": 6,
    "h": 4
  },
  "dataConfig": {
    "table": "sales",
    "xField": "product",
    "yField": "amount",
    "aggregation": "sum",
    "limit": 100
  },
  "styleConfig": {
    "color": "#3b82f6",
    "showLegend": true,
    "prefix": "$"
  },
  "visible": true
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
