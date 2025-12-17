"use client";

import { useMemo } from "react";
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

interface BarConfig {
  id: string;
  yField: string;
  label?: string;
  color?: string;
}

interface BarChartWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function BarChartWidget({ widget, data }: BarChartWidgetProps) {
  const { title, dataConfig, styleConfig, tooltipConfig } = widget;
  const { xField, yField, aggregation, multiBar, bars, seriesField } =
    dataConfig || {};

  // Default color palette for multi-bar
  const defaultColors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ef4444",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#ec4899",
    "#14b8a6",
  ];

  const colors = styleConfig?.colors || defaultColors;
  const color = styleConfig?.color || colors[0];
  const showGrid = styleConfig?.showGrid !== false;
  const showLegend = styleConfig?.showLegend !== false;

  // Process data based on seriesField (pivot data) or multiBar config
  const { chartData, seriesKeys } = useMemo(() => {
    // If seriesField is specified, pivot the data
    if (seriesField && yField) {
      // Get unique series values
      const uniqueSeries = [
        ...new Set(data.data.map((row) => row[seriesField])),
      ].filter(Boolean);

      // Get unique x values
      const uniqueX = [...new Set(data.data.map((row) => row[xField]))];

      // Create pivoted data: { xField: category, series1: value1, series2: value2, ... }
      const pivotedData = uniqueX.map((xValue) => {
        const row: any = { [xField]: xValue };

        uniqueSeries.forEach((seriesValue) => {
          // Find data point for this x value and series
          const dataPoint = data.data.find(
            (d) => d[xField] === xValue && d[seriesField] === seriesValue
          );
          row[seriesValue as string] = dataPoint
            ? parseFloat(dataPoint[yField]) || 0
            : 0;
        });

        return row;
      });

      return { chartData: pivotedData, seriesKeys: uniqueSeries as string[] };
    }

    // If multiBar with bars array
    if (multiBar && bars) {
      const formatted = data.data.map((row) => {
        const formattedRow: any = {
          [xField || "name"]: row[xField] || "Unknown",
        };
        bars.forEach((bar: BarConfig) => {
          formattedRow[bar.yField] = parseFloat(row[bar.yField]) || 0;
        });
        return { ...row, ...formattedRow };
      });
      return { chartData: formatted, seriesKeys: [] };
    }

    // Single bar (default)
    const formatted = data.data.map((row) => ({
      [xField || "name"]: row[xField] || "Unknown",
      [yField || "value"]: parseFloat(row[yField]) || 0,
      ...row,
    }));
    return { chartData: formatted, seriesKeys: [] };
  }, [data.data, xField, yField, seriesField, multiBar, bars]);

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

    const rowData = props.payload[0].payload;

    // Series field tooltip (multiple bars from pivot)
    if (seriesField && seriesKeys.length > 0) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <p className="text-sm font-semibold mb-2 border-b pb-1">
            📊 {formatValue(rowData[xField || "name"])}
          </p>
          {props.payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm py-0.5">
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: entry.fill }}
              />
              <span className="text-gray-600 truncate">{entry.name}:</span>
              <span className="font-medium">฿{formatValue(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }

    // Multi-bar tooltip
    if (multiBar && bars) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold mb-2 border-b pb-1">
            📊 {formatValue(rowData[xField || "name"])}
          </p>
          {bars.map((bar: BarConfig, index: number) => (
            <div
              key={bar.id}
              className="flex items-center gap-2 text-sm py-0.5"
            >
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: bar.color || colors[index] }}
              />
              <span className="text-gray-600">{bar.label || bar.yField}:</span>
              <span className="font-medium">
                ฿{formatValue(rowData[bar.yField])}
              </span>
            </div>
          ))}
        </div>
      );
    }

    // Single bar tooltip
    if (tooltipConfig?.enabled && tooltipConfig?.format) {
      // Replace placeholders in format string
      let formatted = tooltipConfig.format;
      Object.keys(rowData).forEach((key) => {
        const value = rowData[key];
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
          {formatValue(rowData[xField || "name"])}
        </p>
        <p className="text-sm text-blue-600">
          {formatValue(rowData[yField || "value"])}
        </p>
      </div>
    );
  };

  // Render bars based on config
  const renderBars = () => {
    // Series field mode - create bar for each unique series value
    if (seriesField && seriesKeys.length > 0) {
      return seriesKeys.map((seriesValue, index) => (
        <Bar
          key={seriesValue}
          dataKey={seriesValue}
          name={seriesValue}
          fill={colors[index % colors.length]}
          radius={[4, 4, 0, 0]}
        />
      ));
    }

    // Multiple bars from bars array
    if (multiBar && bars && bars.length > 0) {
      return bars.map((bar: BarConfig, index: number) => (
        <Bar
          key={bar.id}
          dataKey={bar.yField}
          name={bar.label || bar.yField}
          fill={bar.color || colors[index % colors.length]}
          radius={[4, 4, 0, 0]}
        />
      ));
    }

    // Single bar (default)
    return (
      <Bar dataKey={yField || "value"} fill={color} radius={[4, 4, 0, 0]} />
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
            {renderBars()}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
