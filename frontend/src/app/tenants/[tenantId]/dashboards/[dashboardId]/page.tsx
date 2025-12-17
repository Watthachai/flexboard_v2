"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Save,
  Eye,
  History,
  Settings,
  Plus,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  getDashboardById,
  getDashboardVersions,
  getDashboardVersion,
  getDataSources,
  updateDashboard,
  activateDashboardVersion,
  executeDataSourceQuery,
} from "@/lib/api";
import { Dashboard, DashboardVersion, DataSource } from "@/types/dashboard";
import { toast } from "sonner";

// Import new components
import { DesignTab } from "./components/DesignTab";
import { VersionsTab } from "./components/VersionsTab";
import { SettingsTab } from "./components/SettingsTab";
import { DataSourceDialog } from "./components/DataSourceDialog";
import { DocumentationTab } from "./components/DocumentationTab";
import WidgetRenderer from "@/components/widgets/WidgetRenderer";
import GlobalFilters, {
  GlobalFilter,
  GlobalFilterValues,
} from "@/components/dashboard/GlobalFilters";

export default function DashboardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const dashboardId = params.dashboardId as string;

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [versions, setVersions] = useState<DashboardVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("design");
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  // Preview states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Global Filter states for Preview
  const [globalFilterValues, setGlobalFilterValues] =
    useState<GlobalFilterValues>({});
  const [dynamicFilterOptions, setDynamicFilterOptions] = useState<{
    [field: string]: string[];
  }>({});

  // Version tracking states
  const [isViewingCurrent, setIsViewingCurrent] = useState(true);
  const [viewingVersion, setViewingVersion] = useState<string>("");

  // Data Source states
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>("");
  const [createDataSourceOpen, setCreateDataSourceOpen] = useState(false);
  const [editDataSourceId, setEditDataSourceId] = useState<string>("");

  const handleVersionChange = (data: {
    selectedVersion: string;
    currentVersion: string;
    isViewingCurrent: boolean;
  }) => {
    setIsViewingCurrent(data.isViewingCurrent);
    setViewingVersion(data.selectedVersion);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardId, tenantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboardData, dataSourcesList] = await Promise.all([
        getDashboardById(tenantId, dashboardId),
        getDataSources(tenantId),
      ]);

      setDashboard(dashboardData);
      setDataSources(dataSourcesList);

      if (dashboardData.dataSourceId) {
        setSelectedDataSourceId(dashboardData.dataSourceId);
      }

      const versionsData = await getDashboardVersions(tenantId, dashboardId);
      setVersions(versionsData);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error(error.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDataSource = () => {
    setEditDataSourceId("");
    setCreateDataSourceOpen(true);
  };

  const handleEditDataSource = () => {
    if (!selectedDataSourceId) {
      toast.error("Please select a data source first");
      return;
    }
    setEditDataSourceId(selectedDataSourceId);
    setCreateDataSourceOpen(true);
  };

  const handleSaveDataSource = async () => {
    if (!selectedDataSourceId) {
      toast.error("Please select a data source first");
      return;
    }

    try {
      await updateDashboard(tenantId, dashboardId, {
        dataSourceId: selectedDataSourceId,
      });

      toast.success("Data source linked to dashboard!");
      await loadData();
    } catch (error: any) {
      console.error("Error updating dashboard:", error);
      toast.error(error.message || "Failed to update dashboard");
    }
  };

  const handleDataSourceDialogClose = async () => {
    setCreateDataSourceOpen(false);
    setEditDataSourceId("");

    // Always reload data when dialog closes (table selection might have changed)
    await loadData();
  };

  const handlePublishDashboard = async () => {
    if (!dashboard) return;

    try {
      setIsPublishing(true);
      setShowPublishDialog(false);

      // Determine which version to activate
      // If user is viewing an old version, activate that version AND set it as current
      // Otherwise, activate the current version
      const versionToActivate = isViewingCurrent
        ? dashboard.currentVersion
        : viewingVersion;

      // If activating an old version, update dashboard's currentVersion first
      if (!isViewingCurrent && viewingVersion) {
        await updateDashboard(tenantId, dashboardId, {
          currentVersion: viewingVersion,
        });
      }

      // Activate the selected version
      await activateDashboardVersion(tenantId, dashboardId, versionToActivate);

      // Update dashboard status to active
      await updateDashboard(tenantId, dashboardId, {
        status: "active",
      });

      toast.success(
        `Dashboard published! Version ${versionToActivate} is now active.`
      );

      // Reload dashboard data
      await loadData();
    } catch (error: any) {
      console.error("Error publishing dashboard:", error);
      toast.error(error.message || "Failed to publish dashboard");
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePreviewClick = async () => {
    // Determine which version to preview
    const versionToPreview = isViewingCurrent
      ? dashboard?.currentVersion
      : viewingVersion;

    if (!versionToPreview) {
      toast.error("No version available to preview");
      return;
    }

    try {
      setLoadingPreview(true);
      setPreviewOpen(true);

      // Find the version ID from versions list
      const versionData = versions.find(
        (v) => v.versionNumber === versionToPreview
      );

      if (!versionData) {
        toast.error("Version not found");
        setPreviewOpen(false);
        return;
      }

      // Fetch the full version data including config
      const versionWithConfig = await getDashboardVersion(
        tenantId,
        dashboardId,
        versionData.id
      );

      setPreviewConfig(versionWithConfig.config);

      // Initialize global filter values with defaultValues from config
      const config = versionWithConfig.config;
      const defaultFilterValues: GlobalFilterValues = {};
      if (config?.filters) {
        config.filters.forEach((filter: GlobalFilter) => {
          if (filter.defaultValue !== undefined) {
            defaultFilterValues[filter.id] = filter.defaultValue;
          }
        });
      }
      setGlobalFilterValues(defaultFilterValues);

      // Fetch dynamic options for filters if needed
      if (config?.filters && dashboard?.dataSourceId) {
        const dynamicFilters = config.filters.filter(
          (f: any) => f.options === "dynamic"
        );

        if (dynamicFilters.length > 0) {
          try {
            const optionsPromises = dynamicFilters.map(async (filter: any) => {
              // Fetch unique values for each dynamic filter field
              const query = `SELECT DISTINCT ${filter.field} FROM ${
                config.widgets?.[0]?.dataConfig?.table || "mock"
              } WHERE ${filter.field} IS NOT NULL ORDER BY ${filter.field}`;

              const result = await executeDataSourceQuery(
                tenantId,
                dashboard.dataSourceId!,
                query,
                1000
              );

              const values = (result.data || result || [])
                .map((row: any) => row[filter.field])
                .filter((v: any) => v != null);

              return { field: filter.field, values };
            });

            const results = await Promise.all(optionsPromises);
            const newOptions: { [field: string]: string[] } = {};
            results.forEach(({ field, values }) => {
              newOptions[field] = values;
            });
            setDynamicFilterOptions(newOptions);
          } catch (err) {
            console.error("Error fetching dynamic filter options:", err);
          }
        }
      }
    } catch (error: any) {
      console.error("Error loading preview:", error);
      toast.error(error.message || "Failed to load preview");
      setPreviewOpen(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleBack = () => {
    router.push(`/tenants/${tenantId}/dashboards`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 py-6">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="w-full px-4 py-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600">Dashboard not found</p>
            <Button onClick={handleBack} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboards
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {dashboard.name}
              </h1>
              <Badge className={getStatusColor(dashboard.status)}>
                {dashboard.status}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">
              {dashboard.description || "No description"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePreviewClick}
            disabled={loadingPreview}
          >
            {loadingPreview ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            Preview
          </Button>
          {(() => {
            // Check if current version is active
            const currentVersionData = versions.find(
              (v) => v.versionNumber === dashboard.currentVersion
            );
            const isCurrentVersionActive =
              currentVersionData?.isActive || false;

            // Check if user is viewing an old version (not currentVersion)
            const isViewingOldVersion = !isViewingCurrent;

            // Show publish button if:
            // 1. Dashboard is draft, OR
            // 2. Current version is not active yet, OR
            // 3. User is viewing an old version (different from currentVersion)
            const shouldShowPublish =
              dashboard.status === "draft" ||
              !isCurrentVersionActive ||
              isViewingOldVersion;

            if (shouldShowPublish) {
              // Show different button text based on viewing state
              let buttonText = "Publish Dashboard";

              if (isViewingOldVersion && viewingVersion) {
                buttonText = `Set v${viewingVersion} as Current & Publish`;
              } else if (!isCurrentVersionActive) {
                buttonText = `Publish v${dashboard.currentVersion}`;
              }

              return (
                <Button
                  onClick={() => setShowPublishDialog(true)}
                  disabled={isPublishing}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isPublishing ? "Publishing..." : buttonText}
                </Button>
              );
            } else {
              return (
                <Button variant="outline" disabled>
                  <Save className="mr-2 h-4 w-4" />
                  Published
                </Button>
              );
            }
          })()}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Data Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {dashboard.dataSource?.name || "Not configured"}
            </p>
            {dashboard.dataSource && (
              <p className="text-sm text-gray-500 mt-1">
                {dashboard.dataSource.type.toUpperCase()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Current Version
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold">
                {dashboard.currentVersion}
              </p>
              {(() => {
                // Find active version
                const activeVersion = versions.find((v) => v.isActive);
                const currentVersionData = versions.find(
                  (v) => v.versionNumber === dashboard.currentVersion
                );

                // Check if current is NOT active
                if (
                  activeVersion &&
                  currentVersionData &&
                  activeVersion.versionNumber !== dashboard.currentVersion
                ) {
                  return (
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 text-yellow-700 border-yellow-200"
                    >
                      Not Active
                    </Badge>
                  );
                }

                // Check if there are newer versions than active
                if (activeVersion && versions.length > 0) {
                  const activeIndex = versions.findIndex(
                    (v) => v.versionNumber === activeVersion.versionNumber
                  );
                  const newerVersionsCount = activeIndex; // versions are sorted newest first

                  if (newerVersionsCount > 0) {
                    return (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        +{newerVersionsCount} newer
                      </Badge>
                    );
                  }
                }

                return null;
              })()}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {versions.length} total versions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Last Updated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {new Date(dashboard.updatedAt).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(dashboard.updatedAt).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="design">
            <Plus className="mr-2 h-4 w-4" />
            Design
          </TabsTrigger>
          <TabsTrigger value="versions">
            <History className="mr-2 h-4 w-4" />
            Versions
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="docs">
            <BookOpen className="mr-2 h-4 w-4" />
            Docs
          </TabsTrigger>
        </TabsList>

        {/* Design Tab */}
        <div className={`mt-6 ${activeTab !== "design" ? "hidden" : ""}`}>
          <DesignTab
            dashboard={dashboard}
            tenantId={tenantId}
            dashboardId={dashboardId}
            onUpdate={loadData}
            onVersionChange={handleVersionChange}
            onSwitchToSettings={() => setActiveTab("settings")}
          />
        </div>

        {/* Versions Tab */}
        <div className={`mt-6 ${activeTab !== "versions" ? "hidden" : ""}`}>
          <VersionsTab versions={versions} />
        </div>

        {/* Settings Tab */}
        <div className={`mt-6 ${activeTab !== "settings" ? "hidden" : ""}`}>
          <SettingsTab
            dashboard={dashboard}
            dataSources={dataSources}
            selectedDataSourceId={selectedDataSourceId}
            setSelectedDataSourceId={setSelectedDataSourceId}
            onCreateDataSource={handleCreateDataSource}
            onEditDataSource={handleEditDataSource}
            onSaveDataSource={handleSaveDataSource}
          />
        </div>

        {/* Documentation Tab */}
        <div className={`mt-6 ${activeTab !== "docs" ? "hidden" : ""}`}>
          <DocumentationTab />
        </div>
      </Tabs>

      {/* Data Source Dialog */}
      <Dialog
        open={createDataSourceOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleDataSourceDialogClose();
          }
        }}
      >
        <DialogContent className="max-w-full w-full h-full max-h-full p-0 gap-0 lg:max-w-[95vw] lg:w-[95vw] lg:max-h-[95vh] lg:p-6 overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0 p-6 pb-4 lg:p-0 lg:pb-0">
            <DialogTitle className="text-2xl lg:text-3xl font-bold">
              {editDataSourceId ? "Edit Data Source" : "Create Data Source"}
            </DialogTitle>
            <DialogDescription className="text-base lg:text-lg">
              {editDataSourceId
                ? "Update your database connection settings"
                : "Configure a new database connection for your dashboard"}
            </DialogDescription>
          </DialogHeader>

          <DataSourceDialog
            tenantId={tenantId}
            dashboardId={dashboardId}
            editDataSourceId={editDataSourceId}
            onClose={handleDataSourceDialogClose}
          />
        </DialogContent>
      </Dialog>

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isViewingCurrent
                ? "Publish Dashboard?"
                : `Set v${viewingVersion} as Current & Publish?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will:
              <br />
              <br />
              {!isViewingCurrent && (
                <>
                  1. Set version <strong>{viewingVersion}</strong> as the
                  current version
                  <br />
                  2. Activate version <strong>{viewingVersion}</strong>
                  <br />
                  3. Change dashboard status to <strong>active</strong>
                  <br />
                  4. Make it available for production use
                </>
              )}
              {isViewingCurrent && (
                <>
                  1. Activate version{" "}
                  <strong>{dashboard?.currentVersion}</strong>
                  <br />
                  2. Change dashboard status from <strong>draft</strong> to{" "}
                  <strong>active</strong>
                  <br />
                  3. Make it available for production use
                </>
              )}
              <br />
              <br />
              Are you sure you want to publish?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublishDashboard}>
              {isViewingCurrent
                ? "Publish Dashboard"
                : `Publish v${viewingVersion}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-full w-full h-full max-h-full p-0 gap-0 lg:max-w-[95vw] lg:w-[95vw] lg:max-h-[95vh] lg:p-6 overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0 p-6 pb-4 lg:p-0 lg:pb-4">
            <DialogTitle className="flex items-center gap-2 text-2xl lg:text-3xl font-bold">
              <Eye className="h-6 w-6" />
              Dashboard Preview
              {(() => {
                const versionToShow = isViewingCurrent
                  ? dashboard?.currentVersion
                  : viewingVersion;
                return (
                  <Badge
                    variant="outline"
                    className="ml-2 text-base font-normal"
                  >
                    v{versionToShow}
                  </Badge>
                );
              })()}
            </DialogTitle>
            <DialogDescription className="text-base lg:text-lg">
              {isViewingCurrent
                ? "Preview your dashboard with live data (Current Version)"
                : `Preview of version ${viewingVersion} (Not Current)`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-6 lg:p-0 bg-gray-50">
            {loadingPreview ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : !previewConfig ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-gray-600 font-medium mb-2">
                    No configuration available
                  </p>
                  <p className="text-sm text-gray-400">
                    Current version: {dashboard?.currentVersion || "N/A"}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {/* Global Filters */}
                {previewConfig.filters && previewConfig.filters.length > 0 && (
                  <GlobalFilters
                    filters={previewConfig.filters as GlobalFilter[]}
                    values={globalFilterValues}
                    onChange={setGlobalFilterValues}
                    dynamicOptions={dynamicFilterOptions}
                    onReset={() => {
                      // Reset to default values instead of empty
                      const defaultValues: GlobalFilterValues = {};
                      (previewConfig.filters as GlobalFilter[]).forEach(
                        (filter) => {
                          if (filter.defaultValue !== undefined) {
                            defaultValues[filter.id] = filter.defaultValue;
                          }
                        }
                      );
                      setGlobalFilterValues(defaultValues);
                    }}
                  />
                )}

                {/* Widgets Grid */}
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${
                      previewConfig.gridCols || 12
                    }, 1fr)`,
                    gridAutoRows: `${previewConfig.gridRowHeight || 100}px`,
                  }}
                >
                  {previewConfig.widgets
                    ?.filter((widget: any) => widget.visible !== false)
                    .map((widget: any) => {
                      // Convert globalFilterValues to filter conditions
                      const filterConditions = (
                        previewConfig.filters || []
                      ).flatMap((filter: GlobalFilter) => {
                        const value = globalFilterValues[filter.id];
                        if (
                          value === undefined ||
                          value === null ||
                          value === "" ||
                          value === "__ALL__"
                        ) {
                          return [];
                        }

                        if (filter.type === "dateRange") {
                          const conditions = [];
                          if (value.start) {
                            conditions.push({
                              field: filter.field,
                              operator: ">=",
                              value: value.start,
                            });
                          }
                          if (value.end) {
                            conditions.push({
                              field: filter.field,
                              operator: "<=",
                              value: value.end,
                            });
                          }
                          return conditions;
                        }

                        if (filter.type === "multiSelect") {
                          if (Array.isArray(value) && value.length > 0) {
                            return [
                              {
                                field: filter.field,
                                operator: "IN",
                                value: value,
                              },
                            ];
                          }
                          return [];
                        }

                        if (filter.type === "text") {
                          return [
                            {
                              field: filter.field,
                              operator: "LIKE",
                              value: value,
                            },
                          ];
                        }

                        return [
                          {
                            field: filter.field,
                            operator: "=",
                            value: value,
                          },
                        ];
                      });

                      return (
                        <div
                          key={widget.id}
                          className="min-h-[200px]"
                          style={{
                            gridColumn: `span ${widget.position?.w || 4}`,
                            gridRow: `span ${widget.position?.h || 4}`,
                          }}
                        >
                          <WidgetRenderer
                            widget={widget}
                            tenantId={tenantId}
                            dataSourceId={dashboard?.dataSourceId || ""}
                            globalFilters={filterConditions}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
