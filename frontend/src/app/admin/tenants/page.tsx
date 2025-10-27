"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, Edit2, Trash2, LogOut, Loader2 } from "lucide-react";
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
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setLoading(true);
    try {
      // TODO: Fetch from API
      // const response = await fetch("/api/tenants");
      // const data = await response.json();
      // setTenants(data);

      // Mock data for now
      const mockTenants: Tenant[] = [
        {
          id: "tenant-1",
          name: "Company A",
          description: "Main company dashboard",
          createdAt: new Date().toISOString(),
          status: "active",
        },
        {
          id: "tenant-2",
          name: "Company B",
          description: "Secondary company",
          createdAt: new Date().toISOString(),
          status: "active",
        },
      ];
      setTenants(mockTenants);
    } catch {
      toast.error("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        throw new Error("Tenant name is required");
      }

      if (editingId) {
        // Update existing tenant
        // TODO: Call API to update tenant
        setTenants(
          tenants.map((t) =>
            t.id === editingId
              ? {
                  ...t,
                  name: formData.name,
                  description: formData.description,
                }
              : t
          )
        );
        toast.success("Tenant updated successfully");
      } else {
        // Create new tenant
        // TODO: Call API to create tenant
        const newTenant: Tenant = {
          id: `tenant-${Date.now()}`,
          name: formData.name,
          description: formData.description,
          createdAt: new Date().toISOString(),
          status: "active",
        };
        setTenants([...tenants, newTenant]);
        toast.success("Tenant created successfully");
      }

      setFormData({ name: "", description: "" });
      setEditingId(null);
      setIsDialogOpen(false);
    } catch {
      toast.error("Failed to save tenant");
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
    if (
      !window.confirm(
        "Are you sure you want to delete this tenant? This action cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      // TODO: Call API to delete tenant
      setTenants(tenants.filter((t) => t.id !== tenantId));
      toast.success("Tenant deleted successfully");
    } catch (err) {
      toast.error("Failed to delete tenant");
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

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("tenantId");
    document.cookie = "tenantId=; path=/; max-age=0";
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tenants</h1>
            <p className="text-gray-600 mt-2">
              Manage your organization&apos;s tenants and dashboards
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
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
      </div>

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
    </div>
  );
}
