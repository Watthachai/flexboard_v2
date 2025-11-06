"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LineChartWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function LineChartWidget({
  widget,
  data,
}: LineChartWidgetProps) {
  const { title, dataConfig } = widget;
  const { xField, yField } = dataConfig || {};

  // Extract chart data
  const chartData = data.data.map((row) => ({
    name: row[xField] || "Unknown",
    value: parseFloat(row[yField]) || 0,
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title || "Line Chart"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm text-gray-500">
            📈 Line Chart - {chartData.length} data points
          </div>
          {chartData.slice(0, 5).map((item, index) => (
            <div
              key={index}
              className="flex justify-between text-sm border-b pb-1"
            >
              <span className="text-gray-600">{item.name}</span>
              <span className="font-medium">{item.value.toLocaleString()}</span>
            </div>
          ))}
          {chartData.length > 5 && (
            <div className="text-sm text-gray-400 italic">
              ... and {chartData.length - 5} more
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
