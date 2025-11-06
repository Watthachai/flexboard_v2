"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Key,
  Copy,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  getApiKeys,
  createApiKey,
  toggleApiKey,
  deleteApiKey,
  type ApiKey,
} from "@/lib/api";

export default function ApiKeysPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newKeyDialog, setNewKeyDialog] = useState(false);
  const [newKey, setNewKey] = useState<{
    key: string;
    tenantId: string;
  } | null>(null);
  const [expiresInDays, setExpiresInDays] = useState("365");
  const [description, setDescription] = useState("OnPrem Dashboard Access");

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const data = await getApiKeys(tenantId);
      setApiKeys(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const handleCreateApiKey = async () => {
    try {
      setCreating(true);
      setError(null);

      const data = await createApiKey(tenantId, {
        expiresInDays: parseInt(expiresInDays),
        description,
      });

      setNewKey({ key: data.apiKey, tenantId });
      setNewKeyDialog(false);
      fetchApiKeys();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (keyId: string, isActive: boolean) => {
    try {
      await toggleApiKey(tenantId, keyId, !isActive);
      fetchApiKeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;

    try {
      await deleteApiKey(tenantId, keyId);
      fetchApiKeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Managing API keys for tenant:{" "}
            <span className="font-mono font-semibold text-foreground">
              {tenantId}
            </span>
          </p>
        </div>
        <Dialog open={newKeyDialog} onOpenChange={setNewKeyDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for OnPrem dashboard access
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Production OnPrem"
                />
              </div>
              <div className="space-y-2">
                <Label>Expires In (days)</Label>
                <Input
                  type="number"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  placeholder="365"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for no expiration
                </p>
              </div>
              <Button
                onClick={handleCreateApiKey}
                disabled={creating}
                className="w-full"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Generate API Key"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success Dialog */}
      {newKey && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-semibold text-green-900">
                API Key created successfully!
              </p>
              <div className="space-y-2">
                <Label className="text-green-900">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={newKey.key}
                    readOnly
                    className="font-mono bg-white"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(newKey.key)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-green-800">
                ⚠️ Make sure to copy this API key now. You won&apos;t be able to
                see it again!
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Share this API key with your client. They only need the API key
                to login - no tenant ID required.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewKey(null)}
              >
                Done
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active API Keys</CardTitle>
          <CardDescription>{apiKeys.length} API key(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    No API keys found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-mono text-sm">
                      {key.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>{key.description}</TableCell>
                    <TableCell>
                      {key.isActive ? (
                        <Badge className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {key.createdAt
                        ? new Date(key.createdAt).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {key.expiresAt
                        ? new Date(key.expiresAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleToggleActive(key.id, key.isActive)
                          }
                        >
                          {key.isActive ? (
                            <ToggleRight className="h-4 w-4" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteKey(key.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            How to use API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-semibold">1. Generate API Key</p>
            <p className="text-muted-foreground">
              Click &quot;Create API Key&quot; button above to generate a new
              key
            </p>
          </div>
          <div>
            <p className="font-semibold">2. Share with Client</p>
            <p className="text-muted-foreground">
              Provide the API Key to your client (no tenant ID needed -
              it&apos;s automatically detected)
            </p>
          </div>
          <div>
            <p className="font-semibold">3. Client Login</p>
            <p className="text-muted-foreground">
              Client enters only the API Key in OnPrem dashboard login page
            </p>
          </div>
          <div>
            <p className="font-semibold">4. Revoke Access</p>
            <p className="text-muted-foreground">
              Toggle inactive or delete the API key to revoke access immediately
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
