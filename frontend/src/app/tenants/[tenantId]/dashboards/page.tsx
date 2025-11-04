"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Layout,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Archive,
  Database,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDashboards, deleteDashboard } from "@/lib/api";
import { Dashboard } from "@/types/dashboard";
import { CreateDashboardWizard } from "@/components/dashboard-wizard";
import { toast } from "sonner";
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

export default function DashboardBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(
    null
  );

  useEffect(() => {
    // Store tenantId in localStorage
    if (tenantId) {
      localStorage.setItem("tenantId", tenantId);
      document.cookie = `tenantId=${tenantId}; path=/; max-age=${
        7 * 24 * 60 * 60
      }`;
    }
  }, [tenantId]);

  useEffect(() => {
    loadDashboards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const loadDashboards = async () => {
    try {
      setLoading(true);
      const data = await getDashboards(tenantId);
      setDashboards(data);
    } catch (error: any) {
      console.error("Error loading dashboards:", error);
      toast.error("Failed to load dashboards");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDashboard) return;

    try {
      await deleteDashboard(tenantId, selectedDashboard.id);
      toast.success("Dashboard deleted successfully");
      loadDashboards();
      setDeleteDialogOpen(false);
      setSelectedDashboard(null);
    } catch (error: any) {
      console.error("Error deleting dashboard:", error);
      toast.error("Failed to delete dashboard");
    }
  };

  const handleView = (dashboardId: string) => {
    router.push(`/tenants/${tenantId}/dashboards/${dashboardId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Builder
          </h1>
          <p className="text-gray-600 mt-2">
            Tenant: <span className="font-semibold">{tenantId}</span>
          </p>
        </div>
        <Button className="gap-2" onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4" />
          New Dashboard
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        </div>
      )}

      {/* Empty State */}
      {!loading && dashboards.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Layout className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No dashboards yet
            </h3>
            <p className="text-gray-600 mb-4">
              Get started by creating your first dashboard
            </p>
            <Button className="gap-2" onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Grid */}
      {dashboards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map((dashboard) => (
            <Card
              key={dashboard.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">
                      {dashboard.name}
                    </CardTitle>
                    <Badge className={getStatusColor(dashboard.status)}>
                      {dashboard.status}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleView(dashboard.id)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleView(dashboard.id)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          setSelectedDashboard(dashboard);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent onClick={() => handleView(dashboard.id)}>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {dashboard.description || "No description"}
                </p>

                {/* Metadata */}
                <div className="space-y-2 text-sm text-gray-500">
                  {dashboard.dataSource && (
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span>{dashboard.dataSource.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(dashboard.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {dashboard.tags && dashboard.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-4">
                    {dashboard.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dashboard Wizard */}
      <CreateDashboardWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        tenantId={tenantId}
        onSuccess={loadDashboards}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the dashboard{" "}
              <strong>{selectedDashboard?.name}</strong> and all its versions.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
