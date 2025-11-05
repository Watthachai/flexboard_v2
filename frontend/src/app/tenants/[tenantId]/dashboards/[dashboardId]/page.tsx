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
  ArrowLeft,
  Save,
  Eye,
  History,
  Settings,
  Plus,
  Loader2,
} from "lucide-react";
import {
  getDashboardById,
  getDashboardVersions,
  getDataSources,
  updateDashboard,
} from "@/lib/api";
import { Dashboard, DashboardVersion, DataSource } from "@/types/dashboard";
import { toast } from "sonner";

// Import new components
import { DesignTab } from "./components/DesignTab";
import { VersionsTab } from "./components/VersionsTab";
import { SettingsTab } from "./components/SettingsTab";
import { DataSourceDialog } from "./components/DataSourceDialog";

export default function DashboardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const dashboardId = params.dashboardId as string;

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [versions, setVersions] = useState<DashboardVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("design");

  // Data Source states
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>("");
  const [createDataSourceOpen, setCreateDataSourceOpen] = useState(false);
  const [editDataSourceId, setEditDataSourceId] = useState<string>("");

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

  const handleDataSourceDialogClose = async (saved: boolean) => {
    setCreateDataSourceOpen(false);
    setEditDataSourceId("");

    if (saved) {
      await loadData();
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
          <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
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
            <p className="text-lg font-semibold">{dashboard.currentVersion}</p>
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
        </TabsList>

        {/* Design Tab */}
        <TabsContent value="design" className="mt-6">
          <DesignTab dashboard={dashboard} tenantId={tenantId} />
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="mt-6">
          <VersionsTab versions={versions} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <SettingsTab
            dashboard={dashboard}
            dataSources={dataSources}
            selectedDataSourceId={selectedDataSourceId}
            setSelectedDataSourceId={setSelectedDataSourceId}
            onCreateDataSource={handleCreateDataSource}
            onEditDataSource={handleEditDataSource}
            onSaveDataSource={handleSaveDataSource}
          />
        </TabsContent>
      </Tabs>

      {/* Data Source Dialog */}
      <Dialog
        open={createDataSourceOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleDataSourceDialogClose(false);
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
    </div>
  );
}
