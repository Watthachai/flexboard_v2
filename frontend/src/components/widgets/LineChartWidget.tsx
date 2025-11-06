"use client";

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

interface LineChartWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function LineChartWidget({
  widget,
  data,
}: LineChartWidgetProps) {
  const { title, dataConfig, styleConfig } = widget;
  const { xField, yField, aggregation } = dataConfig || {};

  // Extract and format chart data
  const chartData = data.data.map((row) => ({
    [xField || "name"]: row[xField] || "Unknown",
    [yField || "value"]: parseFloat(row[yField]) || 0,
  }));

  const colors = styleConfig?.colors || ["#3b82f6"];
  const color = styleConfig?.color || colors[0];
  const showGrid = styleConfig?.showGrid !== false;
  const showLegend = styleConfig?.showLegend !== false;

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
          <LineChart data={chartData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis
              dataKey={xField || "name"}
              angle={-45}
              textAnchor="end"
              height={80}
              style={{ fontSize: "12px" }}
            />
            <YAxis style={{ fontSize: "12px" }} />
            <Tooltip />
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey={yField || "value"}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
