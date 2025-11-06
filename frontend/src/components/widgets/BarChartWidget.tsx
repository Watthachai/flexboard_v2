"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BarChartWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function BarChartWidget({ widget, data }: BarChartWidgetProps) {
  const { title, dataConfig, styleConfig } = widget;
  const { xField, yField } = dataConfig || {};

  // Extract chart data
  const chartData = data.data.map((row) => ({
    name: row[xField] || "Unknown",
    value: parseFloat(row[yField]) || 0,
  }));

  // Simple bar chart using CSS
  const maxValue = Math.max(...chartData.map((d) => d.value));
  const colors = styleConfig?.colors || [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title || "Bar Chart"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {chartData.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{item.name}</span>
                <span className="font-medium">
                  {item.value.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: colors[index % colors.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
