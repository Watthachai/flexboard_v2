"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database, Plus, Pencil, Link, Table } from "lucide-react";

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  category?: string;
  status: string;
  tags?: string[];
  dataSourceId?: string;
  selectedTable?: string;
}

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: string;
  connection: {
    host?: string;
    port?: number;
    database?: string;
    [key: string]: any;
  };
}

interface SettingsTabProps {
  dashboard: Dashboard;
  dataSources: DataSource[];
  selectedDataSourceId: string;
  setSelectedDataSourceId: (id: string) => void;
  onCreateDataSource: () => void;
  onEditDataSource: () => void;
  onSaveDataSource: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "draft":
      return "bg-yellow-100 text-yellow-800";
    case "active":
      return "bg-green-100 text-green-800";
    case "archived":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-blue-100 text-blue-800";
  }
};

export function SettingsTab({
  dashboard,
  dataSources,
  selectedDataSourceId,
  setSelectedDataSourceId,
  onCreateDataSource,
  onEditDataSource,
  onSaveDataSource,
}: SettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Dashboard Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Dashboard Name</Label>
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
                <Button variant="outline" onClick={onCreateDataSource}>
                  <Plus className="mr-2 h-4 w-4" />
                  New
                </Button>
              </div>
            </div>

            {selectedDataSourceId && (
              <>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onEditDataSource}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button onClick={onSaveDataSource}>
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
                            <span className="text-gray-600">Database:</span>{" "}
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

                {/* Show selected table info if exists */}
                {dashboard.dataSourceId && dashboard.selectedTable && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                    <h4 className="font-medium text-blue-900 flex items-center gap-2">
                      <Table className="h-4 w-4" />
                      Selected Table
                    </h4>
                    <div className="text-sm">
                      <span className="text-blue-700">Table Name:</span>{" "}
                      <span className="font-mono font-semibold text-blue-900">
                        {dashboard.selectedTable}
                      </span>
                    </div>
                    <p className="text-xs text-blue-700">
                      💡 To change the table, click &quot;Edit&quot; to open the
                      Data Source dialog and select a different table.
                    </p>
                  </div>
                )}

                {/* Show warning if no table selected */}
                {dashboard.dataSourceId && !dashboard.selectedTable && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <h4 className="font-medium text-amber-900 flex items-center gap-2">
                      <Table className="h-4 w-4" />
                      No Table Selected
                    </h4>
                    <p className="text-sm text-amber-700">
                      You need to select a table to design your dashboard.
                    </p>
                    <p className="text-xs text-amber-600">
                      💡 Click &quot;Edit&quot; button above to select a table
                      from your data source.
                    </p>
                  </div>
                )}
              </>
            )}

            {dataSources.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No data sources available</p>
                <p className="text-sm mt-1 mb-4">
                  Create a data source first to connect to your dashboard
                </p>
                <Button onClick={onCreateDataSource}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Data Source
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
