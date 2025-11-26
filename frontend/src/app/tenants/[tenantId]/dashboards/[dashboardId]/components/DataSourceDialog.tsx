"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Sparkles,
  X,
  Zap,
  Clipboard,
  BarChart3,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import {
  testDataSourceConnection,
  createDataSource,
  updateDataSource,
  getDataSourceById,
  updateDashboard,
  previewTableData,
} from "@/lib/api";

type DataSourceType = "mssql" | "mysql" | "postgresql" | "oracle" | "mongodb";

interface DataSourceDialogProps {
  tenantId: string;
  dashboardId: string;
  editDataSourceId: string;
  onClose: (saved: boolean) => void;
}

export function DataSourceDialog({
  tenantId,
  dashboardId,
  editDataSourceId,
  onClose,
}: DataSourceDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "mssql" as DataSourceType,
    host: "",
    port: 1433,
    database: "",
    username: "",
    password: "",
    schema: "",
  });

  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Smart Input states
  const [showSmartInput, setShowSmartInput] = useState(false);
  const [connectionString, setConnectionString] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  // Preview states
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (editDataSourceId) {
      loadDataSource();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDataSourceId]);

  const parseConnectionString = async (connStr: string) => {
    try {
      const parsedData: Partial<typeof formData> = {};

      // SQL Server format
      if (connStr.startsWith("sqlserver://")) {
        parsedData.type = "mssql";
        const urlPart = connStr.replace("sqlserver://", "");
        const [hostPort, ...params] = urlPart.split(";");
        const [host, portStr] = hostPort.split(":");
        parsedData.host = host;
        parsedData.port = portStr ? parseInt(portStr) : 1433;
        params.forEach((param) => {
          const [key, value] = param.split("=");
          if (key === "database") parsedData.database = value;
          if (key === "user") parsedData.username = value;
          if (key === "password") parsedData.password = value;
          if (key === "schema") parsedData.schema = value;
        });
      }
      // MySQL format
      else if (connStr.startsWith("mysql://")) {
        parsedData.type = "mysql";
        const urlPart = connStr.replace("mysql://", "");
        const [auth, rest] = urlPart.split("@");
        const [username, password] = auth.split(":");
        const [hostPort, database] = rest.split("/");
        const [host, portStr] = hostPort.split(":");
        parsedData.host = host;
        parsedData.port = portStr ? parseInt(portStr) : 3306;
        parsedData.database = database?.split("?")[0];
        parsedData.username = username;
        parsedData.password = password;
      }
      // PostgreSQL format
      else if (
        connStr.startsWith("postgresql://") ||
        connStr.startsWith("postgres://")
      ) {
        parsedData.type = "postgresql";
        const urlPart = connStr.replace(/^postgres(ql)?:\/\//, "");
        const [auth, rest] = urlPart.split("@");
        const [username, password] = auth.split(":");
        const [hostPort, database] = rest.split("/");
        const [host, portStr] = hostPort.split(":");
        parsedData.host = host;
        parsedData.port = portStr ? parseInt(portStr) : 5432;
        parsedData.database = database?.split("?")[0];
        parsedData.username = username;
        parsedData.password = password;
      }
      // MongoDB format
      else if (connStr.startsWith("mongodb://")) {
        parsedData.type = "mongodb";
        const urlPart = connStr.replace("mongodb://", "");
        const hasAuth = urlPart.includes("@");
        if (hasAuth) {
          const [auth, rest] = urlPart.split("@");
          const [username, password] = auth.split(":");
          const [hostPort, database] = rest.split("/");
          const [host, portStr] = hostPort.split(":");
          parsedData.host = host;
          parsedData.port = portStr ? parseInt(portStr) : 27017;
          parsedData.database = database?.split("?")[0];
          parsedData.username = username;
          parsedData.password = password;
        } else {
          const [hostPort, database] = urlPart.split("/");
          const [host, portStr] = hostPort.split(":");
          parsedData.host = host;
          parsedData.port = portStr ? parseInt(portStr) : 27017;
          parsedData.database = database?.split("?")[0];
        }
      }
      // Oracle format
      else if (connStr.startsWith("oracle://")) {
        parsedData.type = "oracle";
        const urlPart = connStr.replace("oracle://", "");
        const [auth, rest] = urlPart.split("@");
        const [username, password] = auth.split(":");
        const [hostPort, database] = rest.split("/");
        const [host, portStr] = hostPort.split(":");
        parsedData.host = host;
        parsedData.port = portStr ? parseInt(portStr) : 1521;
        parsedData.database = database?.split("?")[0];
        parsedData.username = username;
        parsedData.password = password;
      }

      // Animate filling fields
      setIsAnimating(true);
      setFormData((prev) => ({
        ...prev,
        type: "mssql",
        host: "",
        port: 1433,
        database: "",
        username: "",
        password: "",
        schema: "",
      }));
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (parsedData.type) {
        setFormData((prev) => ({ ...prev, type: parsedData.type! }));
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      if (parsedData.host) {
        setFormData((prev) => ({ ...prev, host: parsedData.host! }));
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      if (parsedData.port) {
        setFormData((prev) => ({ ...prev, port: parsedData.port! }));
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      if (parsedData.database) {
        setFormData((prev) => ({ ...prev, database: parsedData.database! }));
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      if (parsedData.username) {
        setFormData((prev) => ({ ...prev, username: parsedData.username! }));
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      if (parsedData.password) {
        setFormData((prev) => ({ ...prev, password: parsedData.password! }));
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      if (parsedData.schema) {
        setFormData((prev) => ({ ...prev, schema: parsedData.schema! }));
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      if (!formData.name && parsedData.database) {
        setFormData((prev) => ({
          ...prev,
          name: `${parsedData.type?.toUpperCase()} - ${parsedData.database}`,
        }));
      }

      setIsAnimating(false);
      setShowSmartInput(false);
      setConnectionString("");
      toast.success("Connection string parsed successfully!");
    } catch (error) {
      setIsAnimating(false);
      toast.error("Failed to parse connection string");
      console.error("Parse error:", error);
    }
  };

  const loadDataSource = async () => {
    try {
      const ds = await getDataSourceById(tenantId, editDataSourceId);
      setFormData({
        name: ds.name,
        type: ds.type as DataSourceType,
        host: ds.connection.host || "",
        port: ds.connection.port || 1433,
        database: ds.connection.database || "",
        username: ds.connection.username || "",
        password: ds.connection.password || "",
        schema: ds.connection.schema || "",
      });
    } catch (error: any) {
      console.error("Error loading data source:", error);
      toast.error("Failed to load data source");
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestStatus(null);
      setAvailableTables([]);

      const result = await testDataSourceConnection(tenantId, {
        type: formData.type,
        connection: {
          host: formData.host,
          port: formData.port,
          database: formData.database,
          username: formData.username,
          password: formData.password,
          schema: formData.schema,
        },
      });

      setTested(true);
      setTestStatus({
        success: result.success,
        message: result.message,
      });

      if (result.success && result.tables) {
        setAvailableTables(result.tables);
      }

      if (result.success) {
        toast.success("✅ Connection successful!");
      } else {
        toast.error("❌ Connection failed");
      }
    } catch (error: any) {
      console.error("Test connection error:", error);
      setTested(true);
      setTestStatus({
        success: false,
        message: error.message || "Connection test failed",
      });
      toast.error("❌ Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.host || !formData.database) {
      toast.error("Please fill in required fields");
      return;
    }

    if (!tested || !testStatus?.success) {
      toast.error("Please test the connection first");
      return;
    }

    try {
      setSaving(true);

      let dataSourceId: string;

      const payload = {
        name: formData.name,
        type: formData.type,
        connection: {
          host: formData.host,
          port: formData.port,
          database: formData.database,
          username: formData.username,
          password: formData.password,
          schema: formData.schema,
        },
      };

      if (editDataSourceId) {
        await updateDataSource(tenantId, editDataSourceId, payload);
        dataSourceId = editDataSourceId;
        toast.success("Data source updated!");
      } else {
        const newDs = await createDataSource(tenantId, payload);
        dataSourceId = newDs.id;
        toast.success("Data source created!");
      }

      if (selectedTable) {
        await updateDashboard(tenantId, dashboardId, {
          dataSourceId,
          selectedTable,
        });
        toast.success("Table selected for dashboard!");
      }

      onClose(true);
    } catch (error: any) {
      console.error("Error saving data source:", error);
      toast.error(error.message || "Failed to save data source");
    } finally {
      setSaving(false);
    }
  };

  const loadPreviewData = async (table: string) => {
    if (!table || !editDataSourceId) return;

    try {
      setLoadingPreview(true);
      const result = await previewTableData(
        tenantId,
        editDataSourceId,
        table,
        5
      );
      setPreviewData(result.data);
      setPreviewColumns(result.columns);
    } catch (error: any) {
      console.error("Error loading preview:", error);
      toast.error("Failed to load preview data");
      setPreviewData([]);
      setPreviewColumns([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleTableSelect = (table: string) => {
    setSelectedTable(table);
    loadPreviewData(table);
  };

  const getDefaultPort = (type: DataSourceType): number => {
    switch (type) {
      case "mssql":
        return 1433;
      case "mysql":
        return 3306;
      case "postgresql":
        return 5432;
      default:
        return 1433;
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-5 gap-4 lg:gap-8 py-4 lg:py-6 flex-1 overflow-hidden px-6 lg:px-0">
      {/* Left side - Form */}
      <div className="lg:col-span-3 space-y-4 overflow-y-auto max-h-[calc(100vh-250px)] lg:max-h-[calc(95vh-200px)] lg:pr-2">
        {/* Smart Input Section */}
        {!showSmartInput ? (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setShowSmartInput(true)}
              className="relative overflow-hidden bg-linear-to-r from-purple-500 via-pink-500 to-orange-500 text-white border-0 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl text-sm lg:text-base"
            >
              <span className="relative z-10 flex items-center gap-2 font-semibold">
                <Sparkles className="h-5 w-5" />
                Smart Input
              </span>
            </Button>
          </div>
        ) : (
          <div className="space-y-3 p-5 bg-linear-to-r from-purple-50 via-pink-50 to-orange-50 rounded-xl border-2 border-dashed border-purple-300 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                <Label
                  htmlFor="connectionString"
                  className="text-base font-bold text-purple-700"
                >
                  Paste Your Connection String
                </Label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSmartInput(false);
                  setConnectionString("");
                }}
                className="hover:bg-red-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <textarea
              id="connectionString"
              placeholder="Paste your connection string here..."
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              className="w-full min-h-20 p-3 border-2 border-purple-200 rounded-lg resize-none font-mono text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition-all"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowSmartInput(false);
                  setConnectionString("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => parseConnectionString(connectionString)}
                disabled={!connectionString.trim() || isAnimating}
                className="bg-linear-to-r from-purple-500 via-pink-500 to-orange-500 text-white hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  {isAnimating ? (
                    <>
                      <Zap className="h-4 w-4 animate-spin" /> Parsing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Parse & Fill
                    </>
                  )}
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* Manual Form */}
        <div className="space-y-4 mt-4">
          {/* Data Source Name */}
          <div>
            <Label htmlFor="name">Data Source Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="My Database Connection"
            />
          </div>

          {/* Database Type */}
          <div>
            <Label htmlFor="type">Database Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => {
                const type = value as DataSourceType;
                setFormData({
                  ...formData,
                  type,
                  port: getDefaultPort(type),
                });
                setTested(false);
                setTestStatus(null);
                setAvailableTables([]);
              }}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select database type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mssql">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    SQL Server
                  </div>
                </SelectItem>
                <SelectItem value="mysql">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    MySQL
                  </div>
                </SelectItem>
                <SelectItem value="postgresql">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    PostgreSQL
                  </div>
                </SelectItem>
                <SelectItem value="oracle">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Oracle
                  </div>
                </SelectItem>
                <SelectItem value="mongodb">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    MongoDB
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Host and Port */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label htmlFor="host">Host *</Label>
              <Input
                id="host"
                value={formData.host}
                onChange={(e) => {
                  setFormData({ ...formData, host: e.target.value });
                  setTested(false);
                  setTestStatus(null);
                }}
                placeholder="localhost or IP address"
              />
            </div>
            <div>
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                value={formData.port}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    port: parseInt(e.target.value) || 0,
                  });
                  setTested(false);
                  setTestStatus(null);
                }}
              />
            </div>
          </div>

          {/* Database Name */}
          <div>
            <Label htmlFor="database">Database Name *</Label>
            <Input
              id="database"
              value={formData.database}
              onChange={(e) => {
                setFormData({ ...formData, database: e.target.value });
                setTested(false);
                setTestStatus(null);
              }}
              placeholder="database_name"
            />
          </div>

          {/* Username and Password */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => {
                  setFormData({ ...formData, username: e.target.value });
                  setTested(false);
                  setTestStatus(null);
                }}
                placeholder="db_user"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  setTested(false);
                  setTestStatus(null);
                }}
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Schema (optional) */}
          <div>
            <Label htmlFor="schema">Schema (Optional)</Label>
            <Input
              id="schema"
              value={formData.schema}
              onChange={(e) =>
                setFormData({ ...formData, schema: e.target.value })
              }
              placeholder="dbo"
            />
          </div>

          {/* Test Connection Button */}
          <div className="flex items-center gap-4 pt-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || !formData.host || !formData.database}
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>
            {testStatus && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  testStatus.success ? "text-green-600" : "text-red-600"
                }`}
              >
                {testStatus.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {testStatus.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Preview Panel */}
      <div className="lg:col-span-2 flex">
        <div className="bg-gray-50 rounded-xl p-4 lg:p-6 border-2 border-gray-200 shadow-lg overflow-hidden flex flex-col w-full max-h-[calc(95vh-200px)] lg:max-h-[calc(95vh-250px)]">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clipboard className="h-5 w-5" /> Connection Preview
          </h3>

          {/* Connection Info in 2 columns */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm shrink-0">
            <div>
              <span className="text-gray-600 text-xs">Name:</span>
              <p className="font-semibold text-gray-900 mt-0.5 text-sm">
                {formData.name || "-"}
              </p>
            </div>
            <div>
              <span className="text-gray-600 text-xs">Type:</span>
              <p className="font-semibold text-gray-900 mt-0.5 text-sm">
                {formData.type.toUpperCase()}
              </p>
            </div>
            <div>
              <span className="text-gray-600 text-xs">Endpoint:</span>
              <p className="font-mono text-xs text-gray-900 mt-0.5 break-all">
                {formData.host || "-"}:{formData.port || "-"}
              </p>
            </div>
            <div>
              <span className="text-gray-600 text-xs">Database:</span>
              <p className="font-semibold text-gray-900 mt-0.5 text-sm">
                {formData.database || "-"}
              </p>
            </div>
          </div>

          {/* Table Selection Dropdown */}
          {availableTables.length > 0 && (
            <div className="pt-3">
              <Label
                htmlFor="table-select-preview"
                className="text-gray-600 text-xs"
              >
                Select Table:
              </Label>
              <Select value={selectedTable} onValueChange={handleTableSelect}>
                <SelectTrigger
                  id="table-select-preview"
                  className="mt-1 bg-white h-8 text-sm"
                >
                  <SelectValue placeholder="Choose a table..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Preview Data Table */}
          {selectedTable && (
            <div className="mt-3 flex-1 overflow-hidden flex flex-col">
              <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <BarChart3 className="h-4 w-4" /> Data Preview ({selectedTable})
              </h4>
              {loadingPreview ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
                  <span className="ml-2 text-sm text-gray-600">
                    Loading preview...
                  </span>
                </div>
              ) : previewData.length > 0 ? (
                <div className="overflow-auto flex-1 bg-white rounded-lg border border-gray-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        {previewColumns.map((column) => (
                          <th
                            key={column}
                            className="px-2 py-1 text-left font-semibold text-gray-800"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          {previewColumns.map((column) => (
                            <td
                              key={column}
                              className="px-2 py-1 text-gray-700"
                            >
                              {row[column]?.toString() || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-xs text-center text-gray-500 p-2 bg-gray-50">
                    Showing {previewData.length} rows
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-xs">
                  No data available
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons at bottom */}
      <div className="lg:col-span-5 flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={() => onClose(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !tested || !testStatus?.success}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save & Close"
          )}
        </Button>
      </div>
    </div>
  );
}
