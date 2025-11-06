"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  Trash2,
  Key,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import {
  getApiKeys,
  createApiKey,
  toggleApiKey,
  deleteApiKey,
  getDashboardTags,
} from "@/lib/api";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ApiKeysModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName?: string;
}

export function ApiKeysModal({
  open,
  onOpenChange,
  tenantId,
  tenantName,
}: ApiKeysModalProps) {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagComboOpen, setTagComboOpen] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{
    apiKey: string | null;
    description: string;
    expiresInDays: string;
    allowedTags: string[];
    maxActivations: string;
  }>({
    apiKey: null,
    description: "",
    expiresInDays: "365",
    allowedTags: [],
    maxActivations: "",
  });
  const [newTag, setNewTag] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (open) {
      fetchApiKeys();
      fetchAvailableTags();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tenantId]);

  async function fetchAvailableTags() {
    try {
      const tags = await getDashboardTags(tenantId);
      setAvailableTags(tags);
    } catch (err: any) {
      console.error("Error fetching tags:", err);
    }
  }

  async function fetchApiKeys() {
    try {
      setLoading(true);
      setError(null);
      const keys = await getApiKeys(tenantId);
      setApiKeys(keys);
    } catch (err: any) {
      setError(err.message || "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateKey() {
    try {
      setLoading(true);
      setError(null);

      const result = await createApiKey(tenantId, {
        description: newKeyData.description || "OnPrem Dashboard Access",
        expiresInDays: newKeyData.expiresInDays
          ? parseInt(newKeyData.expiresInDays)
          : undefined,
        allowedTags:
          newKeyData.allowedTags.length > 0
            ? newKeyData.allowedTags
            : undefined,
        maxActivations: newKeyData.maxActivations
          ? parseInt(newKeyData.maxActivations)
          : undefined,
      });

      setNewKeyData({
        ...newKeyData,
        apiKey: result.apiKey,
      });

      await fetchApiKeys();
    } catch (err: any) {
      setError(err.message || "Failed to create API key");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleKey(keyId: string, currentStatus: boolean) {
    try {
      setLoading(true);
      await toggleApiKey(tenantId, keyId, !currentStatus);
      await fetchApiKeys();
    } catch (err: any) {
      setError(err.message || "Failed to toggle API key");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteKey(keyId: string) {
    if (!confirm("Are you sure you want to delete this API key?")) {
      return;
    }

    try {
      setLoading(true);
      await deleteApiKey(tenantId, keyId);
      await fetchApiKeys();
    } catch (err: any) {
      setError(err.message || "Failed to delete API key");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function handleAddTag() {
    if (newTag.trim() && !newKeyData.allowedTags.includes(newTag.trim())) {
      setNewKeyData({
        ...newKeyData,
        allowedTags: [...newKeyData.allowedTags, newTag.trim()],
      });
      setNewTag("");
    }
  }

  function handleRemoveTag(tag: string) {
    setNewKeyData({
      ...newKeyData,
      allowedTags: newKeyData.allowedTags.filter((t) => t !== tag),
    });
  }

  function resetForm() {
    setNewKeyData({
      apiKey: null,
      description: "",
      expiresInDays: "365",
      allowedTags: [],
      maxActivations: "",
    });
    setNewTag("");
    setShowCreateForm(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full h-full max-h-full p-0 gap-0 lg:max-w-[95vw] lg:w-[95vw] lg:max-h-[95vh] lg:p-6 overflow-hidden flex flex-col">
        <div className="flex flex-col h-full">
          {/* Header - Fixed */}
          <DialogHeader className="shrink-0 p-6 pb-4 lg:p-0 lg:pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-2xl lg:text-3xl font-bold">
                  <Key className="h-6 w-6" />
                  API Keys Management
                </DialogTitle>
                <DialogDescription className="mt-1 text-base lg:text-lg">
                  {tenantName && (
                    <>
                      Managing API keys for tenant:{" "}
                      <span className="font-mono font-semibold text-foreground">
                        {tenantName}
                      </span>
                    </>
                  )}
                </DialogDescription>
              </div>
              <Button
                size="lg"
                onClick={() => setShowCreateForm(true)}
                disabled={showCreateForm}
              >
                <Plus className="mr-2 h-5 w-5" />
                Create API Key
              </Button>
            </div>
          </DialogHeader>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-4 lg:px-0 space-y-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Create Form */}
            {showCreateForm && !newKeyData.apiKey && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Create New API Key</CardTitle>
                    <Button variant="ghost" size="sm" onClick={resetForm}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription>
                    Generate a new API key for OnPrem dashboard access
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newKeyData.description}
                      onChange={(e) =>
                        setNewKeyData({
                          ...newKeyData,
                          description: e.target.value,
                        })
                      }
                      placeholder="e.g., Production OnPrem"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiresInDays">Expires In (Days)</Label>
                    <Select
                      value={newKeyData.expiresInDays}
                      onValueChange={(value) =>
                        setNewKeyData({ ...newKeyData, expiresInDays: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                        <SelectItem value="180">180 Days</SelectItem>
                        <SelectItem value="365">365 Days</SelectItem>
                        <SelectItem value="0">Never Expires</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxActivations">
                      Max Activations (Optional)
                    </Label>
                    <Input
                      id="maxActivations"
                      type="number"
                      placeholder="Leave empty for unlimited"
                      value={newKeyData.maxActivations}
                      onChange={(e) =>
                        setNewKeyData({
                          ...newKeyData,
                          maxActivations: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Limit how many times this key can be activated
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Allowed Dashboard Tags (Optional)</Label>
                    <Popover open={tagComboOpen} onOpenChange={setTagComboOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={tagComboOpen}
                          className="w-full justify-between"
                        >
                          {newKeyData.allowedTags.length > 0 ? (
                            <span className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="bg-blue-600 text-white"
                              >
                                {newKeyData.allowedTags.length}
                              </Badge>
                              {newKeyData.allowedTags.length === 1
                                ? "tag"
                                : "tags"}{" "}
                              selected
                            </span>
                          ) : (
                            "Select tags from your dashboards..."
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search or type new tag..."
                            value={newTag}
                            onValueChange={setNewTag}
                          />
                          <CommandEmpty>
                            <div className="p-2 text-sm">
                              <Button
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={() => {
                                  if (newTag.trim()) {
                                    handleAddTag();
                                    setTagComboOpen(false);
                                  }
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add &quot;{newTag}&quot;
                              </Button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            {availableTags.map((tag) => {
                              const isSelected =
                                newKeyData.allowedTags.includes(tag);
                              return (
                                <CommandItem
                                  key={tag}
                                  onSelect={() => {
                                    if (!isSelected) {
                                      setNewKeyData({
                                        ...newKeyData,
                                        allowedTags: [
                                          ...newKeyData.allowedTags,
                                          tag,
                                        ],
                                      });
                                    }
                                    setNewTag("");
                                    setTagComboOpen(false);
                                  }}
                                  className={cn(
                                    isSelected &&
                                      "bg-blue-50 text-blue-900 font-semibold"
                                  )}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      isSelected
                                        ? "opacity-100 text-blue-600"
                                        : "opacity-0"
                                    )}
                                  />
                                  {tag}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Select tags from existing dashboards or type to create new
                      ones. Leave empty to allow access to all dashboards.
                    </p>
                    {newKeyData.allowedTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="w-full text-xs font-semibold text-blue-900 mb-1">
                          Selected Tags:
                        </div>
                        {newKeyData.allowedTags.map((tag) => (
                          <Badge
                            key={tag}
                            className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {tag}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-red-200"
                              onClick={() => handleRemoveTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleCreateKey}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Generate API Key"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Success Message */}
            {newKeyData.apiKey && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="font-semibold text-green-900">
                      ✅ API Key created successfully!
                    </p>
                    <div className="space-y-2">
                      <Label className="text-green-900">API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newKeyData.apiKey}
                          readOnly
                          className="font-mono bg-white"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(newKeyData.apiKey!)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-green-800">
                      ⚠️ Make sure to copy this API key now. You won&apos;t be
                      able to see it again!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Share this API key with your client. They only need the
                      API key to login.
                    </p>
                    <Button variant="outline" size="sm" onClick={resetForm}>
                      Done
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* API Keys Table */}
            <Card>
              <CardHeader>
                <CardTitle>Active API Keys</CardTitle>
                <CardDescription>
                  {apiKeys.length} API key(s) found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading && apiKeys.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Activations</TableHead>
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
                            colSpan={8}
                            className="text-center text-muted-foreground py-12"
                          >
                            No API keys found. Create one to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        apiKeys.map((key) => (
                          <TableRow key={key.id}>
                            <TableCell className="font-mono text-sm">
                              {key.id.substring(0, 12)}...
                            </TableCell>
                            <TableCell>{key.description || "—"}</TableCell>
                            <TableCell>
                              {key.allowedTags && key.allowedTags.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {key.allowedTags.map((tag: string) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  All
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="flex items-center gap-1">
                                <span className="font-semibold">
                                  {key.activationCount || 0}
                                </span>
                                {key.maxActivations && (
                                  <span className="text-muted-foreground">
                                    / {key.maxActivations}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {key.isActive ? (
                                <Badge className="bg-green-100 text-green-800">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {key.createdAt
                                ? new Date(key.createdAt).toLocaleDateString()
                                : "N/A"}
                            </TableCell>
                            <TableCell className="text-sm">
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
                                    handleToggleKey(key.id, key.isActive)
                                  }
                                  title={
                                    key.isActive ? "Deactivate" : "Activate"
                                  }
                                >
                                  {key.isActive ? (
                                    <ToggleRight className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 text-gray-400" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteKey(key.id)}
                                  title="Delete"
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
                )}
              </CardContent>
            </Card>

            {/* Instructions Card */}
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
                    Click &quot;Create API Key&quot; button above to generate a
                    new key
                  </p>
                </div>
                <div>
                  <p className="font-semibold">2. Configure Access</p>
                  <p className="text-muted-foreground">
                    Set allowed dashboard tags to limit which dashboards can be
                    accessed
                  </p>
                </div>
                <div>
                  <p className="font-semibold">3. Set Activation Limit</p>
                  <p className="text-muted-foreground">
                    Optionally limit how many times the key can be activated
                  </p>
                </div>
                <div>
                  <p className="font-semibold">4. Share with Client</p>
                  <p className="text-muted-foreground">
                    Provide only the API Key to your client (tenant is
                    auto-detected)
                  </p>
                </div>
                <div>
                  <p className="font-semibold">5. Monitor Usage</p>
                  <p className="text-muted-foreground">
                    Track activation count and last used timestamp in the table
                  </p>
                </div>
                <div>
                  <p className="font-semibold">6. Revoke Access</p>
                  <p className="text-muted-foreground">
                    Toggle inactive or delete the API key to revoke access
                    immediately
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
