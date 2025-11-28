"use client";

import { useMemo, useState, useEffect } from "react";
import WidgetRenderer from "@/components/widgets/WidgetRenderer";
import GlobalFilters, {
  GlobalFilter,
  GlobalFilterValues,
} from "@/components/GlobalFilters";

interface DashboardRendererProps {
  config: any;
  tenantId?: string;
  dataSourceId?: string;
  onFetchDynamicOptions?: (field: string, table: string) => Promise<string[]>;
}

export function DashboardRenderer({
  config,
  tenantId,
  dataSourceId,
  onFetchDynamicOptions,
}: DashboardRendererProps) {
  const [globalFilterValues, setGlobalFilterValues] =
    useState<GlobalFilterValues>({});
  const [dynamicFilterOptions, setDynamicFilterOptions] = useState<{
    [field: string]: string[];
  }>({});

  const widgets = useMemo(() => {
    if (!config || !config.widgets) {
      return [];
    }
    return config.widgets;
  }, [config]);

  const filters = useMemo(() => {
    return config?.filters || [];
  }, [config]);

  const gridCols = config?.gridCols || 12;

  // Fetch dynamic options for filters
  useEffect(() => {
    const fetchDynamicOptions = async () => {
      if (!filters || !onFetchDynamicOptions) return;

      const dynamicFilters = filters.filter(
        (f: GlobalFilter) => f.options === "dynamic"
      );

      if (dynamicFilters.length === 0) return;

      const table = widgets[0]?.dataConfig?.table || "mock";

      const promises = dynamicFilters.map(async (filter: GlobalFilter) => {
        try {
          const values = await onFetchDynamicOptions(filter.field, table);
          return { field: filter.field, values };
        } catch (error) {
          console.error(`Error fetching options for ${filter.field}:`, error);
          return { field: filter.field, values: [] };
        }
      });

      const results = await Promise.all(promises);
      const newOptions: { [field: string]: string[] } = {};
      results.forEach(({ field, values }) => {
        newOptions[field] = values;
      });
      setDynamicFilterOptions(newOptions);
    };

    fetchDynamicOptions();
  }, [filters, widgets, onFetchDynamicOptions]);

  // Build filter conditions for widgets
  const buildFilterConditions = useMemo(() => {
    return filters.flatMap((filter: GlobalFilter) => {
      const value = globalFilterValues[filter.id];
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        value === "__ALL__"
      ) {
        return [];
      }

      if (filter.type === "dateRange") {
        const conditions = [];
        if (value.start) {
          conditions.push({
            field: filter.field,
            operator: ">=",
            value: value.start,
          });
        }
        if (value.end) {
          conditions.push({
            field: filter.field,
            operator: "<=",
            value: value.end,
          });
        }
        return conditions;
      }

      if (filter.type === "multiSelect") {
        if (Array.isArray(value) && value.length > 0) {
          return [
            {
              field: filter.field,
              operator: "IN",
              value: value,
            },
          ];
        }
        return [];
      }

      if (filter.type === "text") {
        return [
          {
            field: filter.field,
            operator: "LIKE",
            value: value,
          },
        ];
      }

      return [
        {
          field: filter.field,
          operator: "=",
          value: value,
        },
      ];
    });
  }, [filters, globalFilterValues]);

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
      {/* Global Filters */}
      {filters.length > 0 && (
        <div className="px-6 pt-6">
          <GlobalFilters
            filters={filters}
            values={globalFilterValues}
            onChange={setGlobalFilterValues}
            dynamicOptions={dynamicFilterOptions}
            onReset={() => setGlobalFilterValues({})}
          />
        </div>
      )}

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
                  globalFilters={buildFilterConditions}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}
