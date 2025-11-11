"use client";

import { useMemo } from "react";
import WidgetRenderer from "@/components/widgets/WidgetRenderer";

interface DashboardRendererProps {
  config: any;
  tenantId?: string;
  dataSourceId?: string;
}

export function DashboardRenderer({
  config,
  tenantId,
  dataSourceId,
}: DashboardRendererProps) {
  const widgets = useMemo(() => {
    if (!config || !config.widgets) {
      return [];
    }
    return config.widgets;
  }, [config]);

  const gridCols = config?.gridCols || 12;

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">ไม่มีข้อมูล Dashboard</p>
      </div>
    );
  }

  if (widgets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-muted-foreground">Dashboard นี้ยังไม่มี Widget</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <div
        className="grid gap-4 p-6"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
        }}
      >
        {widgets
          .filter((widget: any) => widget.visible !== false)
          .map((widget: any) => {
            const { id, position } = widget;
            const { w, h } = position;

            return (
              <div
                key={id}
                className="min-h-[400px]"
                style={{
                  gridColumn: `span ${w} / span ${w}`,
                  gridRow: `span ${h} / span ${h}`,
                  minHeight: `${(h || 4) * 100}px`,
                }}
              >
                <WidgetRenderer
                  widget={widget}
                  tenantId={tenantId || ""}
                  dataSourceId={dataSourceId || ""}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}
