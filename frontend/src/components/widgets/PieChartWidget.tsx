"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PieChartWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function PieChartWidget({ widget, data }: PieChartWidgetProps) {
  const { title, dataConfig, styleConfig } = widget;
  const { xField, yField } = dataConfig || {};

  // Extract chart data
  const chartData = data.data.map((row) => ({
    name: row[xField] || "Unknown",
    value: parseFloat(row[yField]) || 0,
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
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
        <CardTitle>{title || "Pie Chart"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {chartData.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {item.value.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">{percentage}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
