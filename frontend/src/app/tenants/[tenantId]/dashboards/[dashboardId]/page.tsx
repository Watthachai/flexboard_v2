"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  Eye,
  History,
  Settings,
  Plus,
  Loader2,
} from "lucide-react";
import { getDashboardById, getDashboardVersions } from "@/lib/api";
import { Dashboard, DashboardVersion } from "@/types/dashboard";
import { toast } from "sonner";

export default function DashboardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const dashboardId = params.dashboardId as string;

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [versions, setVersions] = useState<DashboardVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("design");

  useEffect(() => {
    loadDashboard();
    loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, dashboardId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await getDashboardById(tenantId, dashboardId);
      setDashboard(data);
    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    try {
      const data = await getDashboardVersions(tenantId, dashboardId);
      setVersions(data);
    } catch (error: any) {
      console.error("Error loading versions:", error);
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
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="container mx-auto p-6">
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
    <div className="container mx-auto p-6">
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
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <Plus className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">
                  Dashboard Designer
                </h3>
                <p className="mb-4">
                  Drag and drop widgets to design your dashboard
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Widget
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No versions found
                </div>
              ) : (
                <div className="space-y-4">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            v{version.versionNumber}
                          </span>
                          {version.isActive && (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {version.changeLog || "No changelog"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Published:{" "}
                          {new Date(version.publishedAt).toLocaleString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Dashboard Name</label>
                  <p className="text-gray-600">{dashboard.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <p className="text-gray-600">
                    {dashboard.category || "None"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tags</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {dashboard.tags && dashboard.tags.length > 0 ? (
                      dashboard.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-gray-600">No tags</p>
                    )}
                  </div>
                </div>
                <Button variant="outline" className="mt-4">
                  Edit Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
