"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllTenants,
  createTenant,
  updateTenant,
  deleteTenant,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Tenant {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  status: "active" | "inactive";
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
      setTenants(data);
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
    router.push("/admin/dashboard-builder");
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tenants</h1>
        <p className="text-gray-600 mt-2">
          Manage your organization&apos;s tenants and dashboards
        </p>
      </div>

      {/* Create Button */}
      <div className="mb-6">
        <Button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", description: "" });
            setIsDialogOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Tenant
        </Button>
      </div>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Tenants</CardTitle>
          <CardDescription>
            Select a tenant to view and manage dashboards
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && tenants.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-12">
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
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">
                        {tenant.name}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {tenant.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tenant.status === "active" ? "default" : "outline"
                          }
                        >
                          {tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSelectTenant(tenant.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Open
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(tenant)}
                            disabled={loading}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(tenant.id)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
