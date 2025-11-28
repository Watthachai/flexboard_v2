"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface LineConfig {
  id: string;
  yField: string;
  label?: string;
  color?: string;
  strokeWidth?: number;
  showDot?: boolean;
  dotSize?: number;
  activeDotSize?: number;
}

interface LineChartWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function LineChartWidget({
  widget,
  data,
}: LineChartWidgetProps) {
  const { title, dataConfig, styleConfig, tooltipConfig } = widget;
  const { xField, yField, aggregation, multiLine, lines, seriesField } =
    dataConfig || {};

  // Default color palette for multi-line
  const defaultColors = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#0088FE",
    "#3b82f6",
    "#10b981",
  ];

  const colors =
    styleConfig?.colors || styleConfig?.colorPalette || defaultColors;
  const color = styleConfig?.color || colors[0];
  const showGrid = styleConfig?.showGrid !== false;
  const showLegend = styleConfig?.showLegend !== false;
  const lineType = styleConfig?.lineType || "monotone";

  // Process data based on seriesField (pivot data) or multiLine config
  const { chartData, seriesKeys } = useMemo(() => {
    // If seriesField is specified, pivot the data
    if (seriesField && yField) {
      // Get unique series values (e.g., unique branches)
      const uniqueSeries = [
        ...new Set(data.data.map((row) => row[seriesField])),
      ].filter(Boolean);

      // Get unique x values (e.g., unique dates)
      const uniqueX = [...new Set(data.data.map((row) => row[xField]))];

      // Create pivoted data: { xField: date, series1: value1, series2: value2, ... }
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

    // If multiLine with lines array
    if (multiLine && lines) {
      const formatted = data.data.map((row) => {
        const formattedRow: any = {
          [xField || "name"]: row[xField] || "Unknown",
        };
        lines.forEach((line: LineConfig) => {
          formattedRow[line.yField] = parseFloat(row[line.yField]) || 0;
        });
        return { ...row, ...formattedRow };
      });
      return { chartData: formatted, seriesKeys: [] };
    }

    // Single line
    const formatted = data.data.map((row) => ({
      [xField || "name"]: row[xField] || "Unknown",
      [yField || "value"]: parseFloat(row[yField]) || 0,
      ...row,
    }));
    return { chartData: formatted, seriesKeys: [] };
  }, [data.data, xField, yField, seriesField, multiLine, lines]);

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

  // Custom tooltip content for multi-line
  const renderTooltip = (props: any) => {
    if (!props.active || !props.payload || !props.payload.length) return null;

    const rowData = props.payload[0].payload;

    // Series field tooltip (multiple lines from pivot)
    if (seriesField && seriesKeys.length > 0) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <p className="text-sm font-semibold mb-2 border-b pb-1">
            📅 {formatValue(rowData[xField || "name"])}
          </p>
          {props.payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm py-0.5">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: entry.stroke }}
              />
              <span className="text-gray-600 truncate">{entry.name}:</span>
              <span className="font-medium">฿{formatValue(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }

    // Multi-line tooltip
    if (multiLine && lines) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold mb-2 border-b pb-1">
            📅 {formatValue(rowData[xField || "name"])}
          </p>
          {lines.map((line: LineConfig, index: number) => (
            <div
              key={line.id}
              className="flex items-center gap-2 text-sm py-0.5"
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: line.color || colors[index] }}
              />
              <span className="text-gray-600">
                {line.label || line.yField}:
              </span>
              <span className="font-medium">
                ฿{formatValue(rowData[line.yField])}
              </span>
            </div>
          ))}
        </div>
      );
    }

    // Single line tooltip
    if (tooltipConfig?.enabled && tooltipConfig?.format) {
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

  // Render lines based on config
  const renderLines = () => {
    // Series field mode - create line for each unique series value
    if (seriesField && seriesKeys.length > 0) {
      return seriesKeys.map((seriesValue, index) => (
        <Line
          key={seriesValue}
          type={lineType}
          dataKey={seriesValue}
          name={seriesValue}
          stroke={colors[index % colors.length]}
          strokeWidth={styleConfig?.lineWidth || 2}
          dot={
            styleConfig?.showPoints !== false
              ? {
                  fill: colors[index % colors.length],
                  r: styleConfig?.pointSize || 3,
                }
              : false
          }
          activeDot={{ r: styleConfig?.pointHoverSize || 6 }}
          connectNulls
        />
      ));
    }

    if (multiLine && lines && lines.length > 0) {
      // Multiple lines from lines array
      return lines.map((line: LineConfig, index: number) => (
        <Line
          key={line.id}
          type={lineType}
          dataKey={line.yField}
          name={line.label || line.yField}
          stroke={line.color || colors[index % colors.length]}
          strokeWidth={line.strokeWidth || styleConfig?.lineWidth || 2}
          dot={
            line.showDot !== false
              ? {
                  fill: line.color || colors[index % colors.length],
                  r: line.dotSize || 4,
                }
              : false
          }
          activeDot={
            line.showDot !== false
              ? {
                  r: line.activeDotSize || 8,
                }
              : false
          }
        />
      ));
    }

    // Single line (default)
    return (
      <Line
        type={lineType}
        dataKey={yField || "value"}
        stroke={color}
        strokeWidth={styleConfig?.lineWidth || 2}
        dot={{ fill: color, r: styleConfig?.pointSize || 4 }}
        activeDot={{ r: styleConfig?.pointHoverSize || 8 }}
      />
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title || "Line Chart"}</CardTitle>
        {aggregation && (
          <p className="text-xs text-gray-500">Aggregation: {aggregation}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 pt-2">
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            )}
            <XAxis
              dataKey={xField || "name"}
              angle={-45}
              textAnchor="end"
              height={80}
              style={{ fontSize: "12px" }}
              tickFormatter={(value) => formatValue(value)}
            />
            <YAxis
              style={{ fontSize: "12px" }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={renderTooltip} />
            {showLegend && <Legend />}
            {renderLines()}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
