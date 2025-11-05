"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  Eye,
  History,
  Settings,
  Plus,
  Loader2,
  Database,
  RefreshCw,
  CheckCircle,
  XCircle,
  Sparkles,
  Zap,
  Pencil,
  Link,
} from "lucide-react";
import {
  getDashboardById,
  getDashboardVersions,
  getDataSources,
  testDataSourceConnection,
  createDataSource,
  updateDashboard,
  updateDataSource,
} from "@/lib/api";
import {
  Dashboard,
  DashboardVersion,
  DataSource,
  DataSourceType,
} from "@/types/dashboard";
import { toast } from "sonner";

export default function DashboardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const dashboardId = params.dashboardId as string;

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [versions, setVersions] = useState<DashboardVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("design");

  // Data Source states
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>("");
  const [createDataSourceOpen, setCreateDataSourceOpen] = useState(false);
  const [editDataSourceId, setEditDataSourceId] = useState<string>("");
  const [newConnectionTested, setNewConnectionTested] = useState(false);
  const [testingNewConnection, setTestingNewConnection] = useState(false);
  const [newConnectionStatus, setNewConnectionStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Form validation errors
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    host?: string;
    port?: string;
    database?: string;
    username?: string;
    password?: string;
    schema?: string;
  }>({});

  // Smart Input state
  const [showSmartInput, setShowSmartInput] = useState(false);
  const [connectionString, setConnectionString] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  // Form state for creating data source
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

  useEffect(() => {
    loadDashboard();
    loadVersions();
    loadDataSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, dashboardId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await getDashboardById(tenantId, dashboardId);
      setDashboard(data);
    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    try {
      const data = await getDashboardVersions(tenantId, dashboardId);
      setVersions(data);
    } catch (error: any) {
      console.error("Error loading versions:", error);
    }
  };

  const loadDataSources = async () => {
    try {
      const data = await getDataSources(tenantId);
      setDataSources(data);
    } catch (error: any) {
      console.error("Error loading data sources:", error);
    }
  };

  // Set selected data source when dashboard loads
  useEffect(() => {
    if (dashboard?.dataSourceId) {
      setSelectedDataSourceId(dashboard.dataSourceId);
    }
  }, [dashboard]);

  const handleSaveDataSource = async () => {
    if (!selectedDataSourceId) {
      toast.error("Please select a data source");
      return;
    }

    try {
      // Update dashboard's dataSourceId
      await updateDashboard(tenantId, dashboardId, {
        dataSourceId: selectedDataSourceId,
      });

      // Reload dashboard to get updated data
      await loadDashboard();

      const selectedDs = dataSources.find(
        (ds) => ds.id === selectedDataSourceId
      );
      toast.success(`✅ Dashboard now uses "${selectedDs?.name}" data source!`);
    } catch (error: any) {
      console.error("Error linking data source:", error);
      toast.error("❌ Failed to link data source");
    }
  };

  const handleEditDataSource = () => {
    if (!selectedDataSourceId) {
      toast.error("Please select a data source to edit");
      return;
    }

    // Load selected data source data into form
    const ds = dataSources.find((d) => d.id === selectedDataSourceId);
    if (!ds) {
      toast.error("Data source not found");
      return;
    }

    // Populate form with existing data including password
    setFormData({
      name: ds.name,
      type: ds.type,
      host: ds.connection.host || "",
      port: ds.connection.port || getDefaultPort(ds.type),
      database: ds.connection.database || "",
      username: ds.connection.username || "",
      password: ds.connection.password || "", // Show password for editing
      schema: ds.connection.schema || "",
    });

    // Set edit mode
    setEditDataSourceId(selectedDataSourceId);
    setNewConnectionTested(true); // Already tested since it exists
    setCreateDataSourceOpen(true);
  };

  // Parse connection string and auto-fill form with animation
  const parseConnectionString = (connStr: string) => {
    try {
      const parsedData: Partial<typeof formData> = {};

      // SQL Server format: sqlserver://host:port;database=db;user=user;password=pass;...
      if (connStr.startsWith("sqlserver://")) {
        const type: DataSourceType = "mssql";
        parsedData.type = type;

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
      // MySQL format: mysql://user:password@host:port/database
      else if (connStr.startsWith("mysql://")) {
        const type: DataSourceType = "mysql";
        parsedData.type = type;

        const urlPart = connStr.replace("mysql://", "");
        const [auth, rest] = urlPart.split("@");
        const [username, password] = auth.split(":");
        const [hostPort, database] = rest.split("/");
        const [host, portStr] = hostPort.split(":");

        parsedData.host = host;
        parsedData.port = portStr ? parseInt(portStr) : 3306;
        parsedData.database = database?.split("?")[0]; // Remove query params
        parsedData.username = username;
        parsedData.password = password;
      }
      // PostgreSQL format: postgresql://user:password@host:port/database
      else if (
        connStr.startsWith("postgresql://") ||
        connStr.startsWith("postgres://")
      ) {
        const type: DataSourceType = "postgresql";
        parsedData.type = type;

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
      // MongoDB format: mongodb://username:password@host:port/database
      else if (connStr.startsWith("mongodb://")) {
        const type: DataSourceType = "mongodb";
        parsedData.type = type;

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
      // Oracle format: oracle://user:password@host:port/service_name
      else if (connStr.startsWith("oracle://")) {
        const type: DataSourceType = "oracle";
        parsedData.type = type;

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

      // Update form data with animation
      setFormData((prev) => ({
        ...prev,
        ...parsedData,
      }));

      // Clear errors
      setFormErrors({});

      // Animate filling fields one by one
      const animateFields = async () => {
        setIsAnimating(true);

        // Reset fields first for re-animation
        setFormData((prev) => ({
          ...prev,
          type: "mssql" as DataSourceType,
          host: "",
          port: 1433,
          database: "",
          username: "",
          password: "",
          schema: "",
        }));

        await new Promise((resolve) => setTimeout(resolve, 100));

        // First update type
        if (parsedData.type) {
          setFormData((prev) => ({ ...prev, type: parsedData.type! }));
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        // Then host
        if (parsedData.host) {
          setFormData((prev) => ({ ...prev, host: parsedData.host! }));
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        // Then port
        if (parsedData.port) {
          setFormData((prev) => ({ ...prev, port: parsedData.port! }));
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        // Then database
        if (parsedData.database) {
          setFormData((prev) => ({ ...prev, database: parsedData.database! }));
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        // Then username
        if (parsedData.username) {
          setFormData((prev) => ({ ...prev, username: parsedData.username! }));
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        // Then password
        if (parsedData.password) {
          setFormData((prev) => ({ ...prev, password: parsedData.password! }));
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        // Finally schema
        if (parsedData.schema) {
          setFormData((prev) => ({ ...prev, schema: parsedData.schema! }));
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        // Auto-generate name if not set
        if (!formData.name && parsedData.database) {
          setFormData((prev) => ({
            ...prev,
            name: `${parsedData.type?.toUpperCase()} - ${parsedData.database}`,
          }));
        }

        setIsAnimating(false);
        toast.success("Connection string parsed successfully! ✨");
      };

      // Start animation
      animateFields();
      setShowSmartInput(false);
      setConnectionString("");
    } catch (error) {
      setIsAnimating(false);
      toast.error("Failed to parse connection string");
      console.error("Parse error:", error);
    }
  };

  const validateConnectionForm = (
    showErrors = false
  ): {
    isValid: boolean;
    message: string;
  } => {
    const errors: typeof formErrors = {};

    // Always validate name
    if (!formData.name) {
      errors.name = "Name is required";
    }

    // Common required fields
    if (!formData.host) {
      errors.host = "Host is required";
    }

    if (!formData.port) {
      errors.port = "Port is required";
    }

    // MongoDB has different requirements
    if (formData.type === "mongodb") {
      if (!formData.database) {
        errors.database = "Database name is required";
      }
      // MongoDB usually requires authentication
      if (!formData.username) {
        errors.username = "Username is required";
      }
      if (!formData.password) {
        errors.password = "Password is required";
      }
    } else {
      // SQL databases (mssql, mysql, postgresql, oracle)
      if (!formData.database) {
        errors.database = "Database name is required";
      }

      if (!formData.username) {
        errors.username = "Username is required";
      }

      if (!formData.password) {
        errors.password = "Password is required";
      }

      // SQL Server schema is now optional (removed validation)
    }

    // Update form errors state if requested
    if (showErrors) {
      setFormErrors(errors);
    }

    const firstError = Object.values(errors)[0];
    return {
      isValid: Object.keys(errors).length === 0,
      message: firstError || "",
    };
  };

  const handleTestNewConnection = async () => {
    try {
      // Validate form and show errors
      const validation = validateConnectionForm(true);
      if (!validation.isValid) {
        toast.error(validation.message);
        return;
      }

      setTestingNewConnection(true);
      setNewConnectionStatus(null);

      const result = await testDataSourceConnection(tenantId, {
        type: formData.type,
        connection: {
          host: formData.host,
          port: formData.port,
          database: formData.database,
          username: formData.username,
          password: formData.password,
          schema: formData.schema || undefined,
        },
      });

      setNewConnectionStatus({
        success: true,
        message: `Connected successfully! Found ${
          result.tables?.length || 0
        } tables`,
      });
      setNewConnectionTested(true);
      toast.success("Connection successful!");

      // If editing existing data source, update its status to "connected"
      const dataSourceIdToUpdate = editDataSourceId || selectedDataSourceId;

      if (dataSourceIdToUpdate) {
        try {
          await updateDataSource(tenantId, dataSourceIdToUpdate, {
            name: formData.name,
            type: formData.type,
            connection: {
              host: formData.host,
              port: formData.port,
              database: formData.database,
              username: formData.username,
              password: formData.password,
              schema: formData.schema || undefined,
            },
            status: "connected",
            availableTables: result.tables || [],
          });

          // Reload data sources to show updated status
          await loadDataSources();

          // Force UI refresh by re-selecting the data source
          const currentSelectedId = selectedDataSourceId;
          setSelectedDataSourceId("");
          setTimeout(() => {
            setSelectedDataSourceId(currentSelectedId);
          }, 0);

          toast.success("✅ Status updated to connected!");
        } catch (updateError) {
          console.error("Failed to update status:", updateError);
          toast.error("⚠️ Connection successful but failed to update status");
        }
      }
    } catch (error: any) {
      setNewConnectionStatus({
        success: false,
        message: error.message || "Connection failed",
      });
      setNewConnectionTested(false);
      toast.error("Connection failed");
    } finally {
      setTestingNewConnection(false);
    }
  };

  const handleCreateDataSource = async () => {
    try {
      if (!formData.name) {
        setFormErrors((prev) => ({ ...prev, name: "Name is required" }));
        toast.error("Name is required");
        return;
      }

      // Validate connection form and show errors
      const validation = validateConnectionForm(true);
      if (!validation.isValid) {
        toast.error(validation.message);
        return;
      }

      if (!newConnectionTested) {
        toast.error("Please test the connection first");
        return;
      }

      const dataSourceData = {
        name: formData.name,
        type: formData.type,
        connection: {
          host: formData.host,
          port: formData.port,
          database: formData.database,
          username: formData.username,
          password: formData.password,
          schema: formData.schema || undefined,
        },
        status: "connected", // Set status as connected since we tested it
        availableTables: [], // Could store tables from test result
      };

      if (editDataSourceId) {
        // Update existing data source
        await updateDataSource(tenantId, editDataSourceId, dataSourceData);
        toast.success(
          `✅ Data source "${formData.name}" updated successfully!`
        );
      } else {
        // Create new data source
        await createDataSource(tenantId, dataSourceData);
        toast.success(
          `✅ Data source "${formData.name}" created successfully!`
        );
      }

      setCreateDataSourceOpen(false);
      resetForm();
      await loadDataSources();
    } catch (error: any) {
      console.error("Error saving data source:", error);
      toast.error(`❌ Failed to save data source: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "mssql",
      host: "",
      port: 1433,
      database: "",
      username: "",
      password: "",
      schema: "",
    });
    setNewConnectionTested(false);
    setNewConnectionStatus(null);
    setEditDataSourceId(""); // Clear edit mode
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

  const handleBack = () => {
    router.push(`/tenants/${tenantId}/dashboards`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600">Dashboard not found</p>
            <Button onClick={handleBack} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboards
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {dashboard.name}
              </h1>
              <Badge className={getStatusColor(dashboard.status)}>
                {dashboard.status}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">
              {dashboard.description || "No description"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Data Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {dashboard.dataSource?.name || "Not configured"}
            </p>
            {dashboard.dataSource && (
              <p className="text-sm text-gray-500 mt-1">
                {dashboard.dataSource.type.toUpperCase()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Current Version
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{dashboard.currentVersion}</p>
            <p className="text-sm text-gray-500 mt-1">
              {versions.length} total versions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Last Updated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {new Date(dashboard.updatedAt).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(dashboard.updatedAt).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="design">
            <Plus className="mr-2 h-4 w-4" />
            Design
          </TabsTrigger>
          <TabsTrigger value="versions">
            <History className="mr-2 h-4 w-4" />
            Versions
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Design Tab */}
        <TabsContent value="design" className="mt-6">
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <Plus className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">
                  Dashboard Designer
                </h3>
                <p className="mb-4">
                  Drag and drop widgets to design your dashboard
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Widget
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No versions found
                </div>
              ) : (
                <div className="space-y-4">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            v{version.versionNumber}
                          </span>
                          {version.isActive && (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {version.changeLog || "No changelog"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Published:{" "}
                          {new Date(version.publishedAt).toLocaleString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <div className="space-y-6">
            {/* Dashboard Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle>Dashboard Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">
                      Dashboard Name
                    </Label>
                    <Input value={dashboard.name} disabled className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <Textarea
                      value={dashboard.description || ""}
                      disabled
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <Input
                      value={dashboard.category || "None"}
                      disabled
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(dashboard.status)}>
                        {dashboard.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {dashboard.tags && dashboard.tags.length > 0 ? (
                        dashboard.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No tags</p>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" className="mt-4">
                    Edit Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Data Source Configuration Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Source Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="dataSource">Select Data Source</Label>
                    <div className="flex gap-2 mt-1">
                      <Select
                        value={selectedDataSourceId}
                        onValueChange={setSelectedDataSourceId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a data source..." />
                        </SelectTrigger>
                        <SelectContent>
                          {dataSources.map((ds) => (
                            <SelectItem key={ds.id} value={ds.id}>
                              <div className="flex items-center gap-2">
                                <span>{ds.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {ds.type}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        onClick={() => setCreateDataSourceOpen(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        New
                      </Button>
                    </div>
                  </div>

                  {selectedDataSourceId && (
                    <>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handleEditDataSource}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button onClick={handleSaveDataSource}>
                          <Link className="mr-2 h-4 w-4" />
                          Use for this Dashboard
                        </Button>
                      </div>

                      {/* Show current data source details */}
                      {(() => {
                        const ds = dataSources.find(
                          (d) => d.id === selectedDataSourceId
                        );
                        if (!ds) return null;
                        return (
                          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                            <h4 className="font-medium">Connection Details</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">Type:</span>{" "}
                                <span className="font-medium">{ds.type}</span>
                              </div>
                              {ds.connection.host && (
                                <div>
                                  <span className="text-gray-600">Host:</span>{" "}
                                  <span className="font-medium">
                                    {ds.connection.host}
                                  </span>
                                </div>
                              )}
                              {ds.connection.database && (
                                <div>
                                  <span className="text-gray-600">
                                    Database:
                                  </span>{" "}
                                  <span className="font-medium">
                                    {ds.connection.database}
                                  </span>
                                </div>
                              )}
                              {ds.connection.port && (
                                <div>
                                  <span className="text-gray-600">Port:</span>{" "}
                                  <span className="font-medium">
                                    {ds.connection.port}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-600">Status:</span>{" "}
                                <Badge
                                  className={
                                    ds.status === "connected"
                                      ? "bg-green-100 text-green-800"
                                      : ds.status === "tested"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                  }
                                >
                                  {ds.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}

                  {dataSources.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Database className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No data sources available</p>
                      <p className="text-sm mt-1 mb-4">
                        Create a data source first to connect to your dashboard
                      </p>
                      <Button onClick={() => setCreateDataSourceOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Data Source
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Data Source Dialog */}
      <Dialog
        open={createDataSourceOpen}
        onOpenChange={setCreateDataSourceOpen}
      >
        <DialogContent className="max-w-full w-full h-full max-h-full p-0 gap-0 lg:max-w-[95vw] lg:w-[95vw] lg:max-h-[95vh] lg:p-6 overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0 p-6 pb-4 lg:p-0 lg:pb-0">
            <DialogTitle className="text-2xl lg:text-3xl font-bold">
              {editDataSourceId ? "Edit Data Source" : "Create Data Source"}
            </DialogTitle>
            <DialogDescription className="text-base lg:text-lg">
              {editDataSourceId
                ? "Update your database connection settings"
                : "Configure a new database connection for your dashboard"}
            </DialogDescription>
          </DialogHeader>

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
                      ✕
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
                            <span className="animate-spin">⚡</span> Parsing...
                          </>
                        ) : (
                          <>✨ Parse & Fill</>
                        )}
                      </span>
                    </Button>
                  </div>
                  <div className="text-xs text-gray-600 space-y-2 bg-white p-3 rounded-lg border border-gray-200">
                    <p className="font-bold text-sm text-gray-700 mb-2">
                      📝 Supported formats:
                    </p>
                    <div className="space-y-1.5 pl-1">
                      <div className="flex items-start gap-2">
                        <span className="text-purple-500 font-bold">•</span>
                        <div>
                          <span className="font-semibold text-purple-600">
                            SQL Server:
                          </span>
                          <code className="block text-xs bg-purple-50 p-1.5 rounded mt-1 break-all">
                            sqlserver://host:1433;database=db;user=sa;password=pass;schema=dbo
                          </code>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-blue-500 font-bold">•</span>
                        <div>
                          <span className="font-semibold text-blue-600">
                            MySQL:
                          </span>
                          <code className="block text-xs bg-blue-50 p-1.5 rounded mt-1 break-all">
                            mysql://user:pass@host:3306/database
                          </code>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-teal-500 font-bold">•</span>
                        <div>
                          <span className="font-semibold text-teal-600">
                            PostgreSQL:
                          </span>
                          <code className="block text-xs bg-teal-50 p-1.5 rounded mt-1 break-all">
                            postgresql://user:pass@host:5432/database
                          </code>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-green-500 font-bold">•</span>
                        <div>
                          <span className="font-semibold text-green-600">
                            MongoDB:
                          </span>
                          <code className="block text-xs bg-green-50 p-1.5 rounded mt-1 break-all">
                            mongodb://user:pass@host:27017/database
                          </code>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-red-500 font-bold">•</span>
                        <div>
                          <span className="font-semibold text-red-600">
                            Oracle:
                          </span>
                          <code className="block text-xs bg-red-50 p-1.5 rounded mt-1 break-all">
                            oracle://user:pass@host:1521/service
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="My Database"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      // Clear error when user types
                      if (formErrors.name) {
                        setFormErrors({ ...formErrors, name: undefined });
                      }
                    }}
                    className={`transition-all duration-300 ${
                      formErrors.name ? "border-red-500 animate-shake" : ""
                    } ${
                      isAnimating ? "ring-2 ring-purple-300 animate-pulse" : ""
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.name}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: DataSourceType) => {
                      setFormData({
                        ...formData,
                        type: value,
                        port: getDefaultPort(value),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mssql">SQL Server</SelectItem>
                      <SelectItem value="mysql">MySQL</SelectItem>
                      <SelectItem value="postgresql">PostgreSQL</SelectItem>
                      <SelectItem value="oracle">Oracle</SelectItem>
                      <SelectItem value="mongodb">MongoDB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="host">Host *</Label>
                  <Input
                    id="host"
                    placeholder="localhost"
                    value={formData.host}
                    onChange={(e) => {
                      setFormData({ ...formData, host: e.target.value });
                      // Clear error when user types
                      if (formErrors.host) {
                        setFormErrors({ ...formErrors, host: undefined });
                      }
                    }}
                    className={`transition-all duration-300 ${
                      formErrors.host ? "border-red-500 animate-shake" : ""
                    } ${
                      isAnimating ? "ring-2 ring-purple-300 animate-pulse" : ""
                    }`}
                  />
                  {formErrors.host && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.host}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="port">Port *</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        port: parseInt(e.target.value) || 0,
                      });
                      // Clear error when user types
                      if (formErrors.port) {
                        setFormErrors({ ...formErrors, port: undefined });
                      }
                    }}
                    className={`transition-all duration-300 ${
                      formErrors.port ? "border-red-500 animate-shake" : ""
                    } ${
                      isAnimating ? "ring-2 ring-purple-300 animate-pulse" : ""
                    }`}
                  />
                  {formErrors.port && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.port}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="database">Database *</Label>
                <Input
                  id="database"
                  placeholder="mydatabase"
                  value={formData.database}
                  onChange={(e) => {
                    setFormData({ ...formData, database: e.target.value });
                    // Clear error when user types
                    if (formErrors.database) {
                      setFormErrors({ ...formErrors, database: undefined });
                    }
                  }}
                  className={`transition-all duration-300 ${
                    formErrors.database ? "border-red-500 animate-shake" : ""
                  } ${
                    isAnimating ? "ring-2 ring-purple-300 animate-pulse" : ""
                  }`}
                />
                {formErrors.database && (
                  <p className="text-xs text-red-500 mt-1">
                    {formErrors.database}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">
                    Username *{formData.type === "mongodb" && " (required)"}
                  </Label>
                  <Input
                    id="username"
                    placeholder="dbuser"
                    value={formData.username}
                    onChange={(e) => {
                      setFormData({ ...formData, username: e.target.value });
                      // Clear error when user types
                      if (formErrors.username) {
                        setFormErrors({ ...formErrors, username: undefined });
                      }
                    }}
                    className={`transition-all duration-300 ${
                      formErrors.username ? "border-red-500 animate-shake" : ""
                    } ${
                      isAnimating ? "ring-2 ring-purple-300 animate-pulse" : ""
                    }`}
                  />
                  {formErrors.username && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.username}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="password">
                    Password *{formData.type === "mongodb" && " (required)"}
                  </Label>
                  <Input
                    id="password"
                    type="text"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      // Clear error when user types
                      if (formErrors.password) {
                        setFormErrors({ ...formErrors, password: undefined });
                      }
                    }}
                    className={`transition-all duration-300 ${
                      formErrors.password ? "border-red-500 animate-shake" : ""
                    } ${
                      isAnimating ? "ring-2 ring-purple-300 animate-pulse" : ""
                    }`}
                  />
                  {formErrors.password && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.password}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="schema">Schema (optional)</Label>
                <Input
                  id="schema"
                  placeholder="e.g., dbo, public"
                  value={formData.schema}
                  onChange={(e) => {
                    setFormData({ ...formData, schema: e.target.value });
                    // Clear error when user types
                    if (formErrors.schema) {
                      setFormErrors({ ...formErrors, schema: undefined });
                    }
                  }}
                  className={`transition-all duration-300 ${
                    formErrors.schema ? "border-red-500 animate-shake" : ""
                  } ${
                    isAnimating ? "ring-2 ring-purple-300 animate-pulse" : ""
                  }`}
                />
                {formErrors.schema && (
                  <p className="text-xs text-red-500 mt-1">
                    {formErrors.schema}
                  </p>
                )}
                {formData.type === "mssql" && !formErrors.schema && (
                  <p className="text-xs text-gray-500 mt-1">
                    Common schemas for SQL Server: dbo, public
                  </p>
                )}
                {formData.type === "postgresql" && !formErrors.schema && (
                  <p className="text-xs text-gray-500 mt-1">
                    Common schemas for PostgreSQL: public, information_schema
                  </p>
                )}
              </div>

              {/* Test Connection Section */}
              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  onClick={handleTestNewConnection}
                  disabled={testingNewConnection}
                  className="w-full"
                >
                  {testingNewConnection ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing Connection...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </Button>

                {newConnectionStatus && (
                  <div
                    className={`flex items-start gap-2 p-3 rounded-md mt-3 ${
                      newConnectionStatus.success
                        ? "bg-green-50 text-green-800"
                        : "bg-red-50 text-red-800"
                    }`}
                  >
                    {newConnectionStatus.success ? (
                      <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="font-medium">
                        {newConnectionStatus.success
                          ? "Connection Successful"
                          : "Connection Failed"}
                      </p>
                      <p className="text-sm">{newConnectionStatus.message}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Preview Panel */}
            <div className="lg:col-span-2 space-y-4 overflow-y-auto max-h-[50vh] lg:max-h-[calc(95vh-200px)]">
              <div className="lg:sticky lg:top-0">
                <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-xl p-4 lg:p-6 border-2 border-purple-200 shadow-lg">
                  <div className="flex items-center gap-2 lg:gap-3 mb-4 lg:mb-6">
                    <Database className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600" />
                    <h3 className="text-lg lg:text-xl font-bold text-purple-900">
                      Connection Preview
                    </h3>
                  </div>

                  <div className="space-y-4 bg-white rounded-lg p-5 shadow-sm">
                    <div>
                      <p className="text-sm text-gray-500 font-semibold mb-2">
                        Name
                      </p>
                      <p className="text-base font-bold text-gray-900 break-all">
                        {formData.name || (
                          <span className="text-gray-400 italic">
                            Not specified
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-500 font-semibold mb-2">
                        Type
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="bg-purple-50 text-purple-700 border-purple-300 text-base px-3 py-1"
                        >
                          {formData.type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-500 font-semibold mb-2">
                        Connection String
                      </p>
                      <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm break-all leading-relaxed">
                        {formData.host || formData.port || formData.database ? (
                          <span className="text-gray-700">
                            {formData.type === "mssql" && (
                              <>
                                sqlserver://
                                <span className="text-blue-600">
                                  {formData.host || "host"}
                                </span>
                                :
                                <span className="text-green-600">
                                  {formData.port || "port"}
                                </span>
                                ;database=
                                <span className="text-purple-600">
                                  {formData.database || "database"}
                                </span>
                                ;user=
                                <span className="text-orange-600">
                                  {formData.username || "user"}
                                </span>
                                {formData.schema && (
                                  <>
                                    ;schema=
                                    <span className="text-pink-600">
                                      {formData.schema}
                                    </span>
                                  </>
                                )}
                              </>
                            )}
                            {formData.type === "mysql" && (
                              <>
                                mysql://
                                <span className="text-orange-600">
                                  {formData.username || "user"}
                                </span>
                                :***@
                                <span className="text-blue-600">
                                  {formData.host || "host"}
                                </span>
                                :
                                <span className="text-green-600">
                                  {formData.port || "port"}
                                </span>
                                /
                                <span className="text-purple-600">
                                  {formData.database || "database"}
                                </span>
                              </>
                            )}
                            {formData.type === "postgresql" && (
                              <>
                                postgresql://
                                <span className="text-orange-600">
                                  {formData.username || "user"}
                                </span>
                                :***@
                                <span className="text-blue-600">
                                  {formData.host || "host"}
                                </span>
                                :
                                <span className="text-green-600">
                                  {formData.port || "port"}
                                </span>
                                /
                                <span className="text-purple-600">
                                  {formData.database || "database"}
                                </span>
                              </>
                            )}
                            {formData.type === "mongodb" && (
                              <>
                                mongodb://
                                <span className="text-orange-600">
                                  {formData.username || "user"}
                                </span>
                                :***@
                                <span className="text-blue-600">
                                  {formData.host || "host"}
                                </span>
                                :
                                <span className="text-green-600">
                                  {formData.port || "port"}
                                </span>
                                /
                                <span className="text-purple-600">
                                  {formData.database || "database"}
                                </span>
                              </>
                            )}
                            {formData.type === "oracle" && (
                              <>
                                oracle://
                                <span className="text-orange-600">
                                  {formData.username || "user"}
                                </span>
                                :***@
                                <span className="text-blue-600">
                                  {formData.host || "host"}
                                </span>
                                :
                                <span className="text-green-600">
                                  {formData.port || "port"}
                                </span>
                                /
                                <span className="text-purple-600">
                                  {formData.database || "service"}
                                </span>
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">
                            Fill in the form to see preview...
                          </span>
                        )}
                      </div>
                    </div>

                    {newConnectionStatus && (
                      <div className="border-t pt-4">
                        <p className="text-sm text-gray-500 font-semibold mb-3">
                          Connection Status
                        </p>
                        <div
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                            newConnectionStatus.success
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {newConnectionStatus.success ? (
                            <CheckCircle className="h-5 w-5 shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 shrink-0" />
                          )}
                          <span className="text-sm font-semibold">
                            {newConnectionStatus.success
                              ? "Connected Successfully"
                              : "Connection Failed"}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-500 font-semibold mb-3">
                        Details
                      </p>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 font-medium">
                            Host:
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formData.host || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 font-medium">
                            Port:
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formData.port || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 font-medium">
                            Database:
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formData.database || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 font-medium">
                            Username:
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formData.username || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 font-medium">
                            Password:
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formData.password ? "•••••••" : "-"}
                          </span>
                        </div>
                        {formData.schema && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 font-medium">
                              Schema:
                            </span>
                            <span className="font-semibold text-gray-900">
                              {formData.schema}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {isAnimating && (
                    <div className="mt-4 flex items-center gap-3 text-sm text-purple-600 animate-pulse bg-purple-100 px-4 py-3 rounded-lg">
                      <Zap className="h-5 w-5 animate-spin" />
                      <span className="font-semibold">
                        Auto-filling fields...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 mt-4 pt-4 lg:pt-6 border-t px-6 lg:px-0 pb-6 lg:pb-0">
            <Button
              variant="outline"
              onClick={() => {
                setCreateDataSourceOpen(false);
                resetForm();
              }}
              className="flex-1 lg:flex-none"
            >
              Cancel
            </Button>
            <div className="flex flex-col items-end gap-1 flex-1 lg:flex-none">
              <Button
                onClick={handleCreateDataSource}
                disabled={!newConnectionTested}
                className="w-full lg:w-auto"
              >
                {editDataSourceId ? "Update Data Source" : "Create Data Source"}
              </Button>
              {!newConnectionTested && (
                <p className="text-xs text-gray-500 text-center lg:text-right">
                  Test connection first to enable
                </p>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
