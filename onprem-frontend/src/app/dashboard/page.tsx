"use client";

import { useDashboard } from "@/hooks/useDashboard";
import { DashboardRenderer } from "@/components/DashboardRenderer";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  // Get tenantId from localStorage
  const tenantId =
    typeof window !== "undefined" ? localStorage.getItem("tenantId") : null;

  const {
    dashboards,
    activeDashboardId,
    activeDashboard,
    activeVersion,
    dataSource,
    loading,
    error,
    switchDashboard,
  } = useDashboard(tenantId || undefined);

  // Parse config from activeVersion
  const config = activeVersion?.config
    ? typeof activeVersion.config === "string"
      ? JSON.parse(activeVersion.config)
      : activeVersion.config
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">กำลังโหลด Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">
            ไม่สามารถโหลด Dashboard ได้
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  if (dashboards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-muted-foreground text-4xl mb-4">📊</div>
          <h2 className="text-xl font-semibold mb-2">ไม่พบ Dashboard</h2>
          <p className="text-muted-foreground">
            ไม่มี Dashboard ที่เปิดใช้งานสำหรับ API Key นี้
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Chrome-style Tabs - Show only if multiple dashboards */}
      {dashboards.length > 1 && (
        <div className="bg-gray-100 dark:bg-gray-900 border-b">
          <div className="flex items-end overflow-x-auto scrollbar-hide px-2 pt-2">
            {dashboards.map((dashboard) => {
              const isActive = dashboard.id === activeDashboardId;
              return (
                <button
                  key={dashboard.id}
                  onClick={() => switchDashboard(dashboard.id)}
                  className={cn(
                    "group relative flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-all min-w-[180px] max-w-60",
                    isActive
                      ? "bg-white dark:bg-gray-950 text-foreground shadow-sm"
                      : "bg-gray-200 dark:bg-gray-800 text-muted-foreground hover:bg-gray-300 dark:hover:bg-gray-700"
                  )}
                  style={{
                    marginRight: "-8px",
                    zIndex: isActive ? 10 : 1,
                  }}
                >
                  {/* Tab Icon */}
                  <span className="text-lg shrink-0">📊</span>

                  {/* Tab Title */}
                  <span className="flex-1 truncate text-left text-sm font-medium">
                    {dashboard.name}
                  </span>

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto">
        {activeDashboard && config ? (
          <DashboardRenderer
            key={activeDashboard.id}
            config={config}
            tenantId={tenantId || ""}
            dataSourceId={activeDashboard.dataSourceId || dataSource?.id || ""}
          />
        ) : activeDashboard && !config ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="text-muted-foreground text-4xl mb-4">📊</div>
              <h2 className="text-xl font-semibold mb-2">
                ไม่มีข้อมูล Dashboard
              </h2>
              <p className="text-muted-foreground">
                Dashboard นี้ยังไม่มี config หรือ widgets
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">เลือก Dashboard เพื่อแสดงผล</p>
          </div>
        )}
      </div>
    </div>
  );
}
