"use client";

import { useState } from "react";
import { saveTenantConfig } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

interface Widget {
  id: string;
  title: string;
  type: "card" | "chart" | "table";
  size?: {
    width: number;
    height: number;
  };
  config?: Record<string, any>;
}

interface Dashboard {
  id: string;
  title: string;
  description?: string;
  layout: "grid" | "flex";
  gridColumns?: number;
  widgets: Widget[];
}

export default function DashboardBuilderPage() {
  const [tenantId, setTenantId] = useState("");
  const [dashboardName, setDashboardName] = useState("");
  const [dashboardDescription, setDashboardDescription] = useState("");
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(
    null
  );
  const [newWidgetTitle, setNewWidgetTitle] = useState("");
  const [newWidgetType, setNewWidgetType] = useState<
    "card" | "chart" | "table"
  >("card");
  const [loading, setLoading] = useState(false);

  // Create new dashboard
  const handleCreateDashboard = () => {
    if (!dashboardName.trim()) {
      toast.error("Dashboard name is required");
      return;
    }

    const newDashboard: Dashboard = {
      id: `dashboard-${Date.now()}`,
      title: dashboardName,
      description: dashboardDescription,
      layout: "grid",
      gridColumns: 3,
      widgets: [],
    };

    setDashboards([...dashboards, newDashboard]);
    setCurrentDashboard(newDashboard);
    setDashboardName("");
    setDashboardDescription("");
    toast.success("Dashboard created");
  };

  // Add widget to current dashboard
  const handleAddWidget = () => {
    if (!currentDashboard) {
      toast.error("Select a dashboard first");
      return;
    }

    if (!newWidgetTitle.trim()) {
      toast.error("Widget title is required");
      return;
    }

    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      title: newWidgetTitle,
      type: newWidgetType,
      size: { width: 1, height: 1 },
      config: {},
    };

    const updated = {
      ...currentDashboard,
      widgets: [...currentDashboard.widgets, newWidget],
    };

    setCurrentDashboard(updated);
    setDashboards(dashboards.map((d) => (d.id === updated.id ? updated : d)));
    setNewWidgetTitle("");
    toast.success("Widget added");
  };

  // Remove widget
  const handleRemoveWidget = (widgetId: string) => {
    if (!currentDashboard) return;

    const updated = {
      ...currentDashboard,
      widgets: currentDashboard.widgets.filter((w) => w.id !== widgetId),
    };

    setCurrentDashboard(updated);
    setDashboards(dashboards.map((d) => (d.id === updated.id ? updated : d)));
    toast.success("Widget removed");
  };

  // Save configuration
  const handleSaveConfig = async () => {
    if (!tenantId.trim()) {
      toast.error("Tenant ID is required");
      return;
    }

    setLoading(true);
    try {
      const config = {
        tenantId,
        name: tenantId,
        dashboards,
      };

      await saveTenantConfig(tenantId, config);
      toast.success("Configuration saved successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Dashboard Builder
          </h1>
          <p className="text-gray-600">
            Design dashboards for your tenants. Configure widgets and layouts.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tenant ID */}
                <div>
                  <Label htmlFor="tenantId">Tenant ID</Label>
                  <Input
                    id="tenantId"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    placeholder="e.g., acme-corp"
                    className="mt-2"
                  />
                </div>

                {/* Create Dashboard */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Create Dashboard</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="dashboardName">Dashboard Name</Label>
                      <Input
                        id="dashboardName"
                        value={dashboardName}
                        onChange={(e) => setDashboardName(e.target.value)}
                        placeholder="e.g., Sales Dashboard"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dashboardDesc">Description</Label>
                      <Input
                        id="dashboardDesc"
                        value={dashboardDescription}
                        onChange={(e) =>
                          setDashboardDescription(e.target.value)
                        }
                        placeholder="Optional description"
                        className="mt-2"
                      />
                    </div>
                    <Button onClick={handleCreateDashboard} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Create
                    </Button>
                  </div>
                </div>

                {/* Dashboards List */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Dashboards</h3>
                  <div className="space-y-2">
                    {dashboards.length === 0 ? (
                      <p className="text-sm text-gray-500">No dashboards yet</p>
                    ) : (
                      dashboards.map((dashboard) => (
                        <button
                          key={dashboard.id}
                          onClick={() => setCurrentDashboard(dashboard)}
                          className={`w-full text-left p-2 rounded border ${
                            currentDashboard?.id === dashboard.id
                              ? "bg-blue-50 border-blue-300"
                              : "bg-white border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <p className="text-sm font-medium">
                            {dashboard.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {dashboard.widgets.length} widgets
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Save */}
                <Button
                  onClick={handleSaveConfig}
                  disabled={loading || dashboards.length === 0}
                  className="w-full"
                  variant="default"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Saving..." : "Save Config"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Editor */}
          <div className="lg:col-span-3">
            {currentDashboard ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{currentDashboard.title}</CardTitle>
                      {currentDashboard.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {currentDashboard.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add Widget Form */}
                  <div className="border-b pb-6">
                    <h3 className="font-semibold mb-4">Add Widget</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="widgetTitle">Widget Title</Label>
                        <Input
                          id="widgetTitle"
                          value={newWidgetTitle}
                          onChange={(e) => setNewWidgetTitle(e.target.value)}
                          placeholder="e.g., Sales Chart"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="widgetType">Type</Label>
                        <select
                          id="widgetType"
                          value={newWidgetType}
                          onChange={(e) =>
                            setNewWidgetType(
                              e.target.value as "card" | "chart" | "table"
                            )
                          }
                          className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg bg-white"
                        >
                          <option value="card">Card</option>
                          <option value="chart">Chart</option>
                          <option value="table">Table</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <Button onClick={handleAddWidget} className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Widgets List */}
                  <div>
                    <h3 className="font-semibold mb-4">
                      Widgets ({currentDashboard.widgets.length})
                    </h3>
                    {currentDashboard.widgets.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                        <p className="text-gray-500">
                          No widgets yet. Add your first widget!
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentDashboard.widgets.map((widget) => (
                          <Card key={widget.id} className="bg-white">
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <p className="font-medium">{widget.title}</p>
                                  <p className="text-sm text-gray-500 capitalize">
                                    {widget.type}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleRemoveWidget(widget.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="text-xs text-gray-400">
                                ID: {widget.id}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-16 text-center pb-16">
                  <p className="text-gray-500 text-lg">
                    Create or select a dashboard to get started
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
