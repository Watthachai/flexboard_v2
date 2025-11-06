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

interface DoughnutChartWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function DoughnutChartWidget({
  widget,
  data,
}: DoughnutChartWidgetProps) {
  const { title, dataConfig, styleConfig } = widget;
  const { xField, yField, aggregation } = dataConfig || {};

  // Extract and format chart data
  const chartData = data.data.map((row) => ({
    name: row[xField] || "Unknown",
    value: parseFloat(row[yField]) || 0,
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title || "Doughnut Chart"}</CardTitle>
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
              innerRadius={50}
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
            <Tooltip />
            {showLegend && <Legend />}
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
