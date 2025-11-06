"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface BarChartWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function BarChartWidget({ widget, data }: BarChartWidgetProps) {
  const { title, dataConfig, styleConfig, tooltipConfig } = widget;
  const { xField, yField, aggregation } = dataConfig || {};

  // Extract and format chart data
  const chartData = data.data.map((row) => ({
    [xField || "name"]: row[xField] || "Unknown",
    [yField || "value"]: parseFloat(row[yField]) || 0,
    ...row, // Keep original data for tooltip formatting
  }));

  const colors = styleConfig?.colors || ["#3b82f6"];
  const color = styleConfig?.color || colors[0];
  const showGrid = styleConfig?.showGrid !== false;
  const showLegend = styleConfig?.showLegend !== false;

  // Format value helper
  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "";

    // Check if it's a date string
    if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        const date = new Date(value);
        return date.toLocaleDateString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch {
        return value;
      }
    }

    // Format numbers
    if (typeof value === "number") {
      return value.toLocaleString();
    }

    return value;
  };

  // Custom tooltip content
  const renderTooltip = (props: any) => {
    if (!props.active || !props.payload || !props.payload.length) return null;

    const data = props.payload[0].payload;

    if (tooltipConfig?.enabled && tooltipConfig?.format) {
      // Replace placeholders in format string
      let formatted = tooltipConfig.format;
      Object.keys(data).forEach((key) => {
        const value = data[key];
        formatted = formatted.replace(`{${key}}`, formatValue(value));
      });

      return (
        <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
          <p className="text-sm">{formatted}</p>
        </div>
      );
    }

    // Default tooltip
    return (
      <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
        <p className="text-sm font-semibold">
          {formatValue(data[xField || "name"])}
        </p>
        <p className="text-sm text-blue-600">
          {formatValue(data[yField || "value"])}
        </p>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title || "Bar Chart"}</CardTitle>
        {aggregation && (
          <p className="text-xs text-gray-500">Aggregation: {aggregation}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 pt-2">
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          <BarChart data={chartData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis
              dataKey={xField || "name"}
              angle={-45}
              textAnchor="end"
              height={80}
              style={{ fontSize: "12px" }}
              tickFormatter={(value) => formatValue(value)}
            />
            <YAxis style={{ fontSize: "12px" }} />
            <Tooltip content={renderTooltip} />
            {showLegend && <Legend />}
            <Bar dataKey={yField || "value"} fill={color} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
