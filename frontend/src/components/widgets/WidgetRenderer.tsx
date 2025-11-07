"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { executeDataSourceQuery } from "@/lib/api";
import { Loader2 } from "lucide-react";

// Import chart components
import BarChartWidget from "./BarChartWidget";
import LineChartWidget from "./LineChartWidget";
import AreaChartWidget from "./AreaChartWidget";
import PieChartWidget from "./PieChartWidget";
import DoughnutChartWidget from "./DoughnutChartWidget";
import TableWidget from "./TableWidget";
import KPIWidget from "./KPIWidget";
import GaugeWidget from "./GaugeWidget";
import ProgressBarWidget from "./ProgressBarWidget";
import MetricCardWidget from "./MetricCardWidget";
import ScatterPlotWidget from "./ScatterPlotWidget";

interface WidgetRendererProps {
  widget: any;
  tenantId: string;
  dataSourceId: string;
}

export default function WidgetRenderer({
  widget,
  tenantId,
  dataSourceId,
}: WidgetRendererProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      //console.log("WidgetRenderer Debug:", {
      //widgetId: widget.id,
      //widgetTitle: widget.title,
      //hasDataSourceId: !!dataSourceId,
      //dataSourceId,
      //hasDataConfig: !!widget.dataConfig,
      //dataConfig: widget.dataConfig,
      //hasQuery: !!widget.dataConfig?.query,
      //query: widget.dataConfig?.query,
      //hasTable: !!widget.dataConfig?.table,
      //table: widget.dataConfig?.table,
      //});

      if (!dataSourceId || !widget.dataConfig) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Build query from dataConfig
        let query = "";

        if (widget.dataConfig.query) {
          // Use custom query if provided
          query = widget.dataConfig.query;
        } else if (widget.dataConfig.table) {
          // Build query from table and fields
          const { xField, yField, aggregation, groupBy, orderBy, table } =
            widget.dataConfig;

          const selectFields = [];

          // Add xField (grouping field)
          if (xField) {
            selectFields.push(xField);
          }

          // Add yField with aggregation if specified
          if (yField) {
            if (aggregation && groupBy && groupBy.length > 0) {
              // Use aggregate function when grouping
              selectFields.push(
                `${aggregation.toUpperCase()}(${yField}) as ${yField}`
              );
            } else {
              selectFields.push(yField);
            }
          }

          const selectClause =
            selectFields.length > 0 ? selectFields.join(", ") : "*";
          query = `SELECT ${selectClause} FROM ${table}`;

          // Add GROUP BY if specified
          if (groupBy && groupBy.length > 0) {
            query += ` GROUP BY ${groupBy.join(", ")}`;
          }

          // Add ORDER BY if specified
          if (orderBy && orderBy.length > 0) {
            const orderClauses = orderBy.map(
              (order: any) => `${order.field} ${order.direction || "ASC"}`
            );
            query += ` ORDER BY ${orderClauses.join(", ")}`;
          }
        } else {
          setLoading(false);
          setError("No query or table specified in dataConfig");
          return;
        }

        const result = await executeDataSourceQuery(
          tenantId,
          dataSourceId,
          query,
          widget.dataConfig.limit
        );

        //console.log("Query Result:", {
        //widgetId: widget.id,
        //widgetTitle: widget.title,
        //query,
        //resultData: result.data || result,
        //resultColumns: result.columns,
        //dataConfig: widget.dataConfig,
        //});

        setData({ data: result.data || result, columns: result.columns });
      } catch (err: any) {
        console.error("Failed to fetch widget data:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tenantId, dataSourceId, widget.id, widget.dataConfig]);

  // Loading state
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{widget.title || "Widget"}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="h-full border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">
            {widget.title || "Widget"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center text-red-500">
            <p className="font-medium">Error loading data</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data
  if (!data || !data.data || data.data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{widget.title || "Widget"}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-gray-400">No data available</p>
        </CardContent>
      </Card>
    );
  }

  // Render widget based on type
  const renderWidget = () => {
    switch (widget.type) {
      case "bar":
        return <BarChartWidget widget={widget} data={data} />;
      case "line":
        return <LineChartWidget widget={widget} data={data} />;
      case "area":
        return <AreaChartWidget widget={widget} data={data} />;
      case "pie":
        return <PieChartWidget widget={widget} data={data} />;
      case "doughnut":
      case "donut": // Alias for doughnut
        return <DoughnutChartWidget widget={widget} data={data} />;
      case "table":
        return <TableWidget widget={widget} data={data} />;
      case "kpi":
        return <KPIWidget widget={widget} data={data} />;
      case "gauge":
        return <GaugeWidget widget={widget} data={data} />;
      case "progress":
      case "progressbar":
        return <ProgressBarWidget widget={widget} data={data} />;
      case "metric":
      case "metriccard":
        return <MetricCardWidget widget={widget} data={data} />;
      case "scatter":
      case "scatterplot":
        return <ScatterPlotWidget widget={widget} data={data} />;
      default:
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{widget.title || "Widget"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Unsupported widget type: {widget.type}
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return renderWidget();
}
