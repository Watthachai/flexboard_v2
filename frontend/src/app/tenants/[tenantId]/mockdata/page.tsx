"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Database,
  MoreVertical,
  Eye,
  Trash2,
  FileJson,
  FileCode,
  Table,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  getMockData,
  uploadMockData,
  deleteMockData,
  previewMockData,
} from "@/lib/api";

interface MockDataset {
  id: string;
  name: string;
  description?: string;
  tableName: string;
  rowCount: number;
  columns: string[];
  fileType: "sql" | "json";
  createdAt: string;
  updatedAt: string;
}

interface PreviewData {
  columns: string[];
  rows: any[];
  totalRows: number;
}

export default function MockDataPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [datasets, setDatasets] = useState<MockDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<MockDataset | null>(
    null
  );
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [uploading, setUploading] = useState(false);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: "",
    description: "",
    file: null as File | null,
    fileContent: "",
  });

  useEffect(() => {
    loadMockData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const loadMockData = async () => {
    try {
      setLoading(true);
      const data = await getMockData(tenantId);
      setDatasets(data);
    } catch (error: any) {
      console.error("Error loading mock data:", error);
      toast.error("Failed to load mock datasets");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "sql" && ext !== "json") {
      toast.error("Only SQL and JSON files are supported");
      return;
    }

    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadForm((prev) => ({
        ...prev,
        file,
        fileContent: content,
        name: prev.name || file.name.replace(/\.(sql|json)$/, ""),
      }));
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.fileContent) {
      toast.error("Please select a file");
      return;
    }

    if (!uploadForm.name.trim()) {
      toast.error("Please enter a dataset name");
      return;
    }

    try {
      setUploading(true);
      const ext = uploadForm.file.name.split(".").pop()?.toLowerCase();

      await uploadMockData(tenantId, {
        name: uploadForm.name,
        description: uploadForm.description,
        fileType: ext as "sql" | "json",
        content: uploadForm.fileContent,
      });

      toast.success("Mock data uploaded successfully");
      setUploadDialogOpen(false);
      setUploadForm({ name: "", description: "", file: null, fileContent: "" });
      loadMockData();
    } catch (error: any) {
      console.error("Error uploading mock data:", error);
      toast.error(error.message || "Failed to upload mock data");
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (dataset: MockDataset) => {
    try {
      setSelectedDataset(dataset);
      setPreviewDialogOpen(true);

      const data = await previewMockData(tenantId, dataset.id, 10);
      setPreviewData(data);
    } catch (error: any) {
      console.error("Error previewing mock data:", error);
      toast.error("Failed to preview mock data");
      setPreviewDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDataset) return;

    try {
      await deleteMockData(tenantId, selectedDataset.id);
      toast.success("Mock dataset deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedDataset(null);
      loadMockData();
    } catch (error: any) {
      console.error("Error deleting mock data:", error);
      toast.error("Failed to delete mock dataset");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading mock datasets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mock Data Management</h1>
          <p className="text-muted-foreground mt-2">
            Upload and manage mock datasets for dashboard design and demos
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Mock Data
        </Button>
      </div>

      {datasets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Mock Datasets Yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Upload SQL or JSON files to create mock datasets for dashboard
              design and demonstrations
            </p>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Your First Dataset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {datasets.map((dataset) => (
            <Card
              key={dataset.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold">
                    {dataset.name}
                  </CardTitle>
                  {dataset.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {dataset.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handlePreview(dataset)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview Data
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedDataset(dataset);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Table Name
                    </span>
                    <Badge variant="secondary" className="font-mono">
                      {dataset.tableName}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      File Type
                    </span>
                    <Badge variant="outline">
                      {dataset.fileType === "sql" ? (
                        <FileCode className="mr-1 h-3 w-3" />
                      ) : (
                        <FileJson className="mr-1 h-3 w-3" />
                      )}
                      {dataset.fileType.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rows</span>
                    <Badge variant="secondary">
                      <Table className="mr-1 h-3 w-3" />
                      {dataset.rowCount.toLocaleString()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Columns
                    </span>
                    <span className="text-sm font-medium">
                      {dataset.columns.length}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(dataset.createdAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Mock Data</DialogTitle>
            <DialogDescription>
              Upload SQL INSERT statements or JSON array to create a mock
              dataset
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Dataset Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Sample Inventory Data"
                value={uploadForm.name}
                onChange={(e) =>
                  setUploadForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description for this dataset..."
                value={uploadForm.description}
                onChange={(e) =>
                  setUploadForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File (SQL or JSON) *</Label>
              <Input
                id="file"
                type="file"
                accept=".sql,.json"
                onChange={handleFileSelect}
              />
              {uploadForm.file && (
                <p className="text-sm text-muted-foreground">
                  Selected: {uploadForm.file.name} (
                  {(uploadForm.file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            {uploadForm.fileContent && (
              <div className="space-y-2">
                <Label>File Preview</Label>
                <div className="bg-muted p-4 rounded-md max-h-40 overflow-auto">
                  <pre className="text-xs">
                    {uploadForm.fileContent.slice(0, 500)}
                    {uploadForm.fileContent.length > 500 && "..."}
                  </pre>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setUploadForm({
                  name: "",
                  description: "",
                  file: null,
                  fileContent: "",
                });
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !uploadForm.file}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedDataset?.name} - Preview</DialogTitle>
            <DialogDescription>
              Showing first 10 rows of{" "}
              {selectedDataset?.rowCount.toLocaleString()} total rows
            </DialogDescription>
          </DialogHeader>
          {previewData && (
            <div className="overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {previewData.columns.map((col) => (
                      <th
                        key={col}
                        className="px-4 py-2 text-left font-semibold"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/30">
                      {previewData.columns.map((col) => (
                        <td key={col} className="px-4 py-2">
                          {row[col] !== null && row[col] !== undefined
                            ? String(row[col])
                            : "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mock Dataset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{selectedDataset?.name}
              &rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
