"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Database,
  Sparkles,
  Copy,
  RotateCcw,
  BookOpen,
  Table,
  Plus,
  ChevronDown,
  ExternalLink,
  BarChartBig,
  Check,
  X,
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
import {
  getDataSourceColumns,
  createDashboardVersion,
  updateDashboardVersion,
  getDashboardVersions,
  getDashboardVersion,
} from "@/lib/api";
import { AIConfigAssistant } from "@/components/dashboard-wizard/AIConfigAssistant";
import { useAuth } from "@/contexts/AuthContext";

// Dynamically import Monaco Editor (client-side only)
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-gray-500">
      Loading editor...
    </div>
  ),
});

// Import DiffEditor for showing differences
const DiffEditor = dynamic(
  () =>
    import("@monaco-editor/react").then((module) => ({
      default: module.DiffEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        Loading diff editor...
      </div>
    ),
  }
);

interface Dashboard {
  id: string;
  selectedTable?: string;
  dataSourceId?: string;
  config?: DashboardConfig;
  currentVersion?: string;
}

interface DashboardVersion {
  id: string;
  versionNumber: string;
  isActive: boolean;
  publishedAt: Date;
  publishedBy: string;
  changeLog?: string;
}

interface DesignTabProps {
  dashboard: Dashboard;
  tenantId: string;
  dashboardId: string;
  onUpdate: (data: any) => void;
  onVersionChange?: (data: {
    selectedVersion: string;
    currentVersion: string;
    isViewingCurrent: boolean;
  }) => void;
}

interface TableColumn {
  name: string;
  type: string;
}

interface TablePreviewData {
  columns: string[];
  rows: any[];
}

export function DesignTab({
  dashboard,
  tenantId,
  dashboardId,
  onUpdate,
  onVersionChange,
}: DesignTabProps) {
  const { user } = useAuth();
  const [configText, setConfigText] = useState<string>("");
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Version management states
  const [versions, setVersions] = useState<DashboardVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [activeVersion, setActiveVersion] = useState<string>("");
  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [hasDraftChanges, setHasDraftChanges] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<string>("");
  const [isVersionChanged, setIsVersionChanged] = useState(false);

  // Notify parent when version selection changes
  useEffect(() => {
    if (selectedVersion && currentVersion && onVersionChange) {
      onVersionChange({
        selectedVersion,
        currentVersion,
        isViewingCurrent: selectedVersion === currentVersion,
      });
    }
  }, [selectedVersion, currentVersion, onVersionChange]);

  // Set current version from dashboard
  useEffect(() => {
    if (dashboard.currentVersion) {
      setCurrentVersion(dashboard.currentVersion);
    }
  }, [dashboard.currentVersion]);

  // Set selected version to current version initially
  useEffect(() => {
    if (currentVersion && !selectedVersion) {
      setSelectedVersion(currentVersion);
    }
  }, [currentVersion, selectedVersion]);

  // Table preview states
  const [previewData, setPreviewData] = useState<TablePreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Diff mode states
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [diffOriginalConfig, setDiffOriginalConfig] = useState<string>("");
  const [diffModifiedConfig, setDiffModifiedConfig] = useState<string>("");
  const [diffExplanation, setDiffExplanation] = useState<string>("");

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
      const configStr = JSON.stringify(dashboard.config, null, 2);
      setConfigText(configStr);
      setOriginalConfig(configStr);
    } else {
      // Use default config if no widgets or config is empty
      const configStr = JSON.stringify(defaultConfig, null, 2);
      setConfigText(configStr);
      setOriginalConfig(configStr);
    }

    // Load versions
    loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard.config, dashboard.selectedTable]);

  useEffect(() => {
    if (dashboard?.selectedTable && dashboard?.dataSourceId) {
      loadTableColumns();
      // Don't auto-load preview - load on tab click instead
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard?.selectedTable, dashboard?.dataSourceId]);

  // Load all versions
  const loadVersions = async () => {
    try {
      setLoadingVersions(true);
      const data = await getDashboardVersions(tenantId, dashboard.id);
      setVersions(data || []);

      // Set selected version to current active version
      const activeVer = data?.find((v: DashboardVersion) => v.isActive);
      if (activeVer) {
        setSelectedVersion(activeVer.versionNumber);
        setActiveVersion(activeVer.versionNumber);
      }
    } catch (error: any) {
      console.error("Error loading versions:", error);
    } finally {
      setLoadingVersions(false);
    }
  };

  const loadTableColumns = async () => {
    if (!dashboard.dataSourceId || !dashboard.selectedTable) return;

    try {
      setLoadingColumns(true);
      //console.log("Loading columns for:", {
      //tenantId,
      //dataSourceId: dashboard.dataSourceId,
      //table: dashboard.selectedTable,
      //});

      const data = await getDataSourceColumns(
        tenantId,
        dashboard.dataSourceId,
        dashboard.selectedTable
      );

      //console.log("Columns data received:", data);

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
      if (!user) {
        throw new Error("Not authenticated");
      }
      const token = await user.getIdToken(true);

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"
        }/api/tenants/${tenantId}/datasources/${
          dashboard.dataSourceId
        }/preview?table=${encodeURIComponent(
          dashboard.selectedTable
        )}&limit=25`,
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
    } catch {
      console.error("Error loading preview");
      toast.error("Failed to load table preview");
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

      // Check if config has changed from original
      setHasDraftChanges(value !== originalConfig);
    } catch {
      setIsValid(false);
    }
  };

  // Save current config (update existing version)
  const handleSaveConfig = async () => {
    if (!isValid) {
      toast.error("Invalid JSON format. Please fix the errors first.");
      return;
    }

    try {
      setIsSaving(true);
      const config = JSON.parse(configText);

      if (isVersionChanged && selectedVersion) {
        // UPDATE existing version
        const result = await updateDashboardVersion(
          tenantId,
          dashboardId,
          selectedVersion,
          {
            config,
            changeLog: `Updated configuration for v${selectedVersion}`,
          }
        );

        console.log("Version updated:", result);
        toast.success(`Version ${selectedVersion} updated successfully!`);
      } else {
        // Save to current active version by updating current dashboard version
        const currentVersionToUpdate =
          dashboard?.currentVersion || selectedVersion;

        if (!currentVersionToUpdate) {
          toast.error("No version available to update");
          return;
        }

        const result = await updateDashboardVersion(
          tenantId,
          dashboardId,
          currentVersionToUpdate,
          {
            config,
            changeLog: `Configuration updated`,
          }
        );

        console.log("Current version updated:", result);
        toast.success("Configuration saved to database successfully!");
      }

      setOriginalConfig(configText);
      setHasDraftChanges(false);

      // Don't call onUpdate to avoid page reload
    } catch (err: any) {
      console.error("Error saving config:", err);
      toast.error(err.message || "Failed to save config");
    } finally {
      setIsSaving(false);
    }
  };

  // Publish as new version (always create new version)
  const handlePublishVersion = async () => {
    if (!isValid) {
      toast.error("Invalid JSON format. Please fix the errors first.");
      return;
    }

    try {
      setIsSaving(true);
      const config = JSON.parse(configText);

      // Always CREATE new version
      const result = await createDashboardVersion(tenantId, dashboardId, {
        config,
        changeLog: `New version created`,
      });

      console.log("Version created:", result);
      toast.success(
        `Version ${result.versionNumber} created! Use "Publish Dashboard" button above to activate it.`
      );

      // Reload versions and update state
      await loadVersions();
      setOriginalConfig(configText);
      setHasDraftChanges(false);
      setIsVersionChanged(false);

      // Notify parent to refresh
      if (onUpdate) {
        onUpdate({});
      }
    } catch (err: any) {
      console.error("Error creating new version:", err);
      toast.error(err.message || "Failed to create new version");
    } finally {
      setIsSaving(false);
    }
  };

  // Preview version (load config without activating)
  const handleSwitchVersion = async (versionNumber: string) => {
    try {
      setLoadingVersions(true);

      // Fetch the config for this version
      const versionData = await getDashboardVersion(
        tenantId,
        dashboard.id,
        versionNumber
      );

      if (versionData && versionData.config) {
        const configStr = JSON.stringify(versionData.config, null, 2);
        setConfigText(configStr);
        setOriginalConfig(configStr);
        setSelectedVersion(versionNumber);
        setIsVersionChanged(versionNumber !== activeVersion);
        setHasDraftChanges(false);

        toast.success(`Loaded version ${versionNumber}`);
      }
    } catch (err: any) {
      console.error("Error loading version:", err);
      toast.error(err.message || "Failed to load version");
    } finally {
      setLoadingVersions(false);
    }
  };

  // Discard draft changes
  const handleDiscardDraft = () => {
    setConfigText(originalConfig);
    setHasDraftChanges(false);
    toast.info("Draft changes discarded");
  };

  const handleReset = () => {
    const configStr = JSON.stringify(defaultConfig, null, 2);
    setConfigText(configStr);
    setOriginalConfig(configStr);
    setIsValid(true);
    setHasDraftChanges(false);
    toast.info("Configuration reset to default");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(configText);
    toast.success("Configuration copied to clipboard!");
  };

  // Handle showing diff from AI
  const handleShowDiff = (
    originalConfig: any,
    modifiedConfig: any,
    explanation?: string
  ) => {
    console.log("🔄 Showing diff:", {
      originalConfig,
      modifiedConfig,
      explanation,
    });

    // ALWAYS use current editor content as the original (full config)
    let fullOriginalConfig;
    try {
      fullOriginalConfig = JSON.parse(configText);
      console.log("✅ Using current editor config as original");
    } catch {
      // Fallback to default config if current text is invalid
      fullOriginalConfig = defaultConfig;
      console.log(
        "⚠️ Using default config as original (editor content invalid)"
      );
    }

    // ALWAYS create full modified config by merging AI suggestions
    const fullModifiedConfig = { ...fullOriginalConfig }; // Start with full current config

    // If AI sent partial config (widgets only)
    if (modifiedConfig.widgets && Array.isArray(modifiedConfig.widgets)) {
      console.log("🔧 Merging AI widgets into full config");

      // Clone current widgets array
      const currentWidgets = [...(fullOriginalConfig.widgets || [])];

      // For each AI widget, find and replace matching widget or add new one
      modifiedConfig.widgets.forEach((aiWidget: any) => {
        const existingIndex = currentWidgets.findIndex(
          (w) => w.id === aiWidget.id
        );

        if (existingIndex >= 0) {
          // Replace existing widget
          console.log(`🔄 Replacing widget ${aiWidget.id}`);
          currentWidgets[existingIndex] = aiWidget;
        } else {
          // Add new widget
          console.log(`➕ Adding new widget ${aiWidget.id}`);
          currentWidgets.push(aiWidget);
        }
      });

      fullModifiedConfig.widgets = currentWidgets;
      console.log(
        `📊 Widget merge result: ${currentWidgets.length} total widgets`
      );
    }

    // If AI sent other properties, merge them too
    if (modifiedConfig.layout)
      fullModifiedConfig.layout = modifiedConfig.layout;
    if (modifiedConfig.theme) fullModifiedConfig.theme = modifiedConfig.theme;
    if (modifiedConfig.gridCols)
      fullModifiedConfig.gridCols = modifiedConfig.gridCols;
    if (modifiedConfig.gridRowHeight)
      fullModifiedConfig.gridRowHeight = modifiedConfig.gridRowHeight;
    if (modifiedConfig.autoRefresh !== undefined)
      fullModifiedConfig.autoRefresh = modifiedConfig.autoRefresh;
    if (modifiedConfig.refreshInterval !== undefined)
      fullModifiedConfig.refreshInterval = modifiedConfig.refreshInterval;

    console.log("📄 Full configs for diff:", {
      originalLines: JSON.stringify(fullOriginalConfig, null, 2).split("\n")
        .length,
      modifiedLines: JSON.stringify(fullModifiedConfig, null, 2).split("\n")
        .length,
      originalKeys: Object.keys(fullOriginalConfig),
      modifiedKeys: Object.keys(fullModifiedConfig),
      originalWidgets: fullOriginalConfig.widgets?.length || 0,
      modifiedWidgets: fullModifiedConfig.widgets?.length || 0,
    });

    const originalJson = JSON.stringify(fullOriginalConfig, null, 2);
    const modifiedJson = JSON.stringify(fullModifiedConfig, null, 2);

    // Verify we have substantial content
    const originalLineCount = originalJson.split("\n").length;
    const modifiedLineCount = modifiedJson.split("\n").length;

    console.log(
      `📊 Line counts - Original: ${originalLineCount}, Modified: ${modifiedLineCount}`
    );

    // Check if configs are valid JSON objects instead of just line count
    const isValidOriginal =
      fullOriginalConfig &&
      typeof fullOriginalConfig === "object" &&
      fullOriginalConfig.hasOwnProperty("layout") &&
      Array.isArray(fullOriginalConfig.widgets);

    const isValidModified =
      fullModifiedConfig &&
      typeof fullModifiedConfig === "object" &&
      fullModifiedConfig.hasOwnProperty("layout") &&
      Array.isArray(fullModifiedConfig.widgets);

    if (!isValidOriginal || !isValidModified) {
      console.error("❌ Invalid config structure! Something went wrong:");
      console.log("Original config:", fullOriginalConfig);
      console.log("Modified config:", fullModifiedConfig);
      console.log("Original valid:", isValidOriginal);
      console.log("Modified valid:", isValidModified);
      toast.error("Configuration structure is invalid. Please try again.");
      return;
    }

    // For very short configs (like new empty configs), ensure minimum meaningful diff
    if (originalLineCount < 5 && modifiedLineCount < 5) {
      console.log(
        "⚠️ Both configs are very short, but valid. Proceeding with diff..."
      );
    }

    setDiffOriginalConfig(originalJson);
    setDiffModifiedConfig(modifiedJson);
    setDiffExplanation(explanation || "AI suggested changes");
    setIsDiffMode(true);

    toast.info(
      `Diff ready! Original: ${originalLineCount} lines, Modified: ${modifiedLineCount} lines`
    );
  };

  // Apply diff changes
  const handleApplyDiff = () => {
    try {
      // Validate JSON before applying
      JSON.parse(diffModifiedConfig);
      setConfigText(diffModifiedConfig);
      setHasDraftChanges(true);
      setIsDiffMode(false);
      // Add small delay to allow Monaco to cleanup properly
      setTimeout(() => {
        setDiffOriginalConfig("");
        setDiffModifiedConfig("");
        setDiffExplanation("");
      }, 100);
      toast.success("AI suggestions applied to editor!");
    } catch (error) {
      console.error("Invalid JSON in diff config:", error);
      toast.error("Invalid configuration format");
    }
  };

  // Reject diff changes
  const handleRejectDiff = () => {
    setIsDiffMode(false);
    // Add small delay to allow Monaco to cleanup properly
    setTimeout(() => {
      setDiffOriginalConfig("");
      setDiffModifiedConfig("");
      setDiffExplanation("");
    }, 100);
    toast.info("AI suggestions rejected");
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
      area: {
        id: widgetId,
        title: "Area Chart",
        type: "area",
        position: { x: 0, y: 4, w: 6, h: 4 },
        dataConfig: {
          table: dashboard.selectedTable || "",
          xField: "",
          yField: "",
          aggregation: "sum",
          limit: 100,
        },
        styleConfig: {
          color: "#8b5cf6",
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
        position: { x: 0, y: 8, w: 4, h: 4 },
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
      doughnut: {
        id: widgetId,
        title: "Doughnut Chart",
        type: "doughnut",
        position: { x: 4, y: 8, w: 4, h: 4 },
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
      scatter: {
        id: widgetId,
        title: "Scatter Plot",
        type: "scatter",
        position: { x: 8, y: 8, w: 4, h: 4 },
        dataConfig: {
          table: dashboard.selectedTable || "",
          xField: "",
          yField: "",
          limit: 100,
        },
        styleConfig: {
          color: "#f59e0b",
          showLegend: true,
          showGrid: true,
        },
        visible: true,
      },
      kpi: {
        id: widgetId,
        title: "KPI Card",
        type: "kpi",
        position: { x: 6, y: 4, w: 2, h: 2 },
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
      metric: {
        id: widgetId,
        title: "Metric Card",
        type: "metric",
        position: { x: 8, y: 4, w: 2, h: 2 },
        dataConfig: {
          table: dashboard.selectedTable || "",
          yField: "",
          aggregation: "sum",
          unit: "",
          decimals: 0,
          description: "",
        },
        styleConfig: {
          color: "#06b6d4",
        },
        visible: true,
      },
      progress: {
        id: widgetId,
        title: "Progress Bar",
        type: "progress",
        position: { x: 10, y: 4, w: 2, h: 2 },
        dataConfig: {
          table: dashboard.selectedTable || "",
          xField: "",
          yField: "",
          maxValue: 100,
          unit: "%",
        },
        styleConfig: {
          color: "#84cc16",
        },
        visible: true,
      },
      gauge: {
        id: widgetId,
        title: "Gauge",
        type: "gauge",
        position: { x: 0, y: 12, w: 4, h: 4 },
        dataConfig: {
          table: dashboard.selectedTable || "",
          yField: "",
          aggregation: "avg",
          min: 0,
          max: 100,
        },
        styleConfig: {
          color: "#ef4444",
        },
        visible: true,
      },
      table: {
        id: widgetId,
        title: "Data Table",
        type: "table",
        position: { x: 4, y: 12, w: 8, h: 6 },
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
    } catch {
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
    <>
      <div className="flex flex-col gap-4 h-[calc(100vh-280px)]">
        {/* Header with Version Management */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              Table: {dashboard.selectedTable}
            </Badge>
            <Badge variant={isValid ? "default" : "destructive"}>
              {isValid ? "Valid JSON" : "Invalid JSON"}
            </Badge>
            {hasDraftChanges && (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800"
              >
                Config Changes
              </Badge>
            )}
            {isVersionChanged && !hasDraftChanges && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Viewing v{selectedVersion} (Not Active)
              </Badge>
            )}
            {diffModifiedConfig && !isDiffMode && (
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-800"
              >
                AI Diff Ready
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Version Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={loadingVersions}>
                  📊 Version: {selectedVersion || "Loading..."}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {versions.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 text-center">
                    No versions found
                  </div>
                ) : (
                  versions.map((version) => (
                    <DropdownMenuItem
                      key={version.id}
                      onClick={() => handleSwitchVersion(version.versionNumber)}
                      disabled={selectedVersion === version.versionNumber}
                    >
                      <div className="flex flex-col w-full">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-semibold">
                            {version.versionNumber}
                          </span>
                          <div className="flex gap-1">
                            {version.isActive && (
                              <Badge variant="default" className="text-xs">
                                Active
                              </Badge>
                            )}
                            {selectedVersion === version.versionNumber && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-blue-100 text-blue-800"
                              >
                                Viewing
                              </Badge>
                            )}
                          </div>
                        </div>
                        {version.changeLog && (
                          <p className="text-xs text-gray-500 mt-1">
                            {version.changeLog}
                          </p>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Action Buttons */}
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>

            {/* Show Diff Button */}
            {diffModifiedConfig && !isDiffMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDiffMode(true)}
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                View AI Diff
              </Button>
            )}

            {/* Show different buttons based on state */}
            {hasDraftChanges ? (
              // When there are draft changes (whether viewing different version or not)
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDiscardDraft}
                  className="text-red-600 hover:text-red-700"
                >
                  Discard
                </Button>
                <Button
                  onClick={handleSaveConfig}
                  disabled={!isValid || isSaving}
                  size="sm"
                  variant="outline"
                >
                  {isSaving ? "Saving..." : "Save Config"}
                </Button>
                <Button
                  onClick={handlePublishVersion}
                  disabled={!isValid || isSaving}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Publish as New Version
                </Button>
              </>
            ) : (
              // Default state - no changes - hide all buttons
              <></>
            )}
          </div>
        </div>

        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Left - JSON Editor */}
          <div className="flex-1 flex flex-col min-h-0">
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  {isDiffMode
                    ? "Configuration Diff - AI Suggestions"
                    : "Configuration Editor"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {isDiffMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsDiffMode(false);
                        // Add small delay to allow Monaco to cleanup properly
                        setTimeout(() => {
                          setDiffOriginalConfig("");
                          setDiffModifiedConfig("");
                          setDiffExplanation("");
                        }, 100);
                      }}
                    >
                      Exit Diff
                    </Button>
                  )}
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
                        <BarChartBig className="h-4 w-4 mr-2" /> Bar Chart
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddWidget("line")}>
                        📈 Line Chart
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddWidget("area")}>
                        📊 Area Chart
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddWidget("pie")}>
                        🥧 Pie Chart
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAddWidget("doughnut")}
                      >
                        🍩 Doughnut Chart
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAddWidget("scatter")}
                      >
                        📈 Scatter Plot
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAddWidget("table")}
                      >
                        📋 Data Table
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddWidget("kpi")}>
                        🎯 KPI Card
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAddWidget("metric")}
                      >
                        💳 Metric Card
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAddWidget("progress")}
                      >
                        📊 Progress Bar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAddWidget("gauge")}
                      >
                        ⚡ Gauge
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 min-h-0 overflow-hidden flex flex-col">
                {/* Editor Area */}
                <div className="flex-1">
                  {isDiffMode ? (
                    <DiffEditor
                      key={`diff-${diffOriginalConfig.length}-${diffModifiedConfig.length}`}
                      height="100%"
                      language="json"
                      original={diffOriginalConfig}
                      modified={diffModifiedConfig}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        renderSideBySide: true,
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        folding: true,
                        diffWordWrap: "on",
                        renderOverviewRuler: true,
                        ignoreTrimWhitespace: true,
                        renderIndicators: true,
                        enableSplitViewResizing: true,
                        fontFamily:
                          "'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', monospace",
                        fontLigatures: true,
                        padding: { top: 16, bottom: 16 },
                      }}
                    />
                  ) : (
                    <MonacoEditor
                      height="100%"
                      language="json"
                      value={configText}
                      onChange={(value) => handleConfigChange(value || "")}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: true },
                        fontSize: 14,
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
                        fontFamily:
                          "'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', monospace",
                        fontLigatures: true,
                        cursorBlinking: "smooth",
                        cursorSmoothCaretAnimation: "on",
                        smoothScrolling: true,
                        padding: { top: 16, bottom: 16 },
                      }}
                    />
                  )}
                </div>

                {/* Diff Action Buttons */}
                {isDiffMode && (
                  <div className="border-t bg-gray-900 p-4 flex items-center justify-between">
                    <div className="text-sm text-gray-300">
                      <span className="font-semibold">AI Suggestion:</span>{" "}
                      {diffExplanation}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRejectDiff}
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleApplyDiff}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Apply Changes
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right - Documentation */}
          <div className="w-1/3 min-h-0 flex flex-col">
            <Tabs
              defaultValue="columns"
              className="w-full flex-1 flex flex-col min-h-0"
              onValueChange={(value) => {
                // Load preview only when tab is clicked
                if (value === "preview" && !previewData && !loadingPreview) {
                  loadTablePreview();
                }
              }}
            >
              <TabsList className="grid w-full grid-cols-4 shrink-0">
                <TabsTrigger value="ai">
                  <Sparkles className="h-4 w-4 mr-1" />
                  AI
                </TabsTrigger>
                <TabsTrigger value="columns">Columns</TabsTrigger>
                <TabsTrigger value="preview">
                  <Table className="h-4 w-4 mr-1" />
                  Data
                </TabsTrigger>
                <TabsTrigger value="docs">
                  <BookOpen className="h-4 w-4 mr-1" />
                  Docs
                </TabsTrigger>
              </TabsList>

              {/* AI Assistant Tab */}
              <TabsContent value="ai" className="flex-1 overflow-hidden mt-0">
                <AIConfigAssistant
                  tenantId={tenantId}
                  currentConfig={(() => {
                    try {
                      return JSON.parse(configText);
                    } catch {
                      return null;
                    }
                  })()}
                  tableSchema={{
                    tableName: dashboard.selectedTable,
                    columns: columns,
                  }}
                  dataSource={(dashboard as any)?.dataSource}
                  selectedTable={dashboard?.selectedTable}
                  onShowDiff={handleShowDiff}
                />
              </TabsContent>

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
    </>
  );
}

// Documentation Component
function ConfigDocumentation() {
  const [showFullDocs, setShowFullDocs] = useState(false);

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
              &quot;bar&quot; | &quot;line&quot; | &quot;area&quot; |
              &quot;pie&quot; | &quot;doughnut&quot; | &quot;scatter&quot; |
              &quot;kpi&quot; | &quot;metric&quot; | &quot;progress&quot; |
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
            <p className="text-gray-600 mt-1">
              Table name (required if no query)
            </p>
          </div>
          <div>
            <code className="bg-purple-100 px-1 rounded">query</code>
            <p className="text-gray-600 mt-1">
              Custom SQL query (optional, replaces table)
            </p>
          </div>
          <div>
            <code className="bg-purple-100 px-1 rounded">xField</code>
            <p className="text-gray-600 mt-1">X-axis/category column name</p>
          </div>
          <div>
            <code className="bg-purple-100 px-1 rounded">yField</code>
            <p className="text-gray-600 mt-1">Y-axis/value column name</p>
          </div>
          <div>
            <code className="bg-purple-100 px-1 rounded">aggregation</code>
            <p className="text-gray-600 mt-1">
              &quot;sum&quot; | &quot;avg&quot; | &quot;count&quot; |
              &quot;min&quot; | &quot;max&quot;
            </p>
          </div>
          <div>
            <code className="bg-purple-100 px-1 rounded">groupBy</code>
            <p className="text-gray-600 mt-1">
              Array of fields to group by: [&quot;field1&quot;,
              &quot;field2&quot;]
            </p>
          </div>
          <div>
            <code className="bg-purple-100 px-1 rounded">orderBy</code>
            <p className="text-gray-600 mt-1">
              Array: [{`{ "field": "name", "direction": "ASC" }`}]
            </p>
          </div>
          <div>
            <code className="bg-purple-100 px-1 rounded">limit</code>
            <p className="text-gray-600 mt-1">
              Max rows (optional, no limit if omitted)
            </p>
          </div>
          <div className="pt-2 border-t border-gray-200">
            <p className="text-gray-700 font-semibold mb-1">
              💡 Important: Aggregation + GROUP BY
            </p>
            <p className="text-gray-600">
              When using <code>groupBy</code>, you MUST specify{" "}
              <code>aggregation</code> to avoid SQL errors.
            </p>
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
            <p className="text-gray-600 mt-1">
              Single hex color (#3b82f6) for bar/line
            </p>
          </div>
          <div>
            <code className="bg-orange-100 px-1 rounded">colors</code>
            <p className="text-gray-600 mt-1">
              Array of colors for pie/doughnut: [&quot;#3b82f6&quot;,
              &quot;#8b5cf6&quot;]
            </p>
          </div>
          <div>
            <code className="bg-orange-100 px-1 rounded">showLegend</code>
            <p className="text-gray-600 mt-1">Boolean (default: true)</p>
          </div>
          <div>
            <code className="bg-orange-100 px-1 rounded">showGrid</code>
            <p className="text-gray-600 mt-1">Boolean (default: true)</p>
          </div>
          <div>
            <code className="bg-orange-100 px-1 rounded">showLabels</code>
            <p className="text-gray-600 mt-1">Boolean (for pie/doughnut)</p>
          </div>
          <div>
            <code className="bg-orange-100 px-1 rounded">prefix</code>
            <p className="text-gray-600 mt-1">
              Text before value: &quot;฿&quot;, &quot;$&quot; (for KPI)
            </p>
          </div>
          <div>
            <code className="bg-orange-100 px-1 rounded">suffix</code>
            <p className="text-gray-600 mt-1">
              Text after value: &quot; units&quot;, &quot;%&quot; (for KPI)
            </p>
          </div>
          <div>
            <code className="bg-orange-100 px-1 rounded">unit</code>
            <p className="text-gray-600 mt-1">
              Unit for metric/progress: &quot;$&quot;, &quot;%&quot;,
              &quot;units&quot;
            </p>
          </div>
          <div>
            <code className="bg-orange-100 px-1 rounded">decimals</code>
            <p className="text-gray-600 mt-1">
              Decimal places for metric card (0-5)
            </p>
          </div>
          <div>
            <code className="bg-orange-100 px-1 rounded">maxValue</code>
            <p className="text-gray-600 mt-1">
              Maximum value for progress bar (default: 100)
            </p>
          </div>
          <div>
            <code className="bg-orange-100 px-1 rounded">min</code> /{" "}
            <code className="bg-orange-100 px-1 rounded">max</code>
            <p className="text-gray-600 mt-1">
              Range for gauge widget (e.g., 0-100)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tooltip Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tooltip Config</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div>
            <code className="bg-cyan-100 px-1 rounded">enabled</code>
            <p className="text-gray-600 mt-1">
              Boolean (enable custom tooltip)
            </p>
          </div>
          <div>
            <code className="bg-cyan-100 px-1 rounded">format</code>
            <p className="text-gray-600 mt-1">
              Format string with placeholders: {`"{fieldName}: ฿{value}"`}
            </p>
          </div>
          <div className="pt-2 border-t border-gray-200">
            <p className="text-gray-700 font-semibold mb-1">
              ✨ Auto-formatting:
            </p>
            <ul className="text-gray-600 list-disc list-inside space-y-1">
              <li>Numbers: 1234567 → 1,234,567</li>
              <li>Dates: 2019-04-01T00:00:00.000Z → 1 เม.ย. 2019</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* SQL Query Generation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">🔧 SQL Query Generation</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <p className="text-gray-700 font-semibold mb-2">
            When using table + aggregation + groupBy:
          </p>
          <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
            {`SELECT {xField}, 
  {aggregation}({yField}) as {yField}
FROM {table}
GROUP BY {groupBy}
ORDER BY {orderBy}
LIMIT {limit}`}
          </pre>
          <div className="pt-2 border-t border-gray-200">
            <p className="text-gray-700 font-semibold mb-1">Example:</p>
            <pre className="bg-blue-50 p-2 rounded text-xs overflow-x-auto">
              {`{
  "table": "sales",
  "xField": "product",
  "yField": "revenue",
  "aggregation": "sum",
  "groupBy": ["product"],
  "orderBy": [{
    "field": "revenue",
    "direction": "DESC"
  }],
  "limit": 10
}`}
            </pre>
            <p className="text-gray-600 mt-2">Generates:</p>
            <pre className="bg-green-50 p-2 rounded text-xs overflow-x-auto">
              {`SELECT product, 
  SUM(revenue) as revenue
FROM sales
GROUP BY product
ORDER BY revenue DESC
LIMIT 10`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Complete Example */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">📋 Complete Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">
                📊 Bar Chart Example:
              </p>
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
                {`{
  "id": "widget_1",
  "title": "Sales by Region",
  "type": "bar",
  "position": { "x": 0, "y": 0, "w": 6, "h": 4 },
  "dataConfig": {
    "table": "sales_data",
    "xField": "region",
    "yField": "totalSales",
    "aggregation": "sum",
    "groupBy": ["region"],
    "limit": 10
  },
  "styleConfig": {
    "color": "#3b82f6",
    "showGrid": true,
    "showLegend": true
  },
  "visible": true
}`}
              </pre>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">
                💳 Metric Card Example:
              </p>
              <pre className="text-xs bg-blue-50 p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
                {`{
  "id": "widget_2",
  "title": "Monthly Revenue",
  "type": "metric",
  "position": { "x": 6, "y": 0, "w": 3, "h": 2 },
  "dataConfig": {
    "table": "sales",
    "yField": "revenue",
    "aggregation": "sum",
    "unit": "$",
    "decimals": 2,
    "description": "Total revenue this month"
  },
  "styleConfig": {
    "color": "#10b981"
  },
  "visible": true
}`}
              </pre>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">
                📊 Progress Bar Example:
              </p>
              <pre className="text-xs bg-green-50 p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
                {`{
  "id": "widget_3",
  "title": "Project Completion",
  "type": "progress",
  "position": { "x": 9, "y": 0, "w": 3, "h": 2 },
  "dataConfig": {
    "table": "projects",
    "xField": "projectName",
    "yField": "completionRate",
    "maxValue": 100,
    "unit": "%"
  },
  "styleConfig": {
    "color": "#f59e0b"
  },
  "visible": true
}`}
              </pre>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">
                📈 Scatter Plot Example:
              </p>
              <pre className="text-xs bg-purple-50 p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
                {`{
  "id": "widget_4",
  "title": "Price vs Sales Correlation",
  "type": "scatter",
  "position": { "x": 0, "y": 2, "w": 6, "h": 4 },
  "dataConfig": {
    "table": "products",
    "xField": "price",
    "yField": "unitsSold",
    "limit": 100
  },
  "styleConfig": {
    "color": "#8b5cf6",
    "showGrid": true
  },
  "visible": true
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips & Troubleshooting */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            🎯 Widget Types Quick Reference
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-gray-700 font-semibold">📊 Chart Widgets:</p>
              <ul className="text-gray-600 mt-1 space-y-1 text-xs">
                <li>
                  • <code>bar</code> - Bar Chart
                </li>
                <li>
                  • <code>line</code> - Line Chart
                </li>
                <li>
                  • <code>area</code> - Area Chart
                </li>
                <li>
                  • <code>pie</code> - Pie Chart
                </li>
                <li>
                  • <code>doughnut</code> - Doughnut Chart
                </li>
                <li>
                  • <code>scatter</code> - Scatter Plot
                </li>
              </ul>
            </div>
            <div>
              <p className="text-gray-700 font-semibold">📋 Data Widgets:</p>
              <ul className="text-gray-600 mt-1 space-y-1 text-xs">
                <li>
                  • <code>table</code> - Data Table
                </li>
                <li>
                  • <code>kpi</code> - KPI Card
                </li>
                <li>
                  • <code>metric</code> - Metric Card
                </li>
                <li>
                  • <code>progress</code> - Progress Bar
                </li>
                <li>
                  • <code>gauge</code> - Gauge
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">💡 Tips & Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-3">
          <div>
            <p className="text-gray-700 font-semibold">
              ❌ Error: Column not in GROUP BY
            </p>
            <p className="text-gray-600 mt-1">
              Solution: Add <code>aggregation</code> when using{" "}
              <code>groupBy</code>
            </p>
          </div>
          <div>
            <p className="text-gray-700 font-semibold">
              📊 Chart shows no data
            </p>
            <p className="text-gray-600 mt-1">
              Check: Table name, field names, data source connection
            </p>
          </div>
          <div>
            <p className="text-gray-700 font-semibold">
              🎨 Want different colors for pie chart?
            </p>
            <p className="text-gray-600 mt-1">
              Use <code>colors</code> array instead of single <code>color</code>
            </p>
          </div>
          <div>
            <p className="text-gray-700 font-semibold">
              🔢 Need to remove data limit?
            </p>
            <p className="text-gray-600 mt-1">
              Just omit the <code>limit</code> field from{" "}
              <code>dataConfig</code>
            </p>
          </div>
          <div>
            <p className="text-gray-700 font-semibold">
              💳 Metric Card vs KPI Card?
            </p>
            <p className="text-gray-600 mt-1">
              Metric Card shows trends, KPI Card is simpler display
            </p>
          </div>
          <div>
            <p className="text-gray-700 font-semibold">
              📊 Progress Bar not showing correctly?
            </p>
            <p className="text-gray-600 mt-1">
              Check <code>maxValue</code> setting and ensure <code>yField</code>{" "}
              contains percentage/ratio
            </p>
          </div>
          <div>
            <p className="text-gray-700 font-semibold">
              📈 Scatter Plot needs X and Y fields
            </p>
            <p className="text-gray-600 mt-1">
              Both <code>xField</code> and <code>yField</code> are required for
              correlation analysis
            </p>
          </div>
          <div>
            <p className="text-gray-700 font-semibold">
              ⚡ Gauge Widget range settings
            </p>
            <p className="text-gray-600 mt-1">
              Set <code>min/max</code> in <code>dataConfig</code> to define
              gauge scale (e.g., 0-100)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Link to Full Docs */}
      <Card
        className="bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={() => setShowFullDocs(true)}
      >
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="text-blue-900 font-semibold mb-1 text-sm">
                  📚 Full Documentation
                </p>
                <p className="text-blue-700">
                  Complete reference with detailed examples, SQL generation, and
                  best practices
                </p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-blue-600 shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* Full Documentation Modal */}
      {showFullDocs && (
        <FullDocumentationModal onClose={() => setShowFullDocs(false)} />
      )}
    </div>
  );
}

