"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  getDashboards,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Loader2, Key } from "lucide-react";
import { toast } from "sonner";

interface Tenant {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  status: "active" | "inactive";
  dashboardCount?: number;
}

export default function TenantsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // Load tenants on mount
  useEffect(() => {
    if (user) {
      loadTenants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadTenants = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log("🔵 Loading tenants...");
      const data = await getAllTenants();
      console.log("✅ Tenants loaded:", data);

      // Load dashboard count for each tenant
      const tenantsWithCounts = await Promise.all(
        data.map(async (tenant: Tenant) => {
          try {
            const dashboards = await getDashboards(tenant.id);
            return {
              ...tenant,
              dashboardCount: dashboards.length,
            };
          } catch (err) {
            console.error(
              `Failed to load dashboards for tenant ${tenant.id}:`,
              err
            );
            return {
              ...tenant,
              dashboardCount: 0,
            };
          }
        })
      );

      setTenants(tenantsWithCounts);
    } catch (err) {
      console.error("❌ Error loading tenants:", err);
      toast.error("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      if (!formData.name.trim()) {
        throw new Error("Tenant name is required");
      }

      if (editingId) {
        // Update existing tenant
        const updatedTenant = await updateTenant(editingId, {
          name: formData.name,
          description: formData.description,
        });

        setTenants(
          tenants.map((t) => (t.id === editingId ? updatedTenant : t))
        );
        toast.success("Tenant updated successfully");
      } else {
        // Create new tenant
        const newTenant = await createTenant({
          name: formData.name,
          description: formData.description,
        });

        setTenants([...tenants, newTenant]);
        toast.success("Tenant created successfully");
      }

      setFormData({ name: "", description: "" });
      setEditingId(null);
      setIsDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save tenant");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingId(tenant.id);
    setFormData({
      name: tenant.name,
      description: tenant.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (tenantId: string) => {
    if (!user) return;

    if (
      !window.confirm(
        "Are you sure you want to delete this tenant? This action cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await deleteTenant(tenantId);
      setTenants(tenants.filter((t) => t.id !== tenantId));
      toast.success("Tenant deleted successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete tenant"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTenant = (tenantId: string) => {
    localStorage.setItem("tenantId", tenantId);
    document.cookie = `tenantId=${tenantId}; path=/; max-age=${
      7 * 24 * 60 * 60
    }`;
    router.push(`/tenants/${tenantId}/dashboards`);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-600 mt-2">
            Manage your client organizations and their dashboards
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", description: "" });
            setIsDialogOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add New Tenant
        </Button>
      </div>

      {/* Tenants Grid */}
      {loading && tenants.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : tenants.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">No tenants yet</p>
            <Button
              onClick={() => {
                setEditingId(null);
                setFormData({ name: "", description: "" });
                setIsDialogOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Your First Tenant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((tenant) => (
            <Card
              key={tenant.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleSelectTenant(tenant.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-1">
                      {tenant.name}
                    </CardTitle>
                    <p className="text-sm text-gray-500">@{tenant.id}</p>
                  </div>
                  <Badge
                    variant={tenant.status === "active" ? "default" : "outline"}
                  >
                    {tenant.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(tenant.description && (
                    <p className="text-sm text-gray-600">
                      {tenant.description}
                    </p>
                  )) || (
                    <p className="text-sm text-gray-500">
                      No description provided
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                      {tenant.dashboardCount === 0
                        ? "0 dashboards"
                        : tenant.dashboardCount === 1
                        ? "1 dashboard"
                        : `${tenant.dashboardCount} dashboards`}
                    </span>
                    <span>
                      Created {new Date(tenant.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardContent className="pt-0 border-t">
                <div className="flex items-center justify-end gap-2 pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/tenants/${tenant.id}/api-keys`);
                    }}
                    disabled={loading}
                  >
                    <Key className="h-4 w-4 mr-1" />
                    API Keys
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(tenant);
                    }}
                    disabled={loading}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(tenant.id);
                    }}
                    disabled={loading}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Tenant" : "Create New Tenant"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateOrUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tenant Name</Label>
              <Input
                id="name"
                placeholder="e.g., Company A"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingId ? (
                  "Update Tenant"
                ) : (
                  "Create Tenant"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
