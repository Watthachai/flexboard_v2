"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DoughnutChartWidgetProps {
  widget: any;
  data: { data: any[]; columns: string[] };
}

export default function DoughnutChartWidget({
  widget,
  data,
}: DoughnutChartWidgetProps) {
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
        <CardTitle>{title || "Doughnut Chart"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-3xl font-bold">{total.toLocaleString()}</div>
            <div className="text-sm text-gray-400">Total</div>
          </div>
          <div className="space-y-2">
            {chartData.map((item, index) => {
              const percentage = ((item.value / total) * 100).toFixed(1);
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