// Full Documentation Modal Component
function FullDocumentationModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-linear-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Dashboard Configuration Reference
              </h2>
              <p className="text-sm text-gray-600">
                Complete guide with examples and best practices
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm max-w-none space-y-8">
            {/* Table of Contents */}
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-base">
                  📋 Table of Contents
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="#dashboard-config"
                    className="text-blue-600 hover:underline"
                  >
                    → Dashboard Configuration
                  </a>
                  <a
                    href="#widget-config"
                    className="text-blue-600 hover:underline"
                  >
                    → Widget Configuration
                  </a>
                  <a
                    href="#data-config"
                    className="text-blue-600 hover:underline"
                  >
                    → Data Configuration
                  </a>
                  <a
                    href="#style-config"
                    className="text-blue-600 hover:underline"
                  >
                    → Style Configuration
                  </a>
                  <a
                    href="#tooltip-config"
                    className="text-blue-600 hover:underline"
                  >
                    → Tooltip Configuration
                  </a>
                  <a
                    href="#sql-generation"
                    className="text-blue-600 hover:underline"
                  >
                    → SQL Query Generation
                  </a>
                  <a
                    href="#widget-types"
                    className="text-blue-600 hover:underline"
                  >
                    → Widget Types
                  </a>
                  <a href="#examples" className="text-blue-600 hover:underline">
                    → Complete Examples
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Dashboard Configuration */}
            <div id="dashboard-config">
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">
                📊 Dashboard Configuration
              </h3>
              <p className="text-gray-600 mb-4">
                Top-level dashboard configuration object.
              </p>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-blue-100 px-2 py-1 rounded text-sm font-semibold">
                          layout
                        </code>
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Layout mode: <code>&quot;grid&quot;</code>,{" "}
                        <code>&quot;single-page&quot;</code>, or{" "}
                        <code>&quot;custom&quot;</code>
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-blue-100 px-2 py-1 rounded text-sm font-semibold">
                          theme
                        </code>
                        <Badge variant="secondary" className="text-xs">
                          Optional
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Color theme: <code>&quot;light&quot;</code>,{" "}
                        <code>&quot;dark&quot;</code>, or{" "}
                        <code>&quot;auto&quot;</code> (default:{" "}
                        <code>&quot;light&quot;</code>)
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-blue-100 px-2 py-1 rounded text-sm font-semibold">
                          gridCols
                        </code>
                        <Badge variant="secondary" className="text-xs">
                          Optional
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Number of grid columns (1-24, default: <code>12</code>)
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-blue-100 px-2 py-1 rounded text-sm font-semibold">
                          gridRowHeight
                        </code>
                        <Badge variant="secondary" className="text-xs">
                          Optional
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Height of each grid row in pixels (default:{" "}
                        <code>100</code>)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Widget Configuration */}
            <div id="widget-config">
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">
                🎨 Widget Configuration
              </h3>
              <p className="text-gray-600 mb-4">
                Configuration for individual widgets on the dashboard.
              </p>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-purple-100 px-2 py-1 rounded text-sm font-semibold">
                          id
                        </code>
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Unique identifier for the widget (string)
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-purple-100 px-2 py-1 rounded text-sm font-semibold">
                          title
                        </code>
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Display title for the widget
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-purple-100 px-2 py-1 rounded text-sm font-semibold">
                          type
                        </code>
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Widget type: <code>&quot;bar&quot;</code>,{" "}
                        <code>&quot;line&quot;</code>,{" "}
                        <code>&quot;pie&quot;</code>,{" "}
                        <code>&quot;doughnut&quot;</code>,{" "}
                        <code>&quot;kpi&quot;</code>,{" "}
                        <code>&quot;table&quot;</code>,{" "}
                        <code>&quot;gauge&quot;</code>
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-purple-100 px-2 py-1 rounded text-sm font-semibold">
                          position
                        </code>
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Widget position:{" "}
                        <code>{`{ x: 0, y: 0, w: 6, h: 4 }`}</code>
                      </p>
                      <div className="ml-4 mt-2 text-xs text-gray-600 space-y-1">
                        <div>
                          • <code>x</code>: Column position (0-based)
                        </div>
                        <div>
                          • <code>y</code>: Row position (0-based)
                        </div>
                        <div>
                          • <code>w</code>: Width in grid columns
                        </div>
                        <div>
                          • <code>h</code>: Height in grid rows
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Configuration */}
            <div id="data-config">
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">
                💾 Data Configuration
              </h3>
              <p className="text-gray-600 mb-4">
                Defines how data is fetched and processed for the widget.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-lg">⚠️</span>
                  <div className="text-sm">
                    <p className="font-semibold text-amber-900 mb-1">
                      Important: Aggregation + GROUP BY
                    </p>
                    <p className="text-amber-800">
                      When using{" "}
                      <code className="bg-amber-100 px-1 rounded">groupBy</code>
                      , you MUST specify{" "}
                      <code className="bg-amber-100 px-1 rounded">
                        aggregation
                      </code>{" "}
                      to avoid SQL errors.
                    </p>
                  </div>
                </div>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-green-100 px-2 py-1 rounded text-sm font-semibold">
                          table
                        </code>
                        <Badge variant="outline" className="text-xs">
                          Required*
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Database table or view name
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-green-100 px-2 py-1 rounded text-sm font-semibold">
                          query
                        </code>
                        <Badge variant="outline" className="text-xs">
                          Required*
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Custom SQL query (alternative to table)
                      </p>
                      <p className="text-xs text-gray-500 ml-2 mt-1">
                        *Either <code>table</code> or <code>query</code> is
                        required
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-green-100 px-2 py-1 rounded text-sm font-semibold">
                          xField
                        </code>
                        <Badge variant="secondary" className="text-xs">
                          Optional
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Field for X-axis (categories)
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-green-100 px-2 py-1 rounded text-sm font-semibold">
                          yField
                        </code>
                        <Badge variant="secondary" className="text-xs">
                          Optional
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Field for Y-axis (values)
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-green-100 px-2 py-1 rounded text-sm font-semibold">
                          aggregation
                        </code>
                        <Badge variant="secondary" className="text-xs">
                          Optional
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Aggregation function: <code>&quot;sum&quot;</code>,{" "}
                        <code>&quot;avg&quot;</code>,{" "}
                        <code>&quot;count&quot;</code>,{" "}
                        <code>&quot;min&quot;</code>,{" "}
                        <code>&quot;max&quot;</code>
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-green-100 px-2 py-1 rounded text-sm font-semibold">
                          groupBy
                        </code>
                        <Badge variant="secondary" className="text-xs">
                          Optional
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Array of fields to group by:{" "}
                        <code>{`["field1", "field2"]`}</code>
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-green-100 px-2 py-1 rounded text-sm font-semibold">
                          orderBy
                        </code>
                        <Badge variant="secondary" className="text-xs">
                          Optional
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Sorting configuration:{" "}
                        <code>{`[{ "field": "name", "direction": "ASC" }]`}</code>
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-green-100 px-2 py-1 rounded text-sm font-semibold">
                          limit
                        </code>
                        <Badge variant="secondary" className="text-xs">
                          Optional
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Maximum number of records (omit for no limit)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SQL Generation */}
            <div id="sql-generation">
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">
                🔧 SQL Query Generation
              </h3>
              <p className="text-gray-600 mb-4">
                When using <code>table</code> + <code>aggregation</code> +{" "}
                <code>groupBy</code>, the system automatically generates SQL:
              </p>

              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-sm">SQL Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                    {`SELECT {xField}, {aggregation}({yField}) as {yField}
