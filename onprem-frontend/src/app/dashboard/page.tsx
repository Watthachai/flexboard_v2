"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  LayoutDashboard,
  Info,
  RefreshCw,
  Settings,
  User,
} from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import Link from "next/link";

export default function DashboardPage() {
  // Load tenantId from localStorage on mount
  const [tenantId, setTenantId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tenantId");
    }
    return null;
  });

  const {
    activeDashboard,
    activeVersion,
    dataSource,
    loading,
    error,
    refetch,
  } = useDashboard(tenantId || undefined);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!activeDashboard) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No active dashboard found for this tenant.
            <br />
            Please contact your administrator to set up a dashboard.
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            {activeDashboard.name}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 font-mono text-xs">
              {tenantId}
            </span>
            {dataSource && (
              <span className="flex items-center gap-1">
                📊 {dataSource.name}
              </span>
            )}
            {activeVersion && (
              <span className="flex items-center gap-1">
                📌 v{activeVersion.versionNumber}
              </span>
            )}
          </div>
          {activeDashboard.description && (
            <p className="text-sm text-muted-foreground">
              {activeDashboard.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/dashboard/settings">
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
          <Link href="/dashboard/profile">
            <Button variant="outline" size="sm">
              <User className="mr-2 h-4 w-4" />
              Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Dashboard Content */}
      {activeVersion?.config?.widgets &&
      activeVersion.config.widgets.length > 0 ? (
        <div className="space-y-6">
          {/* Widgets Grid */}
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${
                activeVersion.config.gridCols || 12
              }, minmax(0, 1fr))`,
            }}
          >
            {activeVersion.config.widgets
              .filter((widget: any) => widget.visible !== false)
              .map((widget: any) => (
                <Card
                  key={widget.id}
                  style={{
                    gridColumn: `span ${widget.position.w} / span ${widget.position.w}`,
                    gridRow: `span ${widget.position.h} / span ${widget.position.h}`,
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <LayoutDashboard className="h-4 w-4" />
                      {widget.title}
                    </CardTitle>
                    {widget.description && (
                      <p className="text-sm text-muted-foreground">
                        {widget.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {/* TODO: Render actual widget based on type */}
                    <div className="flex h-48 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <div className="text-center">
                        <p className="font-semibold">
                          {widget.type.toUpperCase()}
                        </p>
                        <p className="text-xs mt-1">
                          {widget.dataConfig?.table || "No data source"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <LayoutDashboard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No Widgets Configured
            </h3>
            <p className="text-muted-foreground mb-4">
              This dashboard doesn&apos;t have any widgets yet.
            </p>
            <Button variant="outline" onClick={refetch}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
