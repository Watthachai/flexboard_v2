"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LayoutDashboard, Info } from "lucide-react";

interface DashboardConfig {
  tenantId: string;
  name: string;
  dashboards?: any[];
}

export default function DashboardPage() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = () => {
      try {
        const tenantId = localStorage.getItem("tenantId");
        const storedConfig = localStorage.getItem("dashboardConfig");

        if (storedConfig) {
          const parsedConfig = JSON.parse(storedConfig);
          setConfig(parsedConfig);
        } else if (tenantId) {
          // Create basic config if only tenantId exists
          setConfig({
            tenantId: tenantId,
            name: "Dashboard",
            dashboards: [],
          });
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>No configuration found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
          {config.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Tenant ID:{" "}
          <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 font-mono text-xs">
            {config.tenantId}
          </span>
        </p>
      </div>

      {/* Dashboard Content */}
      {config.dashboards && config.dashboards.length > 0 ? (
        <div className="space-y-6">
          {config.dashboards.map((dashboard: any) => (
            <Card key={dashboard.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5" />
                  {dashboard.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Widgets Grid */}
                <div
                  className={`grid gap-4 ${
                    dashboard.layout === "grid"
                      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-1"
                  }`}
                >
                  {dashboard.widgets?.map((widget: any) => (
                    <Card key={widget.id}>
                      <CardHeader>
                        <CardTitle className="text-base">
                          {widget.type}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex items-center justify-center bg-muted rounded-md">
                          <p className="text-sm text-muted-foreground">
                            Widget: {widget.id}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex min-h-[400px] flex-col items-center justify-center text-center">
            <LayoutDashboard className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              No dashboards configured yet
            </h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create your first dashboard to get started
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
