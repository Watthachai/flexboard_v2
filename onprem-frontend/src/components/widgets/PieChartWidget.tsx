"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PieChartWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function PieChartWidget({ widget, data }: PieChartWidgetProps) {
  const { title, dataConfig, styleConfig, tooltipConfig } = widget;
  const { xField, yField, labelField, valueField, aggregation } =
    dataConfig || {};

  // Determine which fields to use
  const nameField = labelField || xField;
  const dataField = valueField || yField;

  // Extract and format chart data
  const chartData = data.data.map((row) => ({
    name: row[nameField] || "Unknown",
    value: parseFloat(row[dataField]) || 0,
    ...row, // Keep original data for tooltip formatting
  }));

  const colors = styleConfig?.colors || [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#84cc16",
  ];
  const showLegend = styleConfig?.showLegend !== false;

  // Custom tooltip content
  const renderTooltip = (props: any) => {
    if (!props.active || !props.payload || !props.payload.length) return null;

    const data = props.payload[0].payload;

    if (tooltipConfig?.enabled && tooltipConfig?.format) {
      // Replace placeholders in format string
      let formatted = tooltipConfig.format;
      Object.keys(data).forEach((key) => {
        const value = data[key];
        formatted = formatted.replace(
          `{${key}}`,
          typeof value === "number" ? value.toLocaleString() : value
        );
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
        <p className="text-sm font-semibold">{data.name}</p>
        <p className="text-sm text-blue-600">{data.value?.toLocaleString()}</p>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title || "Pie Chart"}</CardTitle>
        {aggregation && (
          <p className="text-xs text-gray-500">Aggregation: {aggregation}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 pt-2">
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: any) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip content={renderTooltip} />
            {showLegend && <Legend />}
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