FROM {table}
GROUP BY {groupBy}
ORDER BY {orderBy}
LIMIT {limit}`}
                  </pre>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-sm">📝 Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
                      {`{
  "table": "sales_data",
  "xField": "productName",
  "yField": "totalSales",
  "aggregation": "sum",
  "groupBy": ["productName"],
  "orderBy": [{
    "field": "totalSales",
    "direction": "DESC"
  }],
  "limit": 10
}`}
                    </pre>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-sm">✅ Generated SQL</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
                      {`SELECT 
  productName,
  SUM(totalSales) as totalSales
FROM sales_data
GROUP BY productName
ORDER BY totalSales DESC
LIMIT 10`}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Style Configuration */}
            <div id="style-config">
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">
                🎨 Style Configuration
              </h3>
              <p className="text-gray-600 mb-4">
                Visual styling options for widgets.
              </p>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-orange-100 px-2 py-1 rounded text-sm font-semibold">
                          color
                        </code>
                        <Badge className="text-xs bg-blue-500">Bar/Line</Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Single hex color: <code>&quot;#3b82f6&quot;</code>
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-orange-100 px-2 py-1 rounded text-sm font-semibold">
                          colors
                        </code>
                        <Badge className="text-xs bg-pink-500">
                          Pie/Doughnut
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Array of hex colors:{" "}
                        <code>{`["#3b82f6", "#8b5cf6", "#ec4899"]`}</code>
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-orange-100 px-2 py-1 rounded text-sm font-semibold">
                          showGrid
                        </code>
                        <Badge variant="secondary" className="text-xs">
                          Boolean
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Show grid lines (default: <code>true</code>)
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-orange-100 px-2 py-1 rounded text-sm font-semibold">
                          showLegend
                        </code>
                        <Badge variant="secondary" className="text-xs">
                          Boolean
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Show legend (default: <code>true</code>)
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-orange-100 px-2 py-1 rounded text-sm font-semibold">
                          prefix
                        </code>
                        <Badge className="text-xs bg-amber-500">KPI</Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Text before value: <code>&quot;฿&quot;</code>,{" "}
                        <code>&quot;$&quot;</code>
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-orange-100 px-2 py-1 rounded text-sm font-semibold">
                          suffix
                        </code>
                        <Badge className="text-xs bg-amber-500">KPI</Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Text after value: <code>&quot; units&quot;</code>,{" "}
                        <code>&quot;%&quot;</code>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tooltip Configuration */}
            <div id="tooltip-config">
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">
                💬 Tooltip Configuration
              </h3>
              <p className="text-gray-600 mb-4">
                Customize tooltip display when hovering over chart elements.
              </p>

              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-cyan-100 px-2 py-1 rounded text-sm font-semibold">
                          enabled
                        </code>
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Enable custom tooltip (boolean)
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-cyan-100 px-2 py-1 rounded text-sm font-semibold">
                          format
                        </code>
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-2">
                        Format string with placeholders:{" "}
                        <code>{`"{fieldName}: ฿{value}"`}</code>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-900 mb-2">
                      ✨ Auto-formatting Features:
                    </p>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>
                        • <strong>Numbers:</strong> 1234567 → 1,234,567
                      </li>
                      <li>
                        • <strong>Dates:</strong> 2019-04-01T00:00:00.000Z → 1
                        เม.ย. 2019
                      </li>
                      <li>
                        • <strong>Null values:</strong> Handled gracefully
                      </li>
                    </ul>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Example:
                    </p>
                    <pre className="text-xs bg-gray-50 p-3 rounded border">
                      {`"tooltipConfig": {
  "enabled": true,
  "format": "Product: {productName} | Sales: ฿{totalSales}"
}`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Widget Types */}
            <div id="widget-types">
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">
                📊 Widget Types
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span>📊</span> Bar Chart
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <p className="text-gray-600">
                      <strong>Best for:</strong> Comparing categories, rankings
                    </p>
                    <p className="text-gray-600">
                      <strong>Required:</strong> xField, yField
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span>📈</span> Line Chart
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <p className="text-gray-600">
                      <strong>Best for:</strong> Trends over time
                    </p>
                    <p className="text-gray-600">
                      <strong>Required:</strong> xField, yField
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span>🥧</span> Pie/Doughnut Chart
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <p className="text-gray-600">
                      <strong>Best for:</strong> Part-to-whole relationships
                    </p>
                    <p className="text-gray-600">
                      <strong>Required:</strong> xField, yField
                    </p>
                    <p className="text-gray-600">
                      <strong>Tip:</strong> Limit to 5-8 slices
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span>🎯</span> KPI Widget
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <p className="text-gray-600">
                      <strong>Best for:</strong> Single key metrics
                    </p>
                    <p className="text-gray-600">
                      <strong>Required:</strong> yField
                    </p>
                    <p className="text-gray-600">
                      <strong>Features:</strong> Trend indicators, prefix/suffix
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span>📋</span> Table Widget
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <p className="text-gray-600">
                      <strong>Best for:</strong> Detailed data, multiple columns
                    </p>
                    <p className="text-gray-600">
                      <strong>Required:</strong> table or query
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span>🎚️</span> Gauge Widget
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <p className="text-gray-600">
                      <strong>Best for:</strong> Progress, capacity metrics
                    </p>
                    <p className="text-gray-600">
                      <strong>Required:</strong> yField, min, max
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Complete Example */}
            <div id="examples">
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">
                📋 Complete Example
              </h3>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Full Dashboard Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-gray-50 p-4 rounded border overflow-x-auto whitespace-pre">
                    {`{
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
      "title": "Total Revenue",
      "type": "kpi",
      "position": { "x": 6, "y": 0, "w": 3, "h": 2 },
      "dataConfig": {
        "table": "sales_data",
        "yField": "totalSales",
        "aggregation": "sum"
      },
      "styleConfig": {
        "prefix": "฿",
        "suffix": "",
        "color": "#10b981"
      },
      "visible": true
    }
  ],
  "autoRefresh": false,
  "refreshInterval": 0
}`}
                  </pre>
                </CardContent>
              </Card>
            </div>

            {/* Best Practices */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">
                💡 Best Practices
              </h3>
              <div className="space-y-3">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-green-900 mb-1">
                      ✅ DO: Use aggregation with GROUP BY
                    </p>
                    <p className="text-sm text-green-800">
                      Always specify <code>aggregation</code> when using{" "}
                      <code>groupBy</code>
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                      ✅ DO: Limit data for performance
                    </p>
                    <p className="text-sm text-blue-800">
                      Use <code>limit</code> to prevent loading too much data at
                      once
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-purple-900 mb-1">
                      ✅ DO: Order data appropriately
                    </p>
                    <p className="text-sm text-purple-800">
                      Time series: ASC, Rankings: DESC
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-red-900 mb-1">
                      ❌ DON&apos;T: Use too many pie slices
                    </p>
                    <p className="text-sm text-red-800">
                      Limit pie/doughnut charts to 5-8 slices for readability
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Troubleshooting */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">
                🔧 Troubleshooting
              </h3>
              <div className="space-y-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-red-600">
                      ❌ Error: Column not in GROUP BY clause
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p className="text-gray-700">
                      <strong>Problem:</strong> Using fields without aggregation
                      when GROUP BY is present
                    </p>
                    <div className="bg-red-50 p-3 rounded border border-red-200">
                      <p className="font-semibold mb-1">Solution:</p>
                      <pre className="text-xs">
                        {`"dataConfig": {
  "yField": "sales",
  "aggregation": "sum",  ← Add this
  "groupBy": ["category"]
}`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-amber-600">
                      ⚠️ No data available
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p className="text-gray-700">
                      <strong>Check:</strong>
                    </p>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>Table/field names are correct</li>
                      <li>Data exists in database</li>
                      <li>Data source connection is active</li>
                      <li>Query syntax is valid</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            💡 For more details, see:{" "}
            <code className="bg-gray-200 px-2 py-1 rounded text-xs">
              Docs/DASHBOARD_CONFIG_REFERENCE.md
            </code>
          </p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
