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
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
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

const API_BASE = "/api/invite-codes";

// --- Create/Edit Invite Code Modal ---
const CreateCodeModal = ({
  token,
  open,
  onOpenChange,
  onCreated,
}: {
  token: string;
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

  useEffect(() => {
    if (open) {
      // Reset form on open
      setTenantId("");
      setTenantName("");
      setRole("viewer");
      setMaxUses("");
      setExpiresAt("");
      setIsNewTenant(false);

      // Fetch tenants
      const fetchTenants = async () => {
        setLoadingTenants(true);
        try {
          const response = await fetch("/api/tenants", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            setTenants(await response.json());
          }
        } catch (error) {
          console.error("Failed to fetch tenants:", error);
          toast.error("Could not fetch tenants");
        } finally {
          setLoadingTenants(false);
        }
      };
      fetchTenants();
    }
  }, [open, token]);

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

    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to create invite code");
      }
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Invite Code</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tenant</Label>
            {loadingTenants ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <Select
                onValueChange={handleTenantSelect}
                value={isNewTenant ? "__new__" : tenantId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.id})
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__">Create New Tenant</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {isNewTenant && (
            <div className="space-y-2 border-l-2 border-blue-500 pl-4 py-2">
              <h3 className="text-sm font-semibold">New Tenant Details</h3>
              <div>
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
              <div>
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
                <p className="text-xs text-gray-500 mt-1">
                  Lowercase, numbers, and underscores only.
                </p>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
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
          <div>
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Code</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// --- Invite Codes Page ---
const InviteCodesClientPage = ({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) => {
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
      const response = await fetch(API_BASE, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch invite codes.");
      const data: InviteCode[] = await response.json();
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
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchCodes();
    }
  }, [token, fetchCodes]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copied to clipboard", { description: code });
  };

  const handleRevoke = async (code: string) => {
    if (!confirm(`Are you sure you want to revoke code ${code}?`)) return;
    try {
      const response = await fetch(`${API_BASE}/${code}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to revoke.");
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
      const response = await fetch(`${API_BASE}/${code}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete.");
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
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8">
      <Toaster position="top-right" />
      <CreateCodeModal
        token={token}
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
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
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
    </div>
  );
};

// --- Login Page (re-used logic) ---
const LoginPage = ({ onLogin }: { onLogin: (token: string) => void }) => {
  // This is a simplified login form for this page.
  // In a real app, this would be a shared component.
  const [token, setToken] = useState("");
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Admin Authentication</CardTitle>
          <CardDescription>
            Enter your token to manage Invite Codes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            placeholder="Paste your token..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={() => onLogin(token)}>
            Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

// --- Main App Component (Handles Auth State) ---
export default function AdminInviteCodesPage() {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("adminAuthToken");
    }
    return null;
  });

  const handleLogin = (newToken: string) => {
    sessionStorage.setItem("adminAuthToken", newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuthToken");
    setToken(null);
  };

  if (!token) return <LoginPage onLogin={handleLogin} />;

  return <InviteCodesClientPage token={token} onLogout={handleLogout} />;
}
