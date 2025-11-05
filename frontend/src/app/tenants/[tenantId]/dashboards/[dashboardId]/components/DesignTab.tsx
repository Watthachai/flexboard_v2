"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Database,
  Loader2,
  XCircle,
  RefreshCw,
  Settings,
  Pencil,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { previewTableData } from "@/lib/api";

interface Dashboard {
  id: string;
  selectedTable?: string;
  dataSourceId?: string;
}

interface DesignTabProps {
  dashboard: Dashboard;
  tenantId: string;
}

export function DesignTab({ dashboard, tenantId }: DesignTabProps) {
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string>("");

  const [dashboardConfig, setDashboardConfig] = useState<string>("");
  const [isEditingConfig, setIsEditingConfig] = useState(false);

  useEffect(() => {
    if (dashboard?.selectedTable && dashboard?.dataSourceId) {
      loadPreviewData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard?.selectedTable, dashboard?.dataSourceId]);

  const loadPreviewData = async () => {
    if (!dashboard?.selectedTable || !dashboard?.dataSourceId) return;

    try {
      setLoadingPreview(true);
      setPreviewError("");

      const result = await previewTableData(
        tenantId,
        dashboard.dataSourceId,
        dashboard.selectedTable,
        5
      );

      setPreviewData(result.data);
      setPreviewColumns(result.columns);
    } catch (error: any) {
      console.error("Error loading preview data:", error);
      setPreviewError(error.message || "Failed to load preview data");
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Preview Card */}
      {dashboard?.selectedTable && dashboard?.dataSourceId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Preview: {dashboard.selectedTable}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPreview ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading data...</span>
              </div>
            ) : previewError ? (
              <div className="text-center py-12">
                <XCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
                <p className="text-red-600">{previewError}</p>
                <Button
                  variant="outline"
                  onClick={loadPreviewData}
                  className="mt-4"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : previewData.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {previewColumns.map((column) => (
                          <th
                            key={column}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.map((row, idx) => (
                        <tr key={idx}>
                          {previewColumns.map((column) => (
                            <td
                              key={column}
                              className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                            >
                              {row[column]?.toString() || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-sm text-gray-500 text-center">
                  Showing {previewData.length} of total records
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Table Selected</h3>
              <p className="mb-4">
                Please select a data source and table in Settings tab first
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Config Editor Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Dashboard Configuration
            </CardTitle>
            <div className="flex gap-2">
              {!isEditingConfig ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingConfig(true);
                    const defaultConfig = {
                      layout: "grid",
                      theme: "light",
                      gridCols: 12,
                      gridRowHeight: 100,
                      widgets: [],
                      autoRefresh: false,
                      refreshInterval: 0,
                    };
                    setDashboardConfig(JSON.stringify(defaultConfig, null, 2));
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Config
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditingConfig(false);
                      setDashboardConfig("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      try {
                        JSON.parse(dashboardConfig);
                        toast.success("✅ Configuration saved!");
                        setIsEditingConfig(false);
                      } catch {
                        toast.error("❌ Invalid JSON format");
                      }
                    }}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Config
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!isEditingConfig ? (
            <div className="text-center py-12 text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">
                Dashboard Configuration
              </h3>
              <p className="mb-4">
                Edit dashboard configuration in JSON format to customize layout,
                widgets, and settings
              </p>
              <Button
                onClick={() => {
                  setIsEditingConfig(true);
                  const defaultConfig = {
                    layout: "grid",
                    theme: "light",
                    gridCols: 12,
                    gridRowHeight: 100,
                    widgets: [],
                    autoRefresh: false,
                    refreshInterval: 0,
                  };
                  setDashboardConfig(JSON.stringify(defaultConfig, null, 2));
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Configuration
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  💡 Configuration Guide
                </h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>
                    • <strong>layout</strong>: &quot;grid&quot; |
                    &quot;single-page&quot; | &quot;custom&quot;
                  </li>
                  <li>
                    • <strong>theme</strong>: &quot;light&quot; |
                    &quot;dark&quot; | &quot;auto&quot;
                  </li>
                  <li>
                    • <strong>gridCols</strong>: Number of grid columns (1-24)
                  </li>
                  <li>
                    • <strong>widgets</strong>: Array of widget configurations
                  </li>
                  <li>
                    • <strong>autoRefresh</strong>: Enable auto-refresh
                    (boolean)
                  </li>
                </ul>
              </div>
              <div>
                <Label
                  htmlFor="config-editor"
                  className="text-sm font-medium mb-2 block"
                >
                  JSON Configuration
                </Label>
                <textarea
                  id="config-editor"
                  value={dashboardConfig}
                  onChange={(e) => setDashboardConfig(e.target.value)}
                  className="w-full h-96 p-4 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="Enter dashboard configuration in JSON format..."
                  spellCheck={false}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
