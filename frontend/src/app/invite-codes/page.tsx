"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, Copy, Ban, Trash2 } from "lucide-react";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  getAllInviteCodes,
  createInviteCode,
  revokeInviteCode,
  deleteInviteCode,
  getAllTenants,
} from "@/lib/api";

// --- Type Definitions ---
type InviteCode = {
  code: string;
  tenantId: string;
  tenantName: string;
  role: string;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  allowedDomains?: string[] | null;
};

type Tenant = {
  id: string;
  name: string;
};

type Statistics = {
  total: number;
  active: number;
  revoked: number;
  expired: number;
};

// --- Create/Edit Invite Code Modal ---
const CreateCodeModal = ({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [isNewTenant, setIsNewTenant] = useState(false);

  const [tenantId, setTenantId] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [role, setRole] = useState("viewer");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [allowedDomains, setAllowedDomains] = useState("");

  // 🆕 Preview extracted domains
  const extractedDomains = allowedDomains
    .split(/[,\n]/)
    .map((item) => {
      const trimmed = item.trim();
      if (trimmed.includes("@")) {
        const parts = trimmed.split("@");
        return parts[1] || "";
      }
      return trimmed;
    })
    .filter((d) => d.length > 0);

  useEffect(() => {
    if (open) {
      // Reset form on open
      setTenantId("");
      setTenantName("");
      setRole("viewer");
      setMaxUses("");
      setExpiresAt("");
      setAllowedDomains("");
      setIsNewTenant(false);

      // Fetch tenants
      const fetchTenants = async () => {
        setLoadingTenants(true);
        try {
          const data = await getAllTenants();
          setTenants(data);
        } catch (error) {
          console.error("Failed to fetch tenants:", error);
          toast.error("Could not fetch tenants");
        } finally {
          setLoadingTenants(false);
        }
      };
      fetchTenants();
    }
  }, [open]);

  const handleTenantSelect = (value: string) => {
    if (value === "__new__") {
      setIsNewTenant(true);
      setTenantId("");
      setTenantName("");
    } else {
      setIsNewTenant(false);
      const selected = tenants.find((t) => t.id === value);
      setTenantId(selected?.id || "");
      setTenantName(selected?.name || "");
    }
  };

  const handleTenantNameInput = (name: string) => {
    setTenantName(name);
    if (isNewTenant) {
      const autoId = name
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
      setTenantId(autoId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      tenantId,
      tenantName,
      role,
    };
    if (maxUses) payload.maxUses = parseInt(maxUses, 10);
    if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString();
    if (allowedDomains) {
      // แยก domains ด้วย comma หรือ newline และ auto-extract domain จาก email
      const domains = allowedDomains
        .split(/[,\n]/)
        .map((item) => {
          const trimmed = item.trim();
          // ถ้ามี @ แสดงว่าเป็น email เต็ม -> เอาแค่ domain
          if (trimmed.includes("@")) {
            const parts = trimmed.split("@");
            return parts[1] || "";
          }
          // ถ้าไม่มี @ แสดงว่าเป็น domain อยู่แล้ว
          return trimmed;
        })
        .filter((d) => d.length > 0);

      if (domains.length > 0) {
        payload.allowedDomains = domains;
      }
    }

    try {
      const result = await createInviteCode(payload);
      toast.success("Invite Code Created", {
        description: `Code: ${result.code}`,
      });
      onCreated(); // Close modal and refresh table
    } catch (err: any) {
      toast.error("Creation Failed", { description: err.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Invite Code</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-select">
              Tenant <span className="text-red-500">*</span>
            </Label>
            {loadingTenants ? (
              <p className="text-sm text-muted-foreground">
                Loading tenants...
              </p>
            ) : tenants.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  No tenants available. You need to create a tenant first.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    onOpenChange(false);
                    window.location.href = "/tenants";
                  }}
                >
                  Go to Tenants Page
                </Button>
              </div>
            ) : (
              <Select
                onValueChange={handleTenantSelect}
                value={isNewTenant ? "__new__" : tenantId}
              >
                <SelectTrigger id="tenant-select">
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">+ Create New Tenant</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {isNewTenant && (
            <div className="space-y-3 rounded-md border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-blue-900">
                New Tenant Details
              </h3>
              <div className="space-y-2">
                <Label htmlFor="tenant-name">Tenant Name</Label>
                <Input
                  id="tenant-name"
                  value={tenantName}
                  onInput={(e) =>
                    handleTenantNameInput((e.target as HTMLInputElement).value)
                  }
                  placeholder="e.g. Acme Inc"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-id">Tenant ID</Label>
                <Input
                  id="tenant-id"
                  value={tenantId}
                  onInput={(e) =>
                    setTenantId((e.target as HTMLInputElement).value)
                  }
                  placeholder="auto-generated"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase, numbers, and underscores only.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">
              Role <span className="text-red-500">*</span>
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin - Full access</SelectItem>
                <SelectItem value="sales">Sales - Manage customers</SelectItem>
                <SelectItem value="viewer">Viewer - Read only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-uses">Max Uses (Optional)</Label>
            <Input
              id="max-uses"
              type="number"
              min="1"
              value={maxUses}
              onInput={(e) => setMaxUses((e.target as HTMLInputElement).value)}
              placeholder="Leave empty for unlimited"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires-at">Expires At (Optional)</Label>
            <Input
              id="expires-at"
              type="datetime-local"
              value={expiresAt}
              onInput={(e) =>
                setExpiresAt((e.target as HTMLInputElement).value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allowed-domains">Allowed Domains (Optional)</Label>
            <Input
              id="allowed-domains"
              type="text"
              value={allowedDomains}
              onInput={(e) =>
                setAllowedDomains((e.target as HTMLInputElement).value)
              }
              placeholder="e.g. xxx@company.com, user@example.co.th หรือ company.com, example.co.th"
            />
            <p className="text-xs text-muted-foreground">
              💡 <strong>ใส่ได้ 2 แบบ:</strong>
              <br />
              1. <strong>Email เต็ม:</strong> xxx@digitalvalue.co.th,
              abc@pvs.co.th → ระบบจะ auto สกัดเป็น digitalvalue.co.th, pvs.co.th
              <br />
              2. <strong>Domain เฉย:</strong> digitalvalue.co.th, pvs.co.th →
              ใช้ได้เลย
              <br />
              <span className="text-yellow-600">
                ⚠️ หากไม่ระบุ = อนุญาตทุก email domain
              </span>
            </p>

            {/* 🆕 Preview Section */}
            {extractedDomains.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs font-semibold text-blue-900 mb-2">
                  🔍 Preview - จะอนุญาติ domain ดังต่อไปนี้:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {extractedDomains.map((domain, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="bg-blue-100 text-blue-700 border-blue-300"
                    >
                      @{domain}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Code
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// --- Invite Codes Page ---
const InviteCodesClientPage = ({ onLogout }: { onLogout: () => void }) => {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [stats, setStats] = useState<Statistics>({
    total: 0,
    active: 0,
    revoked: 0,
    expired: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const data: InviteCode[] = await getAllInviteCodes();
      setCodes(data);

      const now = new Date();
      const newStats: Statistics = {
        total: data.length,
        active: 0,
        revoked: 0,
        expired: 0,
      };
      data.forEach((code) => {
        if (!code.isActive) newStats.revoked++;
        else if (code.expiresAt && new Date(code.expiresAt) < now)
          newStats.expired++;
        else newStats.active++;
      });
      setStats(newStats);
    } catch (error: any) {
      toast.error("Fetch Error", { description: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copied to clipboard", { description: code });
  };

  const handleRevoke = async (code: string) => {
    if (!confirm(`Are you sure you want to revoke code ${code}?`)) return;
    try {
      await revokeInviteCode(code);
      toast.success("Code Revoked", { description: code });
      fetchCodes();
    } catch (err: any) {
      toast.error("Revoke Failed", { description: err.message });
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to permanently delete code ${code}?`))
      return;
    try {
      await deleteInviteCode(code);
      toast.success("Code Deleted", { description: code });
      fetchCodes();
    } catch (err: any) {
      toast.error("Delete Failed", { description: err.message });
    }
  };

  const getStatusBadge = (code: InviteCode) => {
    if (!code.isActive) return <Badge variant="destructive">Revoked</Badge>;
    if (code.expiresAt && new Date(code.expiresAt) < new Date())
      return <Badge variant="secondary">Expired</Badge>;
    return <Badge className="bg-green-600">Active</Badge>;
  };

  return (
    <>
      <Toaster position="top-right" />
      <CreateCodeModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onCreated={() => {
          setIsModalOpen(false);
          fetchCodes();
        }}
      />

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Invite Code Management
          </h1>
          <p className="text-md text-gray-600 mt-1">
            Create and manage access for new users.
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/admin/users")}
          >
            User Management
          </Button>
          <Button onClick={onLogout}>Logout</Button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revoked</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{stats.revoked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {stats.expired}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Invite Codes</CardTitle>
          <Button onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Code
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Allowed Domains</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No codes found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    codes.map((code) => (
                      <TableRow key={code.code}>
                        <TableCell>
                          <code className="font-mono">{code.code}</code>
                        </TableCell>
                        <TableCell>
                          {code.tenantName}{" "}
                          <span className="text-gray-500">
                            ({code.tenantId})
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{code.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {code.usedCount} / {code.maxUses || "∞"}
                        </TableCell>
                        <TableCell>
                          {code.allowedDomains &&
                          code.allowedDomains.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {code.allowedDomains.map((domain, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  @{domain}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              All domains
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(code)}</TableCell>
                        <TableCell>
                          {code.expiresAt
                            ? new Date(code.expiresAt).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopy(code.code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {code.isActive && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRevoke(code.code)}
                            >
                              <Ban className="h-4 w-4 text-yellow-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(code.code)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

// --- Main App Component (Handles Auth State) ---
export default function AdminInviteCodesPage() {
  const router = useRouter();
  const { user, loading, isAdmin, logout } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/");
    }
  }, [user, loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-red-600">Access denied</p>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return <InviteCodesClientPage onLogout={handleLogout} />;
}
