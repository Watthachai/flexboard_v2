"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MoreHorizontal } from "lucide-react";
import { Toaster, toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  getAllUsers,
  updateUserRole,
  removeUserFromTenant,
  updateUserClaims,
} from "@/lib/api";

// --- Type Definitions ---
type User = {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  tenantId?: string;
  role?: "admin" | "sales" | "viewer" | string; // Allow other roles
  isSuperAdmin?: boolean;
  metadata: {
    lastSignInTime?: string;
    creationTime?: string;
  };
};

type Stats = {
  total: number;
  assigned: number;
  unassigned: number;
  filtered: number;
};

// --- Main User Management Page Component ---
const UserManagementPage = ({ onLogout }: { onLogout: () => void }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterTenant, setFilterTenant] = useState("all");

  const [tenants, setTenants] = useState<string[]>([]);

  // Dialog states
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
  const [isSuperAdminDialogOpen, setIsSuperAdminDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>("");

  // Fetch users and tenants from API
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data: { users: User[] } = await getAllUsers();
      setUsers(data.users);

      const uniqueTenants = [
        ...new Set(
          data.users.map((u) => u.tenantId).filter(Boolean) as string[]
        ),
      ];
      setTenants(uniqueTenants.sort());
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Memoized filtering logic
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchSearch =
        !searchTerm ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTenant =
        filterTenant === "all" ||
        (filterTenant === "none" && !user.tenantId) ||
        user.tenantId === filterTenant;

      return matchSearch && matchTenant;
    });
  }, [users, searchTerm, filterTenant]);

  // Memoized statistics
  const stats: Stats = useMemo(
    () => ({
      total: users.length,
      assigned: users.filter((u) => u.tenantId).length,
      unassigned: users.filter((u) => !u.tenantId).length,
      filtered: filteredUsers.length,
    }),
    [users, filteredUsers]
  );

  // --- Action Handlers ---

  const handleOpenRoleDialog = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role || "viewer");
    setIsRoleDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      await updateUserRole(selectedUser.uid, newRole, selectedUser.tenantId);
      toast.success(`User ${selectedUser.email} role changed to ${newRole}`);
      fetchUsers(); // Refresh list
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleOpenRemoveDialog = (user: User) => {
    setSelectedUser(user);
    setIsRemoveDialogOpen(true);
  };

  const handleRemoveUser = async () => {
    if (!selectedUser) return;

    try {
      await removeUserFromTenant(selectedUser.uid);
      toast.success(`User ${selectedUser.email} removed from tenant`);
      fetchUsers(); // Refresh list
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRemoveDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleOpenActivateDialog = (user: User) => {
    setSelectedUser(user);
    setIsActivateDialogOpen(true);
  };

  const handleActivateAdmin = async () => {
    if (!selectedUser) return;

    try {
      await updateUserClaims(selectedUser.uid, {
        isAdmin: true,
        role: "admin",
      });
      toast.success(`User ${selectedUser.email} activated as Admin`);
      fetchUsers(); // Refresh list
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsActivateDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleOpenSuperAdminDialog = (user: User) => {
    setSelectedUser(user);
    setIsSuperAdminDialogOpen(true);
  };

  const handleToggleSuperAdmin = async () => {
    if (!selectedUser) return;

    try {
      await updateUserClaims(selectedUser.uid, {
        isSuperAdmin: true,
        isAdmin: true,
        role: "admin",
      });
      toast.success(`User ${selectedUser.email} is now a Super Admin`);
      fetchUsers(); // Refresh list
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSuperAdminDialogOpen(false);
      setSelectedUser(null);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              User Management
            </h1>
            <p className="text-md text-gray-600 mt-1">
              Manage users across all tenants.
            </p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/admin/invite-codes")}
            >
              Invite Codes
            </Button>
            <Button variant="destructive" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </header>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assigned Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {stats.assigned}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Unassigned Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">
                {stats.unassigned}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Filtered Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {stats.filtered}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between gap-4">
              {/* Search Input */}
              <div className="w-full md:w-1/2 lg:w-1/3">
                <Input
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onInput={(e) =>
                    setSearchTerm((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              {/* Tenant Filter */}
              <div className="w-full md:w-auto">
                <Select value={filterTenant} onValueChange={setFilterTenant}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filter by tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tenants</SelectItem>
                    <SelectItem value="none">No Tenant (Unassigned)</SelectItem>
                    {tenants.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">Loading users...</div>
            ) : error ? (
              <div className="text-center py-12 text-red-600">{error}</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">User</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last Sign In</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          No users found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.uid}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar>
                                <AvatarImage src={user.photoURL} />
                                <AvatarFallback>
                                  {user.email?.[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    {user.displayName || "N/A"}
                                  </p>
                                  {user.isSuperAdmin && (
                                    <Badge
                                      variant="default"
                                      className="bg-purple-600 hover:bg-purple-700"
                                    >
                                      ⭐ Super Admin
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.tenantId ? (
                              <Badge variant="default">{user.tenantId}</Badge>
                            ) : (
                              <Badge variant="secondary">Unassigned</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.role ? (
                              <Badge variant="outline">{user.role}</Badge>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell>
                            {user.metadata.lastSignInTime
                              ? new Date(
                                  user.metadata.lastSignInTime
                                ).toLocaleDateString()
                              : "Never"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!user.role && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleOpenActivateDialog(user)
                                    }
                                    className="text-green-600 font-semibold"
                                  >
                                    ✅ Activate as Admin
                                  </DropdownMenuItem>
                                )}
                                {!user.isSuperAdmin && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleOpenSuperAdminDialog(user)
                                    }
                                    className="text-purple-600 font-semibold"
                                  >
                                    ⭐ Make Super Admin
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleOpenRoleDialog(user)}
                                >
                                  Edit Role
                                </DropdownMenuItem>
                                {user.tenantId && (
                                  <DropdownMenuItem
                                    onClick={() => handleOpenRemoveDialog(user)}
                                    className="text-red-600"
                                  >
                                    Remove from Tenant
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* Edit Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role for {selectedUser?.email}</DialogTitle>
            <DialogDescription>
              Select a new role for the user. Changes will apply after their
              next login.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="role-select">Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger id="role-select">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdateRole}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove from Tenant Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This will remove{" "}
              <span className="font-bold">{selectedUser?.email}</span> from
              tenant <span className="font-bold">{selectedUser?.tenantId}</span>
              . This action cannot be undone. The user must log in again for the
              change to take effect.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleRemoveUser}>
              Confirm Removal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Admin Dialog */}
      <Dialog
        open={isActivateDialogOpen}
        onOpenChange={setIsActivateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate User as Admin</DialogTitle>
            <DialogDescription>
              This will grant{" "}
              <span className="font-bold">{selectedUser?.email}</span> full
              admin access to the dashboard. They will be able to manage
              tenants, users, and all system settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleActivateAdmin}
            >
              Activate as Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Make Super Admin Dialog */}
      <Dialog
        open={isSuperAdminDialogOpen}
        onOpenChange={setIsSuperAdminDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⭐ Make Super Admin</DialogTitle>
            <DialogDescription>
              This will grant{" "}
              <span className="font-bold">{selectedUser?.email}</span>{" "}
              <span className="text-purple-600 font-bold">Super Admin</span>{" "}
              privileges. Super Admins can:
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
              <li>Access all tenants without being assigned to one</li>
              <li>Manage all users across the system</li>
              <li>Create and delete tenants</li>
              <li>Override all permission checks</li>
            </ul>
            <p className="mt-3 text-red-600 font-semibold text-sm">
              ⚠️ This is the highest level of access. Use with caution!
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="default"
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleToggleSuperAdmin}
            >
              Confirm Super Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// --- Main App Component (Handles Auth State) ---
export default function AdminUsersPage() {
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

  return <UserManagementPage onLogout={handleLogout} />;
}
